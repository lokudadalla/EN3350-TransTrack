export type EnvCondition = "Sunny" | "Cloudy" | "Rainy";
export type ImageType = "Baseline" | "Maintenance";

export interface Transformer {
  id: string;
  location: string;
  capacity: string;
  name?: string;
}

export interface ThermalImage {
  id: string;
  transformerId: string;
  imageUrl: string;
  type: ImageType;
  envCondition?: EnvCondition;
  uploadedAt: string;
  uploader: string;
}
