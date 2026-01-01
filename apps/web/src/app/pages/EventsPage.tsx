import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const EventsPage = () => {
  const { data } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await api.get("/events?page=1&pageSize=50")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Eventos" subtitle="Bitacora productiva y sanitaria" />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Animal</TH>
              <TH>Tipo</TH>
              <TH>Fecha</TH>
              <TH>Notas</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((event: any) => (
              <TR key={event.id}>
                <TD>{event.animalId}</TD>
                <TD>{event.type}</TD>
                <TD>{new Date(event.occurredAt).toLocaleDateString()}</TD>
                <TD>{event.notes ?? "-"}</TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500">
                  Sin eventos registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default EventsPage;
