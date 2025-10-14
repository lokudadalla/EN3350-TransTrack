/* ---------- Types ---------- */
export type Status = "Completed" | "In Progress" | "Pending";
export type ImageType = "BASELINE" | "MAINTENANCE";
export type Condition = "SUNNY" | "CLOUDY" | "RAINY";

export type InspectionDTO = {
  inspectionNo: number;
  transformerNo: string;
  branch: string;
  status: string;
  inspectionDate: string;
  inspectionTime: string;
  createdAt: string;
  inferenceThreshold?: number;
};

export type ImageMeta = {
  id: number;
  type: ImageType;
  fileName: string;
  contentType: string;
  size?: number;
  uploadedAt: string;
  url?: string;
  uploader?: string;
  condition?: Condition;
  anomalies?: AnomalyMeta[];
};

export type TransformerHeader = {
  transformerNo: string;
  poleNo?: string;
  branch?: string;
  inspectedBy?: string;
  status: Status;
  lastUpdated: string;
};

export type ZoomHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
};

export type AnomalyMeta = {
  id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  score?: number;
  size?: number;
};

export type RenderAnomalyBox = {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  displayIndex: number;
};


export type DisplayAnomaly = AnomalyMeta & { displayIndex: number };

export type ZoomableImageProps = {
  src?: string | null;
  alt: string;
  emptyText: string;
  anomalies?: DisplayAnomaly[];
  interactive?: boolean;
};

