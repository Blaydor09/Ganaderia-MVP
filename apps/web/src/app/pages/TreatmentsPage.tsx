import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const schema = z.object({
  animalId: z.string().min(1),
  diagnosis: z.string().min(3),
  startedAt: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

const TreatmentsPage = () => {
  const queryClient = useQueryClient();
  const canCreate = hasAnyRole(Access.treatmentsCreate);
  const { data } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => (await api.get("/treatments?page=1&pageSize=50")).data,
  });

  const { data: animals } = useQuery({
    queryKey: ["animals", "picker"],
    queryFn: async () => (await api.get("/animals?page=1&pageSize=50")).data,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/treatments", {
        animalId: values.animalId,
        diagnosis: values.diagnosis,
        startedAt: new Date(values.startedAt).toISOString(),
      });
      toast.success("Tratamiento creado");
      reset();
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al crear tratamiento");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tratamientos"
        subtitle="Control sanitario y aplicaciones"
        actions={
          canCreate ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Nuevo tratamiento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo tratamiento</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500">Animal</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      {...register("animalId")}
                    >
                      <option value="">Selecciona</option>
                      {(animals?.items ?? []).map((animal: any) => (
                        <option key={animal.id} value={animal.id}>
                          {(animal.tag || "Sin arete")} - {animal.breed}
                        </option>
                      ))}
                    </select>
                    {errors.animalId ? (
                      <p className="text-xs text-red-500">{errors.animalId.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500">Diagnostico</label>
                    <Input placeholder="Ej: Desparasitacion" {...register("diagnosis")} />
                    {errors.diagnosis ? (
                      <p className="text-xs text-red-500">{errors.diagnosis.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500">Fecha inicio</label>
                    <Input type="datetime-local" {...register("startedAt")} />
                    {errors.startedAt ? (
                      <p className="text-xs text-red-500">{errors.startedAt.message}</p>
                    ) : null}
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Crear"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Animal</TH>
              <TH>Diagnostico</TH>
              <TH>Inicio</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((treatment: any) => (
              <TR key={treatment.id}>
                <TD>{treatment.animal?.tag || "Sin arete"}</TD>
                <TD>{treatment.diagnosis}</TD>
                <TD>{new Date(treatment.startedAt).toLocaleDateString()}</TD>
                <TD>{treatment.status}</TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500">
                  Sin tratamientos activos.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default TreatmentsPage;
