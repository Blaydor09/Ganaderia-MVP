import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const ProductsPage = () => {
  const canCreate = hasAnyRole(Access.productsCreate);
  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products?page=1&pageSize=50")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicamentos"
        subtitle="Catalogo de productos y retiros"
        actions={canCreate ? <Button>Nuevo producto</Button> : undefined}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data?.items ?? []).map((product: any) => (
          <Card key={product.id}>
            <CardContent className="space-y-2">
              <h3 className="font-display text-lg font-semibold">{product.name}</h3>
              <p className="text-xs text-slate-500">Principio: {product.activeIngredient}</p>
              <p className="text-xs text-slate-500">Retiro carne: {product.meatWithdrawalDays} dias</p>
              <p className="text-xs text-slate-500">Retiro leche: {product.milkWithdrawalDays} dias</p>
            </CardContent>
          </Card>
        ))}
        {(data?.items ?? []).length === 0 ? (
          <Card>
            <CardContent className="text-sm text-slate-500">
              Sin productos. Agrega el primer medicamento.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default ProductsPage;
