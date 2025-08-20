export type TransformerKind = "Bulk" | "Distribution";

export interface Transformer {
  /** Transformer No (primary ID) */
  id: string;

  /** Administrative region/town */
  region: string;

  /** Pole No (string because some providers use mixed formats) */
  poleNo: string;

  /** Transformer type */
  type: TransformerKind;

  /** Free-text location details */
  locationDetails: string;

  /** Optional legacy fields (kept so older code doesn’t break) */
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
