import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import api from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExportButton } from "./ExportButton";

const COLORS = ["#f87171", "#60a5fa", "#34d399", "#fbbf24"];

export function HealthReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "health"],
    queryFn: async () => (await api.get("/reports/health")).data,
  });

  if (isLoading) return <div className="p-4 text-sm text-slate-500">Cargando...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-display">Salud y Tratamientos</h2>
          <p className="text-sm text-slate-500">Total tratamientos: {data.totalTreatments}</p>
        </div>
        <ExportButton endpoint="/reports/health" filename="salud.csv" />
      </div>

      <Card>
        <CardHeader>
          <p className="text-xs text-slate-500">Estado de Tratamientos</p>
        </CardHeader>
        <CardContent className="h-64">
          {data.treatmentsByStatus?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.treatmentsByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#4d7d66"
                  label
                >
                  {data.treatmentsByStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">Sin tratamientos registrados</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
