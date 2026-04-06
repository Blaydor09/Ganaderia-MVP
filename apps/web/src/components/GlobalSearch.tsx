import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { getAnimalIdentifier } from "@/lib/animals";
import type { SearchResponse } from "@/lib/types";

export const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingContext =
        target?.getAttribute("contenteditable") === "true" ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select";

      if (!isTypingContext && event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data } = useQuery({
    queryKey: ["search", query],
    queryFn: async () =>
      (await api.get("/search", { params: { q: query } })).data as SearchResponse,
    enabled: query.length >= 2,
  });

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <Input
        ref={inputRef}
        placeholder="Buscar identificador, animal o lote"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-64 pl-9"
      />
      {query.length >= 2 ? (
        <div className="absolute left-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">Animales</div>
          <div className="space-y-2 py-2 text-sm">
            {(data?.animals ?? []).map((animal) => (
              <Link
                key={animal.id}
                to={`/animals/${animal.id}`}
                className="block hover:text-brand-600"
                onClick={() => setQuery("")}
              >
                {getAnimalIdentifier(animal)} - {animal.breed}
              </Link>
            ))}
            {(data?.animals ?? []).length === 0 ? (
              <span className="text-xs text-slate-400 dark:text-slate-500">Sin coincidencias</span>
            ) : null}
          </div>
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">Lotes</div>
          <div className="space-y-2 py-2 text-sm">
            {(data?.batches ?? []).map((batch) => (
              <Link
                key={batch.id}
                to="/batches"
                className="block text-slate-600 hover:text-brand-600 dark:text-slate-300"
                onClick={() => setQuery("")}
              >
                {batch.batchNumber}
              </Link>
            ))}
            {(data?.batches ?? []).length === 0 ? (
              <span className="text-xs text-slate-400 dark:text-slate-500">Sin coincidencias</span>
            ) : null}
          </div>
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">Productos</div>
          <div className="space-y-2 py-2 text-sm">
            {(data?.products ?? []).map((product) => (
              <Link
                key={product.id}
                to="/products"
                className="block text-slate-600 hover:text-brand-600 dark:text-slate-300"
                onClick={() => setQuery("")}
              >
                {product.name}
              </Link>
            ))}
            {(data?.products ?? []).length === 0 ? (
              <span className="text-xs text-slate-400 dark:text-slate-500">Sin coincidencias</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
