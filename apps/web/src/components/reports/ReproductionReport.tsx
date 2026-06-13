import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExportButton } from "./ExportButton";

export function ReproductionReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "reproduction"],
    queryFn: async () => (await api.get("/reports/reproduction")).data,
  });

  if (isLoading) return <div className="p-4 text-sm text-slate-500">Cargando...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-display">Reproducción</h2>
        <ExportButton endpoint="/reports/reproduction" filename="reproduccion.csv" />
      </div>

      <Card>
        <CardHeader>
          <p className="text-xs text-slate-500">Eventos Reproductivos</p>
        </CardHeader>
        <CardContent className="h-72">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="type" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" fill="#4d7d66" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">Sin eventos reproductivos registrados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
