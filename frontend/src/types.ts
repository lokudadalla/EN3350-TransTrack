export type TransformerKind = "Bulk" | "Distribution";

export interface Transformer {
  /** Business id shown in UI = backend "transformerNo" */
  id: string;

  /** Numeric DB id from backend (used for PUT/DELETE) */
  backendId?: number;

  region: string;
  poleNo: string;
  type: TransformerKind;
  locationDetails: string;

  /** New: favorite flag */
  favorite: boolean;

  /** Optional legacy fields kept for compatibility */
  capacity?: string;
  location?: string;
}

export type EnvCondition = "Sunny" | "Cloudy" | "Rainy";
export type ImageType = "Baseline" | "Maintenance";

export interface ThermalImage {
  id: string;
  transformerId: string;
  imageUrl: string;
  type: ImageType;
  envCondition?: EnvCondition;
  uploadedAt: string;
  uploader: string;
}
