import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type {
  Transformer,
  ThermalImage,
  EnvCondition,
  ImageType,
} from "../types";
import { getTransformer, listImages, uploadImage } from "../services/api";

export default function TransformerDetail() {
  const { id = "" } = useParams();
  const [t, setT] = useState<Transformer | null>(null);
  const [images, setImages] = useState<ThermalImage[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [tr, imgs] = await Promise.all([
        getTransformer(id),
        listImages(id),
      ]);
      setT(tr);
      setImages(imgs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    const type = (form.get("type") as ImageType) || "Maintenance";
    const env = (form.get("env") as EnvCondition) || undefined;

    if (!file) return;
    await uploadImage({
      transformerId: id,
      file,
      type,
      envCondition: type === "Baseline" ? env : undefined,
      uploader: "admin",
    });

    e.currentTarget.reset();
    await refresh();
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link to="..">← Back</Link>
      </div>

      <h3>Transformer: {id}</h3>
        {t && (
        <p>
            Region: {t.region} · Type: {t.type} · Pole No: {t.poleNo}
        </p>
        )}

      <h4 style={{ marginTop: 16 }}>Upload Image</h4>
      <form
        onSubmit={handleUpload}
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <input type="file" name="file" accept="image/*" />
        <select name="type" defaultValue="Maintenance">
          <option value="Maintenance">Maintenance</option>
          <option value="Baseline">Baseline</option>
        </select>
        <select name="env" defaultValue="Sunny">
          <option value="Sunny">Sunny</option>
          <option value="Cloudy">Cloudy</option>
          <option value="Rainy">Rainy</option>
        </select>
        <button type="submit">Upload</button>
      </form>

      <h4 style={{ marginTop: 16 }}>Images</h4>
      {loading ? (
        <p>Loading…</p>
      ) : images.length === 0 ? (
        <p>No images yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          {images.map((img) => (
            <figure
              key={img.id}
              style={{ border: "1px solid #e5e5e5", padding: 8 }}
            >
              <img
                src={img.imageUrl}
                alt={img.type}
                style={{ width: "100%", height: 160, objectFit: "cover" }}
              />
              <figcaption style={{ fontSize: 12, marginTop: 6 }}>
                <b>{img.type}</b>
                {img.envCondition ? ` · ${img.envCondition}` : ""}
                <br />
                {new Date(img.uploadedAt).toLocaleString()} · {img.uploader}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
