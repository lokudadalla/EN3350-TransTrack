import http from "./http";
import type { Transformer, TransformerKind } from "../types";

/** Backend shape */
type ApiTransformer = {
  id: number;                 // numeric DB id
  transformerNo: string;      // business id
  poleNo: string;
  region: string;
  type: TransformerKind;
  locationDetails: string;
  favorite: boolean;
  createdAt?: string;
};

/** Request body for create/update */
type ApiTransformerReq = Omit<ApiTransformer, "id" | "createdAt">;

/** Map backend -> frontend */
function fromApi(a: ApiTransformer): Transformer {
  return {
    backendId: a.id,
    id: a.transformerNo,
    poleNo: a.poleNo,
    region: a.region,
    type: a.type,
    locationDetails: a.locationDetails,
    favorite: !!a.favorite,
  };
}

/** Map frontend -> backend request body */
function toApi(t: Transformer): ApiTransformerReq {
  return {
    transformerNo: t.id,
    poleNo: t.poleNo,
    region: t.region,
    type: t.type,
    locationDetails: t.locationDetails,
    favorite: !!t.favorite,
  };
}

/** GET /transformers */
export async function listTransformers(): Promise<Transformer[]> {
  const data = await http<ApiTransformer[]>("/transformers");
  return data.map(fromApi);
}

/** GET /transformers/{id} (numeric) */
export async function getTransformerByBackendId(id: number): Promise<Transformer> {
  const data = await http<ApiTransformer>(`/transformers/${id}`);
  return fromApi(data);
}

/** GET /transformers/by-no?no=TX-1001 */
export async function getTransformerByNo(no: string): Promise<Transformer> {
  const data = await http<ApiTransformer>(`/transformers/by-no?no=${encodeURIComponent(no)}`);
  return fromApi(data);
}

/** POST /transformers */
export async function createTransformer(t: Transformer): Promise<Transformer> {
  const body = toApi(t);
  const data = await http<ApiTransformer>("/transformers", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return fromApi(data);
}

/** PUT /transformers/{id} (numeric) */
export async function updateTransformer(t: Transformer): Promise<Transformer> {
  if (t.backendId == null) throw new Error("Missing backendId for update");
  const body = toApi(t);
  const data = await http<ApiTransformer>(`/transformers/${t.backendId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return fromApi(data);
}

/** DELETE /transformers/{id} (numeric) */
export async function deleteTransformer(backendId: number): Promise<void> {
  await http<void>(`/transformers/${backendId}`, { method: "DELETE" });
}
