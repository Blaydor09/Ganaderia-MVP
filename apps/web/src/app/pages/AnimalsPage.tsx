import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { downloadCsv } from "@/lib/csv";
import { getAnimalCategoryLabel } from "@/lib/animals";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const AnimalsPage = () => {
  const canManageAnimals = hasAnyRole(Access.animalsCreate);
  const canImportAnimals = hasAnyRole(Access.animalsImport);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["animals", search, page],
    queryFn: async () =>
      (await api.get(`/animals?page=${page}&pageSize=${pageSize}&tag=${search}`)).data,
  });

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: "Arete",
        accessorKey: "tag",
        cell: (info) => (
          <Link className="text-brand-700 hover:underline" to={`/animals/${info.row.original.id}`}>
            {info.getValue() as string}
          </Link>
        ),
      },
      {
        header: "Categoria",
        accessorKey: "category",
        cell: (info) => <Badge>{getAnimalCategoryLabel(info.getValue() as string)}</Badge>,
      },
      { header: "Raza", accessorKey: "breed" },
      { header: "Estado", accessorKey: "status" },
      {
        header: "Ubicacion",
        accessorFn: (row) => {
          if (!row.establishment) return "-";
          if (row.establishment.parent) {
            return `${row.establishment.parent.name} / ${row.establishment.name}`;
          }
          return row.establishment.name;
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Animales"
        subtitle="Gestion y trazabilidad individual"
        actions={
          <div className="flex gap-2">
            {canImportAnimals ? (
              <Button asChild>
                <Link to="/animals/import">Importar CSV</Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "animales.csv",
                  (data?.items ?? []).map((animal: any) => ({
                    tag: animal.tag,
                    category: animal.category,
                    breed: animal.breed,
                    status: animal.status,
                  }))
                )
              }
            >
              Exportar CSV
            </Button>
            {canManageAnimals ? (
              <Button variant="secondary" asChild>
                <Link to="/animals/new">Registrar animal</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por arete"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-64"
        />
        <Button variant="outline">Filtros</Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TR key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TH key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TH>
                ))}
              </TR>
            ))}
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={columns.length}>Cargando...</TD>
              </TR>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TR key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TD key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TD>
                  ))}
                </TR>
              ))
            ) : (
              <TR>
                <TD colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
                    <span>No hay animales registrados.</span>
                    {canManageAnimals ? (
                      <Button size="sm" asChild>
                        <Link to="/animals/new">Registrar animal</Link>
                      </Button>
                    ) : null}
                  </div>
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          <span>
            Pagina {page} de {Math.ceil((data?.total ?? 0) / pageSize) || 1}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((prev) =>
                  prev < Math.ceil((data?.total ?? 0) / pageSize) ? prev + 1 : prev
                )
              }
              disabled={page >= Math.ceil((data?.total ?? 0) / pageSize)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimalsPage;
