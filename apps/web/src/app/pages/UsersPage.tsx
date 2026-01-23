import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

const inviteSchema = z.object({
  email: z.string().email("Email invalido"),
  role: z.enum(["ADMIN", "VETERINARIO", "OPERADOR", "AUDITOR"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

type MemberItem = {
  id: string;
  status: "ACTIVE" | "REVOKED";
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roles: string[];
    createdAt: string;
  };
};

type InviteItem = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  VETERINARIO: "Veterinario",
  OPERADOR: "Operador",
  AUDITOR: "Auditor",
};

const UsersPage = () => {
  const queryClient = useQueryClient();
  const [lastInvite, setLastInvite] = useState<{
    email: string;
    role: string;
    url: string;
  } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data: membersData, isLoading: isMembersLoading } = useQuery({
    queryKey: ["org-members"],
    queryFn: async () => (await api.get("/organizations/members")).data,
  });

  const { data: invitesData, isLoading: isInvitesLoading } = useQuery({
    queryKey: ["org-invites"],
    queryFn: async () => (await api.get("/organizations/invites")).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "OPERADOR" },
  });

  const members = (membersData?.items ?? []) as MemberItem[];
  const invites = (invitesData?.items ?? []) as InviteItem[];

  const onInviteSubmit = async (values: InviteFormValues) => {
    try {
      const payload = {
        email: values.email.trim().toLowerCase(),
        role: values.role,
      };
      const response = await api.post("/organizations/invites", payload);
      setLastInvite({
        email: response.data.email,
        role: response.data.role,
        url: response.data.inviteUrl,
      });
      toast.success("Invitacion creada");
      reset({ email: "", role: values.role });
      queryClient.invalidateQueries({ queryKey: ["org-invites"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo invitar");
    }
  };

  const handleCopy = async (value: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard no disponible");
      }
      await navigator.clipboard.writeText(value);
      toast.success("Enlace copiado");
    } catch (error: any) {
      toast.error(error?.message ?? "No se pudo copiar");
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      setRevokingId(inviteId);
      await api.delete(`/organizations/invites/${inviteId}`);
      toast.success("Invitacion revocada");
      queryClient.invalidateQueries({ queryKey: ["org-invites"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo revocar");
    } finally {
      setRevokingId(null);
    }
  };

  const formatRole = (role: string) => roleLabels[role] ?? role;
  const formatRoles = (roles: string[]) =>
    roles.length ? roles.map(formatRole).join(", ") : "-";

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : "-";

  const getMemberStatus = (member: MemberItem) => {
    if (!member.user.isActive) {
      return { label: "Inactivo", variant: "warning" as const };
    }
    if (member.status === "REVOKED") {
      return { label: "Revocado", variant: "danger" as const };
    }
    return { label: "Activo", variant: "success" as const };
  };

  const getInviteStatus = (invite: InviteItem) => {
    if (invite.revokedAt) {
      return { label: "Revocada", variant: "danger" as const };
    }
    if (invite.acceptedAt) {
      return { label: "Aceptada", variant: "success" as const };
    }
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return { label: "Expirada", variant: "warning" as const };
    }
    return { label: "Pendiente", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="Gestiona miembros e invitaciones" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Invitar usuario</h3>
            <p className="text-sm text-slate-500">
              Comparte un enlace para sumar miembros a la organizacion.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit(onInviteSubmit)}>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500">Email</label>
                <Input placeholder="usuario@empresa.com" {...register("email")} />
                {errors.email ? (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500">Rol</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  {...register("role")}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Crear invitacion"}
              </Button>
            </form>

            {lastInvite ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Enlace generado
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {lastInvite.email} - {formatRole(lastInvite.role)}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input readOnly value={lastInvite.url} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopy(lastInvite.url)}
                  >
                    Copiar
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  El enlace expira en 7 dias o al crear una nueva invitacion.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Invitaciones</h3>
            <p className="text-sm text-slate-500">
              Controla estado y revoca accesos pendientes.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Email</TH>
                  <TH>Rol</TH>
                  <TH>Estado</TH>
                  <TH>Expira</TH>
                  <TH>Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {invites.map((invite) => {
                  const status = getInviteStatus(invite);
                  const isPending =
                    status.label === "Pendiente" &&
                    !invite.revokedAt &&
                    !invite.acceptedAt;
                  return (
                    <TR key={invite.id}>
                      <TD>{invite.email}</TD>
                      <TD>{formatRole(invite.role)}</TD>
                      <TD>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TD>
                      <TD>{formatDate(invite.expiresAt)}</TD>
                      <TD>
                        {isPending ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={revokingId === invite.id}
                            onClick={() => handleRevoke(invite.id)}
                          >
                            {revokingId === invite.id ? "Revocando..." : "Revocar"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
                {isInvitesLoading ? (
                  <TR>
                    <TD colSpan={5} className="text-sm text-slate-500">
                      Cargando invitaciones...
                    </TD>
                  </TR>
                ) : null}
                {!isInvitesLoading && invites.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="text-sm text-slate-500">
                      Sin invitaciones registradas.
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900">Miembros</h3>
          <p className="text-sm text-slate-500">
            Usuarios activos y revocados dentro de la organizacion.
          </p>
        </CardHeader>
        <CardContent>
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
              {members.map((member) => {
                const status = getMemberStatus(member);
                return (
                  <TR key={member.id}>
                    <TD>{member.user.name}</TD>
                    <TD>{member.user.email}</TD>
                    <TD>{formatRoles(member.user.roles)}</TD>
                    <TD>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TD>
                  </TR>
                );
              })}
              {isMembersLoading ? (
                <TR>
                  <TD colSpan={4} className="text-sm text-slate-500">
                    Cargando miembros...
                  </TD>
                </TR>
              ) : null}
              {!isMembersLoading && members.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="text-sm text-slate-500">
                    Sin miembros registrados.
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
