// http.ts
import { getUser } from "../auth"; // or correct relative path

const BASE = import.meta.env.VITE_API_BASE || "/api";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const u = getUser();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": u?.id ? String(u.id) : "",   // <— key line
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
export default http;
