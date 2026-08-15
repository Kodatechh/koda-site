import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";

import { searchIndex } from "@/lib/search-index";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchIndex.slice(0, 8);
    return searchIndex
      .filter((item) => `${item.title} ${item.description} ${item.keywords} ${item.category}`.toLowerCase().includes(normalized))
      .slice(0, 10);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Buscar no site da Koda">
      <button className="absolute inset-0 h-full w-full cursor-default" aria-label="Fechar busca" onClick={onClose} />
      <div className="relative mx-auto mt-3 w-[min(760px,calc(100%-20px))] overflow-hidden rounded-[28px] bg-white shadow-2xl sm:mt-12">
        <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4">
          <Search className="h-5 w-5 text-[#6e6e73]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produtos, suporte, KODA OS…"
            className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-[#a1a1a6]"
          />
          <button onClick={onClose} className="rounded-full bg-[#f5f5f7] p-2" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-3">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86868b]">
            {query ? `${results.length} resultado${results.length === 1 ? "" : "s"}` : "Atalhos"}
          </p>
          {results.length ? (
            <div className="space-y-1">
              {results.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between rounded-2xl px-3 py-3.5 transition-colors hover:bg-[#f5f5f7]"
                  onClick={onClose}
                >
                  <div>
                    <p className="text-[11px] text-[#86868b]">{item.category}</p>
                    <p className="mt-0.5 font-semibold tracking-[-0.02em]">{item.title}</p>
                    <p className="mt-1 text-sm text-[#6e6e73]">{item.description}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#86868b] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          ) : (
            <div className="px-3 py-16 text-center">
              <p className="font-semibold">Nada encontrado.</p>
              <p className="mt-2 text-sm text-[#6e6e73]">Tente buscar por “Wi‑Fi”, “garantia” ou “KODA OS”.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
