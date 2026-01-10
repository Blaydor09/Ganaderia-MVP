import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { Link } from "react-router-dom";

export const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const { data } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => (await api.get(`/search?q=${query}`)).data,
    enabled: query.length >= 2,
  });

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder="Buscar arete, animal o lote"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-64 pl-9"
      />
      {query.length >= 2 ? (
        <div className="absolute left-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
          <div className="text-xs font-semibold text-slate-400">Animales</div>
          <div className="space-y-2 py-2 text-sm">
            {(data?.animals ?? []).map((animal: any) => (
              <Link key={animal.id} to={`/animals/${animal.id}`} className="block hover:text-brand-600">
                {(animal.tag || "Sin arete")} - {animal.breed}
              </Link>
            ))}
            {(data?.animals ?? []).length === 0 ? (
              <span className="text-xs text-slate-400">Sin coincidencias</span>
            ) : null}
          </div>
          <div className="text-xs font-semibold text-slate-400">Lotes</div>
          <div className="space-y-2 py-2 text-sm">
            {(data?.batches ?? []).map((batch: any) => (
              <span key={batch.id} className="block text-slate-600">
                {batch.batchNumber}
              </span>
            ))}
            {(data?.batches ?? []).length === 0 ? (
              <span className="text-xs text-slate-400">Sin coincidencias</span>
            ) : null}
          </div>
          <div className="text-xs font-semibold text-slate-400">Productos</div>
          <div className="space-y-2 py-2 text-sm">
            {(data?.products ?? []).map((product: any) => (
              <span key={product.id} className="block text-slate-600">
                {product.name}
              </span>
            ))}
            {(data?.products ?? []).length === 0 ? (
              <span className="text-xs text-slate-400">Sin coincidencias</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
