import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import api from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExportButton } from "./ExportButton";

const COLORS = ["#4d7d66", "#649981", "#7cb89c", "#96d6b7", "#b0f2d3"];

export function DemographicsReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "demographics"],
    queryFn: async () => (await api.get("/reports/demographics")).data,
  });

  if (isLoading) return <div className="p-4 text-sm text-slate-500">Cargando...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-display">Población Animal</h2>
          <p className="text-sm text-slate-500">Total activos: {data.total}</p>
        </div>
        <ExportButton endpoint="/reports/demographics" filename="demografia.csv" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Distribución por Categoría</p>
          </CardHeader>
          <CardContent className="h-64">
            {data.byCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byCategory}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#4d7d66"
                    label
                  >
                    {data.byCategory.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500">Sin datos</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Distribución por Sexo</p>
          </CardHeader>
          <CardContent className="h-64">
             {data.bySex?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.bySex}
                    dataKey="count"
                    nameKey="sex"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#4d7d66"
                    label
                  >
                    {data.bySex.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
             ) : (
               <p className="text-sm text-slate-500">Sin datos</p>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
