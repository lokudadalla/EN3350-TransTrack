// src/services/api.ts
import axios from "axios";
import type { Transformer, ThermalImage, EnvCondition, ImageType } from "../types";

// 1) Single axios instance for the whole app
//    Base URL comes from .env (VITE_API_URL=/api), falls back to /api.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// ---------------------- Transformers (FR1.1) ----------------------

export async function listTransformers(): Promise<Transformer[]> {
  const { data } = await api.get("/transformers");
  return data;
}

// If your backend generates ID, use Omit<Transformer, "id">.
// If the admin enters ID (T-001), just accept full Transformer.
export async function createTransformer(t: Transformer): Promise<Transformer> {
  const { data } = await api.post("/transformers", t);
  return data as Transformer;
}

export async function deleteTransformer(id: string): Promise<void> {
  await api.delete(`/transformers/${id}`);
}

export async function getTransformer(id: string): Promise<Transformer> {
  const { data } = await api.get(`/transformers/${id}`);
  return data as Transformer;
}

// ------------------------ Images (FR1.2/FR1.3) ------------------------

export async function listImages(transformerId: string): Promise<ThermalImage[]> {
  const { data } = await api.get(`/transformers/${transformerId}/images`);
  return data;
}

export async function uploadImage(params: {
  transformerId: string;
  file: File;
  type: ImageType;                // 'Baseline' | 'Maintenance'
  envCondition?: EnvCondition;    // required only when type === 'Baseline'
  uploader: string;
}): Promise<ThermalImage> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("type", params.type);
  if (params.type === "Baseline" && params.envCondition) {
    form.append("envCondition", params.envCondition);
  }
  form.append("uploader", params.uploader);

  const { data } = await api.post(
    `/transformers/${params.transformerId}/images`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}
