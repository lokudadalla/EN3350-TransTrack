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
    <div>
      <h3>Transformers</h3>

      <form onSubmit={onCreate} style={{ display:"grid", gap:8, gridTemplateColumns:"1fr 1fr 1fr auto", marginBottom:16 }}>
        <input placeholder="ID (e.g., T-001)" value={form.id}
               onChange={e => setForm(f => ({ ...f, id: e.target.value }))} />
        <input placeholder="Location" value={form.location}
               onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        <input placeholder="Capacity (e.g., 250 kVA)" value={form.capacity}
               onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
        <button type="submit">Add</button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading ? <p>Loading…</p> : (
        <table width="100%" cellPadding={8} style={{ borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f3f3f3" }}>
              <th align="left">ID</th>
              <th align="left">Location</th>
              <th align="left">Capacity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} style={{ borderTop:"1px solid #ddd" }}>
                <td>{t.id}</td>
                <td>{t.location}</td>
                <td>{t.capacity}</td>
                <td style={{ display:"flex", gap:8 }}>
                  <Link to={`/transformers/${t.id}`}>Open</Link>
                  <button onClick={() => onDelete(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4}>No transformers yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
