import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemographicsReport } from "@/components/reports/DemographicsReport";
import { InventoryReport } from "@/components/reports/InventoryReport";
import { HealthReport } from "@/components/reports/HealthReport";
import { ReproductionReport } from "@/components/reports/ReproductionReport";
import { AuditReport } from "@/components/reports/AuditReport";

const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Centro de Reportes" subtitle="Análisis integral, auditoría y exportación" />

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="inventory">Inventario y Manejo</TabsTrigger>
          <TabsTrigger value="demographics">Población Animal</TabsTrigger>
          <TabsTrigger value="reproduction">Reproducción</TabsTrigger>
          <TabsTrigger value="health">Salud y Tratamientos</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-0">
          <InventoryReport />
        </TabsContent>
        <TabsContent value="demographics" className="mt-0">
          <DemographicsReport />
        </TabsContent>
        <TabsContent value="reproduction" className="mt-0">
          <ReproductionReport />
        </TabsContent>
        <TabsContent value="health" className="mt-0">
          <HealthReport />
        </TabsContent>
        <TabsContent value="audit" className="mt-0">
          <AuditReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
