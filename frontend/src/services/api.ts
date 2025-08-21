import axios from "axios";
import type { Transformer, ThermalImage, EnvCondition, ImageType } from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Transformers
export async function listTransformers(): Promise<Transformer[]> {
  const { data } = await api.get("/transformers");
  return data;
}
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
export async function updateTransformer(
  id: string,
  patch: Partial<Transformer>
): Promise<Transformer> {
  // If your backend uses PATCH instead, change put -> patch
  const { data } = await api.put(`/transformers/${id}`, patch);
  return data as Transformer;
}

// Images
export async function listImages(transformerId: string): Promise<ThermalImage[]> {
  const { data } = await api.get(`/transformers/${transformerId}/images`);
  return data;
}
export async function uploadImage(params: {
  transformerId: string;
  file: File;
  type: ImageType;
  envCondition?: EnvCondition;
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
