import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Transformer, TransformerKind } from "../types";
import {
  listTransformers,
  createTransformer,
  deleteTransformer,
  updateTransformer,
} from "../services/api";
import { REGIONS_SL } from "../constants/regions";
import Modal from "../components/Modal";

type EditState = {
  id: string;              // Transformer No
  region: string;
  poleNo: string;
  type: TransformerKind;
  locationDetails: string;
};

type SearchField = "id" | "poleNo";

export default function Transformers() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Transformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ------- Add (modal) -------
  const initialForm: EditState = {
    id: "",
    region: "",
    poleNo: "",
    type: "Distribution",
    locationDetails: "",
  };
  const [form, setForm] = useState<EditState>(initialForm);
  const [openAdd, setOpenAdd] = useState(false);

  // ------- Delete confirm (modal) -------
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // ------- Filters / Search -------
  const [searchField, setSearchField] = useState<SearchField>("id");
  const [searchText, setSearchText] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("__all");
  const [typeFilter, setTypeFilter] = useState<"__all" | TransformerKind>("__all");

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listTransformers();
      data.sort((a, b) => a.id.localeCompare(b.id));
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load transformers");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  // --------- Client-side filtering ----------
  const filtered = useMemo(() => {
    let list = items;

    // text search
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const value =
          searchField === "id" ? t.id ?? "" : (t.poleNo ?? "");
        return value.toLowerCase().includes(q);
      });
    }

    // region
    if (regionFilter !== "__all") {
      list = list.filter((t) => (t.region ?? "") === regionFilter);
    }

    // type
    if (typeFilter !== "__all") {
      list = list.filter((t) => (t.type as TransformerKind) === typeFilter);
    }

    return list;
  }, [items, searchText, searchField, regionFilter, typeFilter]);

  function resetFilters() {
    setSearchField("id");
    setSearchText("");
    setRegionFilter("__all");
    setTypeFilter("__all");
  }

  // --------- Validation ----------
  function validate(t: EditState) {
    if (!t.region.trim()) return "Region is required.";
    if (!t.id.trim()) return "Transformer No is required.";
    if (!t.poleNo.trim()) return "Pole No is required.";
    if (!t.locationDetails.trim()) return "Location Details are required.";
    return null;
  }

  // --------- CRUD ----------
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(form);
    if (err) return alert(err);
    if (ids.has(form.id)) return alert("That Transformer No already exists.");
    try {
      const payload: Transformer = {
        id: form.id,
        region: form.region,
        poleNo: form.poleNo,
        type: form.type,
        locationDetails: form.locationDetails,
      };
      await createTransformer(payload);
      setForm(initialForm);
      setOpenAdd(false);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Create failed");
    }
  }

  async function doDelete() {
    if (!confirmId) return;
    try {
      await deleteTransformer(confirmId);
      setConfirmId(null);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Delete failed");
    }
  }

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  function startEdit(row: Transformer) {
    setEditingId(row.id);
    setEdit({
      id: row.id,
      region: row.region ?? "",
      poleNo: row.poleNo ?? "",
      type: (row.type as TransformerKind) ?? "Distribution",
      locationDetails: row.locationDetails ?? "",
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setEdit(null);
  }
  async function saveEdit() {
    if (!edit) return;
    const err = validate(edit);
    if (err) return alert(err);
    setSaving(edit.id);
    try {
      await updateTransformer(edit.id, {
        region: edit.region,
        poleNo: edit.poleNo,
        type: edit.type,
        locationDetails: edit.locationDetails,
      });
      await refresh();
      cancelEdit();
    } catch (e: any) {
      alert(e?.message ?? "Update failed");
    } finally {
      setSaving(null);
    }
  }

  function handleView(id: string) {
    navigate(`/transformers/${id}`);
  }

  // ------- tiny helpers for the filter bar look -------
  const chip: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e8eef8",
    borderRadius: 14,
    padding: "8px 10px",
  };
  const bigInput: React.CSSProperties = {
    ...chip,
    height: 40,
    outline: "none",
    width: 260,
  };
  const selectStyle: React.CSSProperties = { ...chip, height: 40 };

  return (
    <div className="vstack" style={{ gap: 16 }}>
      {/* H1 + Add */}
      <div className="hstack" style={{ justifyContent: "space-between" }}>
        <div className="section-title" style={{ fontSize: 22 }}>
          Transformers
        </div>
        <button className="btn-launch" onClick={() => setOpenAdd(true)}>
          Add Transformer
        </button>
      </div>

      {/* --- Search / Filters row --- */}
      <div
        className="hstack"
        style={{
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 2,
        }}
      >
        {/* Search field selector */}
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as SearchField)}
          style={{ ...selectStyle, width: 170 }}
        >
          <option value="id">By Transformer No</option>
          <option value="poleNo">By Pole No</option>
        </select>

        {/* Search input */}
        <input
          style={bigInput}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search transformer"
        />

        {/* Search button (no-op trigger, we filter live; this is for UX parity) */}
        <button
          aria-label="Search"
          onClick={() => {/* live filtering already applied */}}
          style={{
            height: 40,
            width: 40,
            borderRadius: 12,
            background: "#3f51b5",
            color: "#fff",
            border: 0,
            fontWeight: 700,
            cursor: "pointer",
          }}
          title="Search"
        >
          🔍
        </button>

        {/* spacer */}
        <div style={{ width: 12 }} />

        {/* Region filter */}
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          style={{ ...selectStyle, width: 170 }}
        >
          <option value="__all">All Regions</option>
          {REGIONS_SL.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as "__all" | TransformerKind)
          }
          style={{ ...selectStyle, width: 140 }}
        >
          <option value="__all">All Types</option>
          <option value="Distribution">Distribution</option>
          <option value="Bulk">Bulk</option>
        </select>

        <button
          onClick={resetFilters}
          className="btn"
          style={{ marginLeft: 6, fontWeight: 700, color: "#3949ab" }}
        >
          Reset Filters
        </button>
      </div>

      {/* Table Card */}
      <div className="card">
        {error && (
          <p style={{ color: "#dc2626", marginBottom: 8 }}>{error}</p>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Transformer No</th>
              <th>Region</th>
              <th>Pole No</th>
              <th>Type</th>
              <th>Location Details</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="subtle">
                  No transformers yet.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isEditing = editingId === t.id;
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.id}</td>

                    <td>
                      {isEditing ? (
                        <select
                          className="input"
                          value={edit?.region ?? ""}
                          onChange={(e) =>
                            setEdit((s) =>
                              s ? { ...s, region: e.target.value } : s
                            )
                          }
                        >
                          <option value="">Region</option>
                          {REGIONS_SL.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        t.region
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          className="input"
                          value={edit?.poleNo ?? ""}
                          onChange={(e) =>
                            setEdit((s) =>
                              s ? { ...s, poleNo: e.target.value } : s
                            )
                          }
                        />
                      ) : (
                        t.poleNo
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <select
                          className="input"
                          value={edit?.type ?? "Distribution"}
                          onChange={(e) =>
                            setEdit((s) =>
                              s
                                ? {
                                    ...s,
                                    type: e.target
                                      .value as TransformerKind,
                                  }
                                : s
                            )
                          }
                        >
                          <option value="Distribution">Distribution</option>
                          <option value="Bulk">Bulk</option>
                        </select>
                      ) : (
                        t.type
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          className="input"
                          value={edit?.locationDetails ?? ""}
                          onChange={(e) =>
                            setEdit((s) =>
                              s
                                ? {
                                    ...s,
                                    locationDetails: e.target.value,
                                  }
                                : s
                            )
                          }
                        />
                      ) : (
                        t.locationDetails
                      )}
                    </td>

                    <td>
                      <div
                        className="hstack"
                        style={{ justifyContent: "flex-end", gap: 8 }}
                      >
                        {!isEditing && (
                          <button
                            onClick={() => handleView(t.id)}
                            style={{
                              background: "#3f51b5",
                              color: "#fff",
                              border: 0,
                              padding: "6px 14px",
                              borderRadius: 10,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            View
                          </button>
                        )}

                        {isEditing ? (
                          <>
                            <button
                              className="btn btn-primary"
                              onClick={saveEdit}
                              disabled={saving === t.id}
                            >
                              {saving === t.id ? "Saving…" : "Save"}
                            </button>
                            <button className="btn" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button className="btn" onClick={() => startEdit(t)}>
                            Edit
                          </button>
                        )}

                        {!isEditing && (
                          <button
                            aria-label={`Delete ${t.id}`}
                            onClick={() => setConfirmId(t.id)}
                            style={{
                              background: "#dc2626",
                              color: "#fff",
                              border: 0,
                              padding: "6px 10px",
                              borderRadius: 10,
                              cursor: "pointer",
                              fontSize: 16,
                            }}
                            title="Delete"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Transformer Modal */}
      <Modal
        open={openAdd}
        title="Add Transformer"
        onClose={() => {
          setOpenAdd(false);
          setForm(initialForm);
        }}
        footer={
          <>
            <button
              className="btn-cta"
              form="add-transformer-form"
              type="submit"
            >
              Confirm
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setOpenAdd(false);
                setForm(initialForm);
              }}
            >
              Cancel
            </button>
          </>
        }
      >
        <form
          id="add-transformer-form"
          onSubmit={onCreate}
          className="vstack"
          style={{ gap: 14 }}
        >
          <div className="vstack">
            <label className="subtle">Regions</label>
            <select
              className="input"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            >
              <option value="">Region</option>
              {REGIONS_SL.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="vstack">
            <label className="subtle">Transformer No</label>
            <input
              className="input"
              placeholder="Transformer No"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
            />
          </div>

          <div className="vstack">
            <label className="subtle">Pole No</label>
            <input
              className="input"
              placeholder="Pole No"
              value={form.poleNo}
              onChange={(e) =>
                setForm((f) => ({ ...f, poleNo: e.target.value }))
              }
            />
          </div>

          <div className="vstack">
            <label className="subtle">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as TransformerKind,
                }))
              }
            >
              <option value="Distribution">Distribution</option>
              <option value="Bulk">Bulk</option>
            </select>
          </div>

          <div className="vstack">
            <label className="subtle">Location Details</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Location Details"
              value={form.locationDetails}
              onChange={(e) =>
                setForm((f) => ({ ...f, locationDetails: e.target.value }))
              }
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={confirmId !== null}
        title="Delete transformer"
        onClose={() => setConfirmId(null)}
        footer={
          <>
            <button
              onClick={doDelete}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: 0,
                padding: "10px 16px",
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Yes, delete
            </button>
            <button className="btn-ghost" onClick={() => setConfirmId(null)}>
              No
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to delete transformer <b>{confirmId}</b>?
        </p>
      </Modal>
    </div>
  );
}
