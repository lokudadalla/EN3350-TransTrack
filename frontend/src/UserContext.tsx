import { createContext, useContext, useEffect, useState } from "react";

export type User = {
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
};

type Ctx = { user: User | null; setUser: (u: User | null) => void };

const UserContext = createContext<Ctx | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // load from localStorage on boot
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) try { setUser(JSON.parse(raw)); } catch {}
  }, []);

  // persist on change
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
