import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Transformer, ThermalImage, EnvCondition, ImageType } from "../types";
import { getTransformer, listImages, uploadImage } from "../services/api";
import ImageUpload from "../components/ImageUpload";

export default function TransformerDetail() {
  const { id = "" } = useParams();
  const [t, setT] = useState<Transformer | null>(null);
  const [images, setImages] = useState<ThermalImage[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [tr, imgs] = await Promise.all([getTransformer(id), listImages(id)]);
      setT(tr); setImages(imgs);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [id]);

  async function handleUpload(file: File, type: ImageType, env?: EnvCondition) {
    await uploadImage({ transformerId: id, file, type, envCondition: env, uploader: "admin" });
    await refresh();
  }

  return (
    <div>
      <h3>Transformer: {id}</h3>
      {t && <p style={{ color:"#555" }}>Location: {t.location} · Capacity: {t.capacity}</p>}

      <h4>Upload Image</h4>
      <ImageUpload onUpload={handleUpload} />

      <h4 style={{ marginTop:16 }}>Images</h4>
      {loading ? <p>Loading…</p> : (
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))" }}>
          {images.map(img => (
            <figure key={img.id} style={{ border:"1px solid #e5e5e5", padding:8 }}>
              <img src={img.imageUrl} alt={img.type} style={{ width:"100%", height:160, objectFit:"cover" }} />
              <figcaption style={{ fontSize:12, marginTop:6 }}>
                <b>{img.type}</b>{img.envCondition ? ` · ${img.envCondition}` : ""}<br/>
                {new Date(img.uploadedAt).toLocaleString()} · {img.uploader}
              </figcaption>
            </figure>
          ))}
          {images.length === 0 && <p>No images yet.</p>}
        </div>
      )}
    </div>
  );
}
