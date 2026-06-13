import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import api from "@/lib/api";

interface ExportButtonProps {
  endpoint: string;
  filename: string;
  params?: Record<string, string | undefined>;
}

export function ExportButton({ endpoint, filename, params }: ExportButtonProps) {
  const handleExport = async () => {
    try {
      const response = await api.get(endpoint, {
        params: { ...params, export: "csv" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Export failed", error);
      alert("Error al exportar el reporte.");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      Exportar CSV
    </Button>
  );
}
