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

// types/models.ts (or wherever ZoomableImageProps lives)
export type ZoomableImageProps = {
  src?: string | null;
  alt?: string;
  emptyText: string;
  anomalies?: DisplayAnomaly[];
  interactive?: boolean;
  /** NEW */
  editable?: boolean;
  /** NEW: called when a resize finishes (pointer up) or during live-resize if you prefer */
  onChangeAnomalies?: (next: DisplayAnomaly[]) => void;

  /** NEW: when true, user draws a new bbox by drag (disables panning while active) */
  createMode?: boolean;
  /** NEW: live preview of the creating box (NATURAL coords); null to clear */
  onCreatePreview?: (box: AnomalyMeta | null) => void;
  /** NEW: fired when the user releases the mouse to finish drawing (NATURAL coords) */
  onCreateComplete?: (box: AnomalyMeta) => void;
};


