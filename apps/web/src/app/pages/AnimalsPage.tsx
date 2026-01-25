import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { downloadCsv } from "@/lib/csv";
import { getAnimalCategoryLabel, getAnimalStatusLabel } from "@/lib/animals";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const statusVariantByValue: Record<string, "default" | "success" | "warning" | "danger"> = {
  ACTIVO: "success",
  VENDIDO: "warning",
  MUERTO: "danger",
  FAENADO: "danger",
  PERDIDO: "warning",
};

const AnimalsPage = () => {
  const canManageAnimals = hasAnyRole(Access.animalsCreate);
  const canImportAnimals = hasAnyRole(Access.animalsImport);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isCompact, setIsCompact] = useState(false);
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
        cell: (info) => {
          const tag = info.getValue() as string | null;
          return (
            <Link
              className={tag ? "text-brand-700 hover:underline" : "text-slate-400 hover:underline"}
              to={`/animals/${info.row.original.id}`}
            >
              {tag || "Sin arete"}
            </Link>
          );
        },
      },
      {
        header: "Categoria",
        accessorKey: "category",
        cell: (info) => <Badge>{getAnimalCategoryLabel(info.getValue() as string)}</Badge>,
      },
      { header: "Raza", accessorKey: "breed" },
      {
        header: "Estado",
        accessorKey: "status",
        cell: (info) => {
          const status = info.getValue() as string | undefined;
          const variant = status ? statusVariantByValue[status] ?? "default" : "default";
          return <Badge variant={variant}>{getAnimalStatusLabel(status)}</Badge>;
        },
      },
      {
        header: "Ubicacion",
        cell: (info) => {
          const establishment = info.row.original.establishment;
          if (!establishment) {
            return <span className="text-slate-400">Sin asignar</span>;
          }
          if (establishment.parent) {
            return `${establishment.parent.name} / ${establishment.name}`;
          }
          return establishment.name;
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

  const handleExportCsv = () => {
    downloadCsv(
      "animales.csv",
      (data?.items ?? []).map((animal: any) => ({
        tag: animal.tag ?? "",
        category: animal.category,
        breed: animal.breed,
        status: animal.status,
      }))
    );
  };

  const cellPaddingClass = isCompact ? "py-2" : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Animales"
        subtitle="Gestion y trazabilidad individual"
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageAnimals ? (
              <Button asChild>
                <Link to="/animals/quick">Registro rapido</Link>
              </Button>
            ) : null}
            {canManageAnimals ? (
              <Button variant="secondary" asChild>
                <Link to="/animals/new">Registrar animal</Link>
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  CSV
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canImportAnimals ? (
                  <DropdownMenuItem onSelect={() => navigate("/animals/import")}>
                    Importar CSV
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={handleExportCsv}>Exportar CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        <Button
          variant={isCompact ? "secondary" : "outline"}
          aria-pressed={isCompact}
          onClick={() => setIsCompact((prev) => !prev)}
        >
          Modo compacto
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
        <Table>
          <THead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TR key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TH key={header.id} className={cellPaddingClass}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TH>
                ))}
              </TR>
            ))}
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={columns.length} className={cellPaddingClass}>
                  Cargando...
                </TD>
              </TR>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TR key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TD key={cell.id} className={cellPaddingClass}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TD>
                  ))}
                </TR>
              ))
            ) : (
              <TR>
                <TD colSpan={columns.length} className={cellPaddingClass}>
                  <div className="flex flex-col items-center gap-2 py-8 text-slate-500 dark:text-slate-400">
                    <span>No hay animales registrados.</span>
                    {canManageAnimals ? (
                      <div className="flex gap-2">
                        <Button size="sm" asChild>
                          <Link to="/animals/quick">Registro rapido</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/animals/new">Registrar animal</Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
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
