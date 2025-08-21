import { useState } from "react";
import type { EnvCondition, ImageType } from "../types";

export default function ImageUpload({
  onUpload,
}: {
  onUpload: (file: File, type: ImageType, env?: EnvCondition) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<ImageType>("Maintenance");
  const [env, setEnv] = useState<EnvCondition>("Sunny");
  const isBaseline = type === "Baseline";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    await onUpload(file, type, isBaseline ? env : undefined);
    setFile(null);
  }

  return (
    <form onSubmit={submit} style={{ display:"flex", gap:8, alignItems:"center" }}>
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <select value={type} onChange={e => setType(e.target.value as ImageType)}>
        <option value="Maintenance">Maintenance</option>
        <option value="Baseline">Baseline</option>
      </select>
      {isBaseline && (
        <select value={env} onChange={e => setEnv(e.target.value as EnvCondition)}>
          <option value="Sunny">Sunny</option>
          <option value="Cloudy">Cloudy</option>
          <option value="Rainy">Rainy</option>
        </select>
      )}
      <button type="submit">Upload</button>
    </form>
  );
}
