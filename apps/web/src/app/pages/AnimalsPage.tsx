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
import { ChevronDown, Search, X, Filter, Download, Upload, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { downloadCsv } from "@/lib/csv";
import {
  getAnimalCategoryLabel,
  getAnimalIdentifier,
  getAnimalStatusLabel,
  animalCategoryOptions,
  animalStatusOptions,
} from "@/lib/animals";
import { getOperationalEstablishmentOptions } from "@/lib/establishments";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";
import { cn } from "@/lib/utils";

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

  // Estados de busqueda y paginacion
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isCompact, setIsCompact] = useState(false);
  const pageSize = 10;

  // Estados de filtros dinámicos
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedEstablishment, setSelectedEstablishment] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory, selectedStatus, selectedEstablishment]);

  // Consulta de establecimientos para el filtro de ubicacion
  const { data: establishments } = useQuery({
    queryKey: ["establishments", "list-filters"],
    queryFn: async () => (await api.get("/establishments?tree=true")).data,
  });

  const locationOptions = useMemo(
    () => getOperationalEstablishmentOptions(establishments ?? []),
    [establishments]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["animals", search, page, selectedCategory, selectedStatus, selectedEstablishment],
    queryFn: async () =>
      (
        await api.get("/animals", {
          params: {
            page,
            pageSize,
            tag: search || undefined,
            category: selectedCategory || undefined,
            status: selectedStatus || undefined,
            establishmentId: selectedEstablishment || undefined,
          },
        })
      ).data,
  });

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: "Identificador",
        accessorKey: "tag",
        cell: (info) => {
          const identifier = getAnimalIdentifier(info.row.original, "");
          return (
            <Link
              className={
                identifier
                  ? "text-brand-600 hover:text-brand-700 font-semibold hover:underline dark:text-brand-400 dark:hover:text-brand-300"
                  : "text-slate-400 dark:text-slate-500 hover:underline"
              }
              to={`/animals/${info.row.original.id}`}
            >
              {identifier || "Sin identificador"}
            </Link>
          );
        },
      },
      {
        header: "Categoria",
        accessorKey: "category",
        cell: (info) => <Badge>{getAnimalCategoryLabel(info.getValue() as string)}</Badge>,
      },
      {
        header: "Raza",
        accessorKey: "breed",
        meta: {
          className: "hidden md:table-cell",
        },
      },
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
        meta: {
          className: "hidden md:table-cell",
        },
        cell: (info) => {
          const establishment = info.row.original.establishment;
          if (!establishment) {
            return <span className="text-slate-400 dark:text-slate-500">Sin asignar</span>;
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

  const activeFiltersCount = [
    selectedCategory,
    selectedStatus,
    selectedEstablishment,
  ].filter(Boolean).length;

  const handleClearAllFilters = () => {
    setSelectedCategory("");
    setSelectedStatus("");
    setSelectedEstablishment("");
  };

  const cellPaddingClass = isCompact ? "py-2" : "";

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Animales"
        subtitle="Gestion y trazabilidad individual"
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageAnimals ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-sm border border-transparent dark:bg-brand-500 dark:hover:bg-brand-600">
                    <Plus className="h-4 w-4" />
                    Registrar
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 shadow-panel dark:bg-slate-900 border dark:border-slate-800">
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer py-2 px-3 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onSelect={() => navigate("/animals/new")}
                  >
                    <Plus className="h-4 w-4 text-slate-400" />
                    Registro individual
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer py-2 px-3 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onSelect={() => navigate("/animals/quick")}
                  >
                    <Plus className="h-4 w-4 text-slate-400" />
                    Registro rápido por lote
                  </DropdownMenuItem>
                  {canImportAnimals ? (
                    <DropdownMenuItem
                      className="rounded-lg cursor-pointer py-2 px-3 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-t dark:border-slate-800 mt-1"
                      onSelect={() => navigate("/animals/import")}
                    >
                      <Upload className="h-4 w-4 text-slate-400" />
                      Importar desde CSV
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Button variant="outline" onClick={handleExportCsv} className="gap-2 text-slate-700 dark:text-slate-200">
              <Download className="h-4 w-4 text-slate-400" />
              Exportar CSV
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <Input
            placeholder="Buscar por identificador..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10 pr-10 rounded-xl"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFilters || activeFiltersCount > 0 ? "secondary" : "outline"}
            className={cn(
              "gap-2 rounded-xl transition-all duration-200 flex-1 sm:flex-initial",
              (showFilters || activeFiltersCount > 0) && "border-brand-500 bg-brand-50/50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-300 dark:border-brand-900"
            )}
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 ? (
              <Badge className="ml-1 bg-brand-600 hover:bg-brand-600 px-1.5 py-0.5 rounded-full text-white text-[10px] dark:bg-brand-500">
                {activeFiltersCount}
              </Badge>
            ) : null}
          </Button>

          <Button
            variant={isCompact ? "secondary" : "outline"}
            aria-pressed={isCompact}
            className="flex-1 sm:flex-initial rounded-xl"
            onClick={() => setIsCompact((prev) => !prev)}
          >
            Modo compacto
          </Button>
        </div>
      </div>

      {/* Panel de Filtros Colapsable */}
      {showFilters ? (
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 gap-4 grid grid-cols-1 sm:grid-cols-3 dark:bg-slate-900/40 dark:border-slate-800 animate-fade-up">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Categoría
            </label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {animalCategoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estado
            </label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {animalStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ubicación
            </label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
              value={selectedEstablishment}
              onChange={(e) => setSelectedEstablishment(e.target.value)}
            >
              <option value="">Todas las ubicaciones</option>
              {locationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {/* Badges de filtros activos fuera del panel */}
      {activeFiltersCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 py-1 text-sm text-slate-500 dark:text-slate-400 animate-fade-up">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Filtros aplicados:</span>
          
          {selectedCategory ? (
            <Badge className="gap-1.5 py-1 pl-2.5 pr-1.5 rounded-lg border">
              Cat: {getAnimalCategoryLabel(selectedCategory)}
              <button
                onClick={() => setSelectedCategory("")}
                className="hover:bg-slate-200 dark:hover:bg-slate-800 p-0.5 rounded transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ) : null}

          {selectedStatus ? (
            <Badge className="gap-1.5 py-1 pl-2.5 pr-1.5 rounded-lg border">
              Est: {getAnimalStatusLabel(selectedStatus)}
              <button
                onClick={() => setSelectedStatus("")}
                className="hover:bg-slate-200 dark:hover:bg-slate-800 p-0.5 rounded transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ) : null}

          {selectedEstablishment ? (
            <Badge className="gap-1.5 py-1 pl-2.5 pr-1.5 rounded-lg border">
              Ubic: {locationOptions.find((opt) => opt.value === selectedEstablishment)?.label || "Potrero"}
              <button
                onClick={() => setSelectedEstablishment("")}
                className="hover:bg-slate-200 dark:hover:bg-slate-800 p-0.5 rounded transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllFilters}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold dark:text-brand-400 dark:hover:text-brand-300"
          >
            Limpiar todo
          </Button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 shadow-soft">
        <Table>
          <THead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TR key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TH
                    key={header.id}
                    className={cn(cellPaddingClass, (header.column.columnDef.meta as any)?.className)}
                  >
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
                  <div className="flex justify-center items-center py-10 text-slate-500 dark:text-slate-400 gap-2">
                    <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    Cargando animales...
                  </div>
                </TD>
              </TR>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TR key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TD
                      key={cell.id}
                      className={cn(cellPaddingClass, (cell.column.columnDef.meta as any)?.className)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TD>
                  ))}
                </TR>
              ))
            ) : (
              <TR>
                <TD colSpan={columns.length} className={cellPaddingClass}>
                  <div className="flex flex-col items-center gap-3 py-12 text-slate-500 dark:text-slate-400">
                    <span className="text-sm font-medium">No se encontraron animales con los filtros aplicados.</span>
                    {canManageAnimals ? (
                      <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl dark:bg-brand-500 dark:hover:bg-brand-600" asChild>
                        <Link to="/animals/new">Registrar primer animal</Link>
                      </Button>
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
              className="rounded-lg"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
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
