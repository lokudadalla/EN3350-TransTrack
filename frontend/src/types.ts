export type EnvCondition = "Sunny" | "Cloudy" | "Rainy";
export type ImageType = "Baseline" | "Maintenance";

export interface Transformer {
  id: string;          // e.g., T-001
  location: string;    // e.g., Colombo
  capacity: string;    // e.g., 250 kVA
  name?: string;
}

export interface ThermalImage {
  id: string;
  transformerId: string;
  imageUrl: string;
  type: ImageType;
  envCondition?: EnvCondition; // required when type === "Baseline"
  uploadedAt: string;          // ISO timestamp
  uploader: string;
}
