import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Transformer, TransformerKind } from "../types";
import {
  listTransformers,
  createTransformer,
  deleteTransformer,
  updateTransformer,
} from "../services/api";
import { REGIONS_SL } from "../constants/regions";

type EditState = {
  id: string;
  region: string;
  poleNo: string;
  type: TransformerKind;
  locationDetails: string;
};

export default function Transformers() {
  const [items, setItems] = useState<Transformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New add form
  const [form, setForm] = useState<EditState>({
    id: "",
    region: "",
    poleNo: "",
    type: "Distribution",
    locationDetails: "",
  });

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

  useEffect(() => { refresh(); }, []);

  function validate(t: EditState) {
    if (!t.id.trim()) return "Transformer No is required.";
    if (!t.region.trim()) return "Region is required.";
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
      // create object that matches your Transformer interface
      const payload: Transformer = {
        id: form.id,
        region: form.region,
        poleNo: form.poleNo,
        type: form.type,
        locationDetails: form.locationDetails,
      };
      await createTransformer(payload);
      setForm({ id: "", region: "", poleNo: "", type: "Distribution", locationDetails: "" });
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Create failed");
    }
  }

  async function onDelete(id: string) {
    if (!confirm(`Delete transformer ${id}?`)) return;
    try {
      await deleteTransformer(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Delete failed");
    }
  }

  // Inline edit state
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

  return (
    <div className="vstack" style={{ gap: 16 }}>
      {/* Add Transformer Card */}
      <div className="card">
        <div className="section-title">Add Transformer</div>

        <form onSubmit={onCreate} className="vstack" style={{ gap: 10 }}>
          <div className="vstack">
            <label className="subtle">Regions</label>
            <select
              className="input"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            >
              <option value="">Region</option>
              {REGIONS_SL.map((r) => (
                <option key={r} value={r}>{r}</option>
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
              placeholder="Location Details"
              rows={3}
              value={form.locationDetails}
              onChange={(e) =>
                setForm((f) => ({ ...f, locationDetails: e.target.value }))
              }
            />
          </div>

          <div className="hstack" style={{ gap: 12 }}>
            <button className="btn btn-primary" type="submit">Confirm</button>
            <button
              className="btn"
              type="button"
              onClick={() =>
                setForm({ id: "", region: "", poleNo: "", type: "Distribution", locationDetails: "" })
              }
            >
              Cancel
            </button>
          </div>
        </form>

        {error && <p style={{ color: "#dc2626", marginTop: 12 }}>{error}</p>}
      </div>

      {/* List / Edit Card */}
      <div className="card">
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
              <tr><td colSpan={6}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="subtle">No transformers yet.</td></tr>
            ) : (
              items.map((t) => {
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
                            setEdit((s) => (s ? { ...s, region: e.target.value } : s))
                          }
                        >
                          <option value="">Region</option>
                          {REGIONS_SL.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (t.region)}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          className="input"
                          value={edit?.poleNo ?? ""}
                          onChange={(e) =>
                            setEdit((s) => (s ? { ...s, poleNo: e.target.value } : s))
                          }
                        />
                      ) : (t.poleNo)}
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
                      ) : (t.type)}
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
                      ) : (t.locationDetails)}
                    </td>

                    <td>
                      <div className="hstack" style={{ justifyContent: "flex-end" }}>
                        <Link className="btn" to={`/transformers/${t.id}`}>Open</Link>

                        {isEditing ? (
                          <>
                            <button
                              className="btn btn-primary"
                              onClick={saveEdit}
                              disabled={saving === t.id}
                            >
                              {saving === t.id ? "Saving…" : "Save"}
                            </button>
                            <button className="btn" onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="btn" onClick={() => startEdit(t)}>Edit</button>
                            <button
                              className="btn"
                              style={{ color: "#dc2626" }}
                              onClick={() => onDelete(t.id)}
                            >
                              Delete
                            </button>
                          </>
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
    </div>
  );
}
