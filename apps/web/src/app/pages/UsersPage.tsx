import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const UsersPage = () => {
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="RBAC y gestion de accesos" />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Email</TH>
              <TH>Roles</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {(data ?? []).map((user: any) => (
              <TR key={user.id}>
                <TD>{user.name}</TD>
                <TD>{user.email}</TD>
                <TD>{(user.roles ?? []).join(", ")}</TD>
                <TD>{user.isActive ? "Activo" : "Inactivo"}</TD>
              </TR>
            ))}
            {(data ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500">
                  Sin usuarios registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default UsersPage;
