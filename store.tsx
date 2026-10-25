import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getGame } from "./games";

export type LibEntry = { id: string; addedAt: string; lastPlayed?: string; minutes: number; favorite: boolean };
type State = { cart: string[]; wishlist: string[]; library: LibEntry[] };

const initial: State = {
  cart: [],
  wishlist: ["elden-ring"],
  library: [
    { id: "the-witcher-3", addedAt: "2026-03-02", lastPlayed: "2026-10-15", minutes: 7420, favorite: true },
    { id: "hades", addedAt: "2026-06-11", lastPlayed: "2026-10-12", minutes: 2130, favorite: false },
    { id: "neon-arena", addedAt: "2026-08-20", lastPlayed: "2026-10-16", minutes: 960, favorite: false },
  ],
};

type Ctx = State & {
  toggleWishlist: (id: string) => void;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  checkout: () => void;
  addToLibrary: (id: string) => void;
  removeFromLibrary: (id: string) => void;
  toggleFavorite: (id: string) => void;
  markPlayed: (id: string) => void;
  owns: (id: string) => boolean;
};

const StoreCtx = createContext<Ctx | null>(null);
const KEY = "nexora-state-v1";
const today = () => new Date().toISOString().slice(0, 10);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(s));
  }, [s, ready]);

  const name = (id: string) => getGame(id)?.title ?? "Oyun";
  const owns = (id: string) => s.library.some((l) => l.id === id);
  const addLib = (st: State, ids: string[]): LibEntry[] => [
    ...ids.filter((id) => !st.library.some((l) => l.id === id)).map((id) => ({ id, addedAt: today(), minutes: 0, favorite: false })),
    ...st.library,
  ];

  const value: Ctx = {
    ...s,
    owns,
    toggleWishlist: (id) => {
      const has = s.wishlist.includes(id);
      setS((p) => ({ ...p, wishlist: has ? p.wishlist.filter((x) => x !== id) : [...p.wishlist, id] }));
      toast(has ? `${name(id)} istek listesinden çıkarıldı` : `${name(id)} istek listesine eklendi`);
    },
    addToCart: (id) => {
      if (owns(id)) return void toast("Bu oyun zaten kütüphanende");
      if (s.cart.includes(id)) return void toast("Bu oyun zaten sepette");
      setS((p) => ({ ...p, cart: [...p.cart, id] }));
      toast.success(`${name(id)} sepete eklendi`);
    },
    removeFromCart: (id) => setS((p) => ({ ...p, cart: p.cart.filter((x) => x !== id) })),
    checkout: () => {
      setS((p) => ({ ...p, library: addLib(p, p.cart), wishlist: p.wishlist.filter((w) => !p.cart.includes(w)), cart: [] }));
      toast.success("Satın alma tamamlandı! Oyunlar kütüphanene eklendi.");
    },
    addToLibrary: (id) => {
      setS((p) => ({ ...p, library: addLib(p, [id]) }));
      toast.success(`${name(id)} kütüphanene eklendi`);
    },
    removeFromLibrary: (id) => {
      setS((p) => ({ ...p, library: p.library.filter((l) => l.id !== id) }));
      toast(`${name(id)} kütüphaneden çıkarıldı`);
    },
    toggleFavorite: (id) => setS((p) => ({ ...p, library: p.library.map((l) => (l.id === id ? { ...l, favorite: !l.favorite } : l)) })),
    markPlayed: (id) => setS((p) => ({ ...p, library: p.library.map((l) => (l.id === id ? { ...l, lastPlayed: today(), minutes: l.minutes + 1 } : l)) })),
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider eksik");
  return c;
}
