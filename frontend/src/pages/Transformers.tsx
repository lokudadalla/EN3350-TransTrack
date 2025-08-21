// src/pages/Transformers.tsx
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
  id: string;
  region: string;
  poleNo: string;
  type: TransformerKind;
  locationDetails: string;
  favorite?: boolean;
};

type SearchField = "id" | "poleNo";

const PAGE_SIZE = 10;

export default function Transformers() {
  const navigate = useNavigate();

  // Data
  const [items, setItems] = useState<Transformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add modal
  const initialForm: EditState = {
    id: "",
    region: "",
    poleNo: "",
    type: "Distribution",
    locationDetails: "",
    favorite: false,
  };
  const [form, setForm] = useState<EditState>(initialForm);
  const [openAdd, setOpenAdd] = useState(false);

  // Delete confirmation
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  // Filters
  const [searchField, setSearchField] = useState<SearchField>("id");
  const [searchText, setSearchText] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>("All Regions");
  const [typeFilter, setTypeFilter] = useState<"All Types" | TransformerKind>("All Types");

  // Pagination
  const [page, setPage] = useState(1);

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

  // ---------- Validation / CRUD ----------
  function validate(t: EditState) {
    if (!t.region.trim()) return "Region is required.";
    if (!t.id.trim()) return "Transformer No is required.";
    if (!t.poleNo.trim()) return "Pole No is required.";
    if (!t.locationDetails.trim()) return "Location Details are required.";
    return null;
  }

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
        favorite: !!form.favorite,
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

  function startEdit(row: Transformer) {
    setEditingId(row.id);
    setEdit({
      id: row.id,
      region: row.region ?? "",
      poleNo: row.poleNo ?? "",
      type: (row.type as TransformerKind) ?? "Distribution",
      locationDetails: row.locationDetails ?? "",
      favorite: !!row.favorite,
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
        favorite: !!edit.favorite,
      });
      await refresh();
      cancelEdit();
    } catch (e: any) {
      alert(e?.message ?? "Update failed");
    } finally {
      setSaving(null);
    }
  }

  async function toggleFavorite(t: Transformer) {
    // optimistic UI
    setItems((old) =>
      old.map((x) => (x.id === t.id ? { ...x, favorite: !x.favorite } : x))
    );
    try {
      await updateTransformer(t.id, { favorite: !t.favorite });
    } catch (e) {
      // revert on error
      setItems((old) =>
        old.map((x) => (x.id === t.id ? { ...x, favorite: t.favorite } : x))
      );
      alert("Failed to update favorite");
    }
  }

  function handleView(id: string) {
    navigate(`/transformers/${id}`);
  }

  // ---------- Filtering ----------
  const filtered = useMemo(() => {
    let data = items;

    // text filter
    const q = searchText.trim().toLowerCase();
    if (q) {
      data = data.filter((t) =>
        (searchField === "id" ? t.id : t.poleNo).toLowerCase().includes(q)
      );
    }

    // favorites
    if (favOnly) data = data.filter((t) => !!t.favorite);

    // region
    if (regionFilter !== "All Regions") {
      data = data.filter((t) => t.region === regionFilter);
    }

    // type
    if (typeFilter !== "All Types") {
      data = data.filter((t) => t.type === typeFilter);
    }

    return data;
  }, [items, searchText, searchField, favOnly, regionFilter, typeFilter]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchText, searchField, favOnly, regionFilter, typeFilter]);

  // ---------- Pagination ----------
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageData = filtered.slice(start, start + PAGE_SIZE);

  function resetFilters() {
    setSearchField("id");
    setSearchText("");
    setFavOnly(false);
    setRegionFilter("All Regions");
    setTypeFilter("All Types");
    setPage(1);
  }

  // ---------- UI ----------
  return (
    <div className="vstack" style={{ gap: 16 }}>
      {/* title row & add button */}
      <div className="hstack" style={{ justifyContent: "space-between" }}>
        <div className="section-title" style={{ fontSize: 22 }}>
          Transformers
        </div>
        <button className="btn-launch" onClick={() => setOpenAdd(true)}>
          Add Transformer
        </button>
      </div>

      {/* FILTER BAR */}
      <div
        className="card"
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          padding: 12,
        }}
      >
        {/* By ... */}
        <div className="hstack" style={{ gap: 8 }}>
          <select
            className="input"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchField)}
          >
            <option value="id">By Transformer No</option>
            <option value="poleNo">By Pole No</option>
          </select>

          <input
            className="input"
            placeholder={
              searchField === "id" ? "Search transformer..." : "Search pole..."
            }
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ minWidth: 240 }}
          />

          {/* Search icon: optional, filters are live anyway */}
          <button
            className="btn"
            onClick={() => setPage(1)}
            title="Apply search"
          >
            🔍
          </button>
        </div>

        {/* Favorites toggle */}
        <button
          className="btn"
          onClick={() => setFavOnly((v) => !v)}
          title={favOnly ? "Show all" : "Show favorites"}
          style={{
            borderColor: favOnly ? "#3f51b5" : undefined,
            color: favOnly ? "#3f51b5" : undefined,
            fontWeight: 700,
          }}
        >
          {favOnly ? "★" : "☆"}
        </button>

        {/* Region */}
        <select
          className="input"
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
        >
          <option>All Regions</option>
          {REGIONS_SL.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* Type */}
        <select
          className="input"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
        >
          <option>All Types</option>
          <option value="Distribution">Distribution</option>
          <option value="Bulk">Bulk</option>
        </select>

        <button className="btn" onClick={resetFilters}>
          Reset Filters
        </button>
      </div>

      {/* TABLE */}
      <div className="card">
        {error && <p style={{ color: "#dc2626", marginBottom: 8 }}>{error}</p>}
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 48 }}></th>
              <th>Transformer No</th>
              <th>Pole No</th>
              <th>Region</th>
              <th>Type</th>
              <th>Location Details</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Loading…</td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={7} className="subtle">
                  No transformers found.
                </td>
              </tr>
            ) : (
              pageData.map((t) => {
                const isEditing = editingId === t.id;
                return (
                  <tr key={t.id}>
                    {/* Favorite star column */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        aria-label="toggle favorite"
                        onClick={() => toggleFavorite(t)}
                        title={t.favorite ? "Unfavorite" : "Favorite"}
                        style={{
                          background: "transparent",
                          border: 0,
                          fontSize: 18,
                          cursor: "pointer",
                          color: t.favorite ? "#3f51b5" : "#94a3b8",
                        }}
                      >
                        {t.favorite ? "★" : "☆"}
                      </button>
                    </td>

                    <td style={{ fontWeight: 600 }}>{t.id}</td>

                    <td>
                      {isEditing ? (
                        <input
                          className="input"
                          value={edit?.poleNo ?? ""}
                          onChange={(e) =>
                            setEdit((s) => (s ? { ...s, poleNo: e.target.value } : s))
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
                          value={edit?.region ?? ""}
                          onChange={(e) =>
                            setEdit((s) => (s ? { ...s, region: e.target.value } : s))
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
                        <select
                          className="input"
                          value={edit?.type ?? "Distribution"}
                          onChange={(e) =>
                            setEdit((s) =>
                              s ? { ...s, type: e.target.value as TransformerKind } : s
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
                              s ? { ...s, locationDetails: e.target.value } : s
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

        {/* Pagination */}
        <div className="hstack" style={{ gap: 6, justifyContent: "center", marginTop: 12 }}>
          <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ‹
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            const active = n === page;
            return (
              <button
                key={n}
                className="btn"
                onClick={() => setPage(n)}
                style={{
                  fontWeight: active ? 700 : 500,
                  background: active ? "#3f51b5" : undefined,
                  color: active ? "#fff" : undefined,
                }}
              >
                {n}
              </button>
            );
          })}
          <button
            className="btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            ›
          </button>
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        open={openAdd}
        title="Add Transformer"
        onClose={() => {
          setOpenAdd(false);
          setForm(initialForm);
        }}
        footer={
          <>
            <button className="btn-cta" form="add-transformer-form" type="submit">
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
        <form id="add-transformer-form" onSubmit={onCreate} className="vstack" style={{ gap: 14 }}>
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
              onChange={(e) => setForm((f) => ({ ...f, poleNo: e.target.value }))}
            />
          </div>

          <div className="vstack">
            <label className="subtle">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TransformerKind }))}
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
              onChange={(e) => setForm((f) => ({ ...f, locationDetails: e.target.value }))}
            />
          </div>

          <div className="hstack" style={{ gap: 8, alignItems: "center" }}>
            <input
              id="fav"
              type="checkbox"
              checked={!!form.favorite}
              onChange={(e) => setForm((f) => ({ ...f, favorite: e.target.checked }))}
            />
            <label htmlFor="fav">Mark as favorite</label>
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
