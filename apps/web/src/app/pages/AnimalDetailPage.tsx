import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const AnimalDetailPage = () => {
  const params = useParams();
  const { data } = useQuery({
    queryKey: ["animal", params.id],
    queryFn: async () => (await api.get(`/animals/${params.id}`)).data,
  });

  if (!data) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ficha ${data.tag}`}
        subtitle={`Categoria ${data.category} · Estado ${data.status}`}
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <Link to={`/animals/${data.id}/print`}>Imprimir ficha</Link>
            </Button>
            <Button variant="secondary">Agregar evento</Button>
            <Button variant="outline">Agregar tratamiento</Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Badge>{data.category}</Badge>
          <span className="text-sm text-slate-500">Raza: {data.breed}</span>
          <span className="text-sm text-slate-500">Sexo: {data.sex}</span>
        </div>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="tratamientos">Tratamientos</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="pesajes">Pesajes</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Nacimiento</p>
              <p className="text-sm font-medium">{new Date(data.birthDate).toLocaleDateString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Ubicacion</p>
              <p className="text-sm font-medium">
                {data.establishment?.name ?? "Sin asignar"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Origen</p>
              <p className="text-sm font-medium">{data.origin}</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="eventos">
          <div className="rounded-xl border border-slate-200 p-4">
            {data.events?.length ? (
              data.events.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between border-b py-2 text-sm">
                  <span>{event.type}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(event.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sin eventos registrados.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="tratamientos">
          <div className="rounded-xl border border-slate-200 p-4">
            {data.treatments?.length ? (
              data.treatments.map((treatment: any) => (
                <div key={treatment.id} className="flex items-center justify-between border-b py-2 text-sm">
                  <span>{treatment.diagnosis}</span>
                  <span className="text-xs text-slate-400">{treatment.status}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sin tratamientos.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="movimientos">
          <div className="rounded-xl border border-slate-200 p-4">
            {data.movements?.length ? (
              data.movements.map((move: any) => (
                <div key={move.id} className="flex items-center justify-between border-b py-2 text-sm">
                  <span>{move.movementType}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(move.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sin movimientos.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="pesajes">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Pesajes registrados en eventos de tipo PESO.</p>
          </div>
        </TabsContent>
        <TabsContent value="documentos">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Adjuntos en desarrollo.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnimalDetailPage;
