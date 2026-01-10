import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getAnimalCategoryLabel } from "@/lib/animals";

const AnimalPrintPage = () => {
  const params = useParams();
  const { data } = useQuery({
    queryKey: ["animal", "print", params.id],
    queryFn: async () => (await api.get(`/animals/${params.id}`)).data,
  });

  useEffect(() => {
    if (data) {
      setTimeout(() => window.print(), 300);
    }
  }, [data]);

  if (!data) {
    return <div className="p-6">Cargando ficha...</div>;
  }

  const tagLabel = data.tag || "Sin arete";

  return (
    <div className="p-8 text-slate-900">
      <h1 className="text-2xl font-semibold">Ficha del animal</h1>
      <div className="mt-4 grid gap-2 text-sm">
        <p><strong>Arete:</strong> {tagLabel}</p>
        <p><strong>Categoria:</strong> {getAnimalCategoryLabel(data.category)}</p>
        <p><strong>Raza:</strong> {data.breed}</p>
        <p><strong>Sexo:</strong> {data.sex}</p>
        <p><strong>Estado:</strong> {data.status}</p>
        <p><strong>Ubicacion:</strong> {data.establishment
          ? data.establishment.parent
            ? `${data.establishment.parent.name} / ${data.establishment.name}`
            : data.establishment.name
          : "-"}</p>
      </div>
    </div>
  );
};

export default AnimalPrintPage;
