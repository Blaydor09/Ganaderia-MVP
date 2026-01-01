import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import api from "@/lib/api";
import { toast } from "sonner";

const AnimalsImportPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecciona un archivo CSV");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setIsUploading(true);
    try {
      const response = await api.post("/animals/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Importados ${response.data.count} animales`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al importar");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importacion inicial"
        subtitle="Wizard guiado para animales e inventario inicial"
        actions={
          <Button variant="outline" asChild>
            <a href="/animals-template.csv" download>
              Descargar plantilla CSV
            </a>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Paso 1</p>
            <h3 className="font-display text-lg font-semibold">Carga de animales</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? "Importando..." : "Subir CSV"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Paso 2</p>
            <h3 className="font-display text-lg font-semibold">Inventario inicial</h3>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-500">
            <p>Registra productos y lotes iniciales desde el modulo Inventario.</p>
            <Button variant="secondary" asChild>
              <a href="/inventory">Ir a inventario</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnimalsImportPage;
