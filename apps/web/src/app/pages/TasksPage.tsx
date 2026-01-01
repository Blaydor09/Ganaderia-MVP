import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const TasksPage = () => {
  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get("/tasks")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Tareas" subtitle="Planificacion sanitaria por categoria" />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Tarea</TH>
              <TH>Tipo</TH>
              <TH>Vencimiento</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {(data ?? []).map((task: any) => (
              <TR key={task.id}>
                <TD>{task.title}</TD>
                <TD>{task.taskType}</TD>
                <TD>{new Date(task.dueAt).toLocaleDateString()}</TD>
                <TD>{task.status}</TD>
              </TR>
            ))}
            {(data ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500">
                  Sin tareas programadas.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default TasksPage;
