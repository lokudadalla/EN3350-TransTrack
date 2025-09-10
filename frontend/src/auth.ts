// export type User = { id: number; username: string };

// const KEY = "tt_user";

// export function saveUser(u: User) { localStorage.setItem(KEY, JSON.stringify(u)); }
// export function getUser(): User | null {
//   const s = localStorage.getItem(KEY);
//   return s ? (JSON.parse(s) as User) : null;
// }
// export function logout() { localStorage.removeItem(KEY); }
// export function isAuthed() { return !!getUser(); }



export type User = { id: number; username: string };
const KEY = "tt_user";

export function saveUser(u: User) {
  localStorage.setItem(KEY, JSON.stringify(u));
}
export function getUser(): User | null {
  try {
    const s = localStorage.getItem(KEY);
    const u = s ? (JSON.parse(s) as Partial<User>) : null;
    return (u && typeof u.id === "number" && Number.isFinite(u.id)) ? (u as User) : null;
  } catch { return null; }
}
export function isAuthed() {
  const u = getUser();
  return !!(u && typeof u.id === "number" && Number.isFinite(u.id));
}
export function logout() { localStorage.removeItem(KEY); }
