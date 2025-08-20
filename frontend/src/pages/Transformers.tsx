import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Transformer } from "../types";
import { listTransformers, createTransformer, deleteTransformer } from "../services/api";

export default function Transformers() {
  const [items, setItems] = useState<Transformer[]>([]);
  const [form, setForm] = useState({ id: "", location: "", capacity: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listTransformers();
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load transformers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id || !form.location || !form.capacity) return;
    try {
      await createTransformer(form as Transformer);
      setForm({ id: "", location: "", capacity: "" });
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

  return (
    <div className="vstack" style={{gap:16}}>
      {/* Card: Add transformer */}
      <div className="card">
        <div className="section-title">Transformers</div>
        <form onSubmit={onCreate} className="hstack" style={{flexWrap:"wrap", rowGap:8}}>
          <input
            className="input"
            style={{width:220}}
            placeholder="ID (e.g., T-001)"
            value={form.id}
            onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
          />
          <input
            className="input"
            style={{width:320}}
            placeholder="Location"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          />
          <input
            className="input"
            style={{width:260}}
            placeholder="Capacity (e.g., 250 kVA)"
            value={form.capacity}
            onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
          />
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
        {error && <p style={{color:"#dc2626", marginTop:8}}>{error}</p>}
      </div>

      {/* Card: Table */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Location</th>
              <th>Capacity</th>
              <th style={{textAlign:"right"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="subtle">No transformers yet.</td></tr>
            ) : (
              items.map(t => (
                <tr key={t.id}>
                  <td style={{fontWeight:600}}>{t.id}</td>
                  <td>{t.location}</td>
                  <td>{t.capacity}</td>
                  <td>
                    <div className="hstack" style={{justifyContent:"flex-end"}}>
                      <Link className="btn" to={`/transformers/${t.id}`}>Open</Link>
                      <button className="btn" style={{color:"#dc2626"}} onClick={() => onDelete(t.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
