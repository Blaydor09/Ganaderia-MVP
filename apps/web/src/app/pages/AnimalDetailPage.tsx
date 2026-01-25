import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAnimalCategoryLabel } from "@/lib/animals";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const AnimalDetailPage = () => {
  const params = useParams();
  const canCreateEvents = hasAnyRole(Access.eventsCreate);
  const canCreateTreatments = hasAnyRole(Access.treatmentsCreate);
  const { data } = useQuery({
    queryKey: ["animal", params.id],
    queryFn: async () => (await api.get(`/animals/${params.id}`)).data,
  });

  if (!data) {
    return <div>Cargando...</div>;
  }

  const tagLabel = data.tag || "Sin arete";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ficha ${tagLabel}`}
        subtitle={`Categoria ${getAnimalCategoryLabel(data.category)} - Estado ${data.status}`}
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <Link to={`/animals/${data.id}/print`}>Imprimir ficha</Link>
            </Button>
            {canCreateEvents ? <Button variant="secondary">Agregar evento</Button> : null}
            {canCreateTreatments ? <Button variant="outline">Agregar tratamiento</Button> : null}
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center gap-4">
          <Badge>{getAnimalCategoryLabel(data.category)}</Badge>
          <span className="text-sm text-slate-500 dark:text-slate-400">Raza: {data.breed}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">Sexo: {data.sex}</span>
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
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs text-slate-500 dark:text-slate-400">Nacimiento</p>
              <p className="text-sm font-medium">
                {data.birthDate ? new Date(data.birthDate).toLocaleDateString() : "Sin fecha"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs text-slate-500 dark:text-slate-400">Ubicacion</p>
              <p className="text-sm font-medium">
                {data.establishment
                  ? data.establishment.parent
                    ? `${data.establishment.parent.name} / ${data.establishment.name}`
                    : data.establishment.name
                  : "Sin asignar"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs text-slate-500 dark:text-slate-400">Origen</p>
              <p className="text-sm font-medium">{data.origin}</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="eventos">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            {data.events?.length ? (
              data.events.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border-b border-slate-200 py-2 text-sm dark:border-slate-800"
                >
                  <span>{event.type}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(event.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin eventos registrados.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="tratamientos">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            {data.treatments?.length ? (
              data.treatments.map((treatment: any) => (
                <div
                  key={treatment.id}
                  className="flex items-center justify-between border-b border-slate-200 py-2 text-sm dark:border-slate-800"
                >
                  <span>{treatment.diagnosis}</span>
                  <span className="text-xs text-slate-400">{treatment.status}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin tratamientos.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="movimientos">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            {data.movements?.length ? (
              data.movements.map((move: any) => (
                <div
                  key={move.id}
                  className="flex items-center justify-between border-b border-slate-200 py-2 text-sm dark:border-slate-800"
                >
                  <span>{move.movementType}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(move.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin movimientos.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="pesajes">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-sm text-slate-500 dark:text-slate-400">Pesajes registrados en eventos de tipo PESO.</p>
          </div>
        </TabsContent>
        <TabsContent value="documentos">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-sm text-slate-500 dark:text-slate-400">Adjuntos en desarrollo.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnimalDetailPage;
