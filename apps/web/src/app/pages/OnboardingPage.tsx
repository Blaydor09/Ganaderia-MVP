
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { ThemeShell } from "@/components/layout/ThemeProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  animalCategoryOptions,
  animalOriginOptions,
  animalSexOptions,
  animalStatusOptions,
  getAnimalCategoryLabel,
} from "@/lib/animals";
import { getEstablishmentTypeLabel } from "@/lib/establishments";
import { productTypeOptions } from "@/lib/products";
import { parseDateInputToUtcIso } from "@/lib/dates";

const steps = [
  {
    key: "establishments",
    title: "Establecimientos",
    description:
      "Define tu finca y areas principales para ubicar animales, movimientos y reportes.",
  },
  {
    key: "animals",
    title: "Animales",
    description:
      "Registra un set inicial para ver tu tablero con datos reales desde el primer dia.",
  },
  {
    key: "products",
    title: "Medicamentos",
    description:
      "Crea el catalogo base para registrar tratamientos, retiros y stock.",
  },
] as const;

const defaultSexByCategory: Record<string, "MALE" | "FEMALE"> = {
  VACA: "FEMALE",
  VAQUILLA: "FEMALE",
  TORO: "MALE",
  TORILLO: "MALE",
  TERNERO: "MALE",
};

const quickLineSchema = z.object({
  category: z.enum(["TERNERO", "VAQUILLA", "VACA", "TORO", "TORILLO"]),
  sex: z.enum(["MALE", "FEMALE"]),
  count: z.number().int().min(0),
});

const quickSchema = z
  .object({
    lines: z.array(quickLineSchema),
    breed: z.string().min(1, "Requerido"),
    birthDate: z.string().optional(),
    birthEstimated: z.boolean().optional(),
    origin: z.enum(["BORN", "BOUGHT"]),
    status: z.enum(["ACTIVO", "VENDIDO", "MUERTO", "FAENADO", "PERDIDO"]).optional(),
    establishmentId: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((values) => values.lines.some((line) => line.count > 0), {
    message: "Ingresa al menos una cantidad.",
    path: ["lines"],
  });

type QuickFormValues = z.infer<typeof quickSchema>;

type ManualAnimal = {
  category: "TERNERO" | "VAQUILLA" | "VACA" | "TORO" | "TORILLO";
  sex: "MALE" | "FEMALE";
  breed: string;
  origin: "BORN" | "BOUGHT";
  status: "ACTIVO" | "VENDIDO" | "MUERTO" | "FAENADO" | "PERDIDO";
  establishmentId: string;
  notes: string;
};

type ProductEntry = {
  name: string;
  type: "" | "VITAMINAS" | "ANTIBIOTICOS" | "DESPARASITANTE" | "VACUNAS";
  vaccineTypes: string;
  recommendedRoute: string;
  notes: string;
};

const createManualAnimal = (): ManualAnimal => ({
  category: "VACA",
  sex: "FEMALE",
  breed: "",
  origin: "BORN",
  status: "ACTIVO",
  establishmentId: "",
  notes: "",
});

const createProductEntry = (): ProductEntry => ({
  name: "",
  type: "",
  vaccineTypes: "",
  recommendedRoute: "subcutanea",
  notes: "",
});

const parseVaccineTypes = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const OnboardingPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedSteps, setSavedSteps] = useState({
    establishments: false,
    animals: false,
    products: false,
  });
  const [animalMode, setAnimalMode] = useState<"quick" | "manual">("quick");

  const [fincaName, setFincaName] = useState("");
  const [potreros, setPotreros] = useState<string[]>([""]);
  const [corralName, setCorralName] = useState("");

  const [manualAnimals, setManualAnimals] = useState<ManualAnimal[]>([
    createManualAnimal(),
  ]);
  const [products, setProducts] = useState<ProductEntry[]>([createProductEntry()]);

  const { data: establishments } = useQuery({
    queryKey: ["establishments", "onboarding"],
    queryFn: async () => (await api.get("/establishments?tree=true")).data,
  });

  const locationOptions = useMemo(() => {
    const fincas = (establishments ?? []) as any[];
    const options: { value: string; label: string }[] = [];
    for (const finca of fincas) {
      const children = finca.children ?? [];
      for (const child of children) {
        if (child.type === "FINCA") continue;
        options.push({
          value: child.id,
          label: `${finca.name} / ${getEstablishmentTypeLabel(child.type)} ${child.name}`,
        });
      }
    }
    return options;
  }, [establishments]);

  const defaultLines = useMemo(
    () =>
      animalCategoryOptions.map((option) => ({
        category: option.value,
        sex: defaultSexByCategory[option.value] ?? "FEMALE",
        count: 0,
      })),
    []
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<QuickFormValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      lines: defaultLines,
      origin: "BORN",
      status: "ACTIVO",
      birthEstimated: false,
      establishmentId: "",
    },
  });

  const quickLines = useWatch({ control, name: "lines" }) ?? [];
  const quickTotal = quickLines.reduce((acc, line) => acc + (line?.count ?? 0), 0);

  const currentStep = steps[stepIndex];

  const markStepSaved = (key: keyof typeof savedSteps) => {
    setSavedSteps((prev) => ({ ...prev, [key]: true }));
  };

  const handleSkip = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const saveEstablishments = async () => {
    const finca = fincaName.trim();
    const corral = corralName.trim();
    const potreroNames = potreros.map((item) => item.trim()).filter(Boolean);

    if (!finca && !corral && potreroNames.length === 0) {
      markStepSaved("establishments");
      return true;
    }

    if (!finca) {
      toast.error("Ingresa el nombre de la finca principal.");
      return false;
    }

    try {
      const fincaResponse = await api.post("/establishments", {
        name: finca,
        type: "FINCA",
      });
      const fincaId = fincaResponse.data.id as string;

      const creations: Promise<unknown>[] = [];
      if (corral) {
        creations.push(
          api.post("/establishments", {
            name: corral,
            type: "CORRAL",
            parentId: fincaId,
          })
        );
      }
      for (const potreroName of potreroNames) {
        creations.push(
          api.post("/establishments", {
            name: potreroName,
            type: "POTRERO",
            parentId: fincaId,
          })
        );
      }

      if (creations.length) {
        await Promise.all(creations);
      }

      await queryClient.invalidateQueries({ queryKey: ["establishments"] });
      await queryClient.invalidateQueries({ queryKey: ["establishments", "onboarding"] });

      markStepSaved("establishments");
      toast.success("Establecimientos guardados");
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al guardar establecimientos");
      return false;
    }
  };

  const saveQuickAnimals = async (values: QuickFormValues) => {
    const items = values.lines
      .filter((line) => line.count > 0)
      .map((line) => ({
        category: line.category,
        sex: line.category === "TERNERO"
          ? line.sex
          : defaultSexByCategory[line.category] ?? line.sex,
        count: line.count,
      }));

    if (!items.length) {
      markStepSaved("animals");
      return true;
    }

    const birthDateIso = values.birthDate
      ? parseDateInputToUtcIso(values.birthDate)
      : undefined;

    try {
      await api.post("/animals/quick", {
        items,
        breed: values.breed.trim(),
        birthDate: birthDateIso,
        birthEstimated: values.birthEstimated ?? false,
        origin: values.origin,
        status: values.status || undefined,
        establishmentId: values.establishmentId || undefined,
        notes: values.notes?.trim() || undefined,
      });
      markStepSaved("animals");
      toast.success("Animales registrados");
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar animales");
      return false;
    }
  };

  const saveManualAnimals = async () => {
    const cleaned = manualAnimals
      .map((row) => ({
        ...row,
        breed: row.breed.trim(),
        notes: row.notes.trim(),
      }))
      .filter((row) => row.breed.length > 0);

    if (!cleaned.length) {
      markStepSaved("animals");
      return true;
    }

    try {
      for (const row of cleaned) {
        await api.post("/animals", {
          sex: row.sex,
          breed: row.breed,
          category: row.category,
          status: row.status,
          origin: row.origin,
          establishmentId: row.establishmentId || undefined,
          notes: row.notes || undefined,
        });
      }
      markStepSaved("animals");
      toast.success("Animales registrados");
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar animales");
      return false;
    }
  };

  const saveProducts = async () => {
    const cleaned = products.filter((product) => product.name.trim().length > 0);

    if (!cleaned.length) {
      markStepSaved("products");
      return true;
    }

    try {
      for (const product of cleaned) {
        const name = product.name.trim();

        if (!name) {
          toast.error("Completa los campos requeridos en medicamentos.");
          return false;
        }

        const vaccineTypes =
          product.type === "VACUNAS" ? parseVaccineTypes(product.vaccineTypes) : undefined;

        if (product.type === "VACUNAS" && (!vaccineTypes || vaccineTypes.length === 0)) {
          toast.error("Ingresa tipos de vacuna cuando el tipo es Vacunas.");
          return false;
        }

        await api.post("/products", {
          name,
          type: product.type || undefined,
          vaccineTypes,
          recommendedRoute: product.recommendedRoute,
          notes: product.notes.trim() || undefined,
        });
      }

      markStepSaved("products");
      toast.success("Medicamentos registrados");
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar medicamentos");
      return false;
    }
  };

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    let ok = false;

    if (currentStep.key === "establishments") {
      if (savedSteps.establishments) {
        ok = true;
      } else {
        ok = await saveEstablishments();
      }
    }

    if (currentStep.key === "animals") {
      if (savedSteps.animals) {
        ok = true;
      } else if (animalMode === "quick") {
        let quickOk = false;
        const submit = handleSubmit(async (values) => {
          quickOk = await saveQuickAnimals(values);
        });
        await submit();
        ok = quickOk;
      } else {
        ok = await saveManualAnimals();
      }
    }

    if (currentStep.key === "products") {
      if (savedSteps.products) {
        ok = true;
      } else {
        ok = await saveProducts();
      }
    }

    setSaving(false);
    if (!ok) return;

    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const updateManualAnimal = (index: number, field: keyof ManualAnimal, value: string) => {
    setManualAnimals((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const updateProduct = (index: number, field: keyof ProductEntry, value: string) => {
    setProducts((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  return (
    <ThemeShell className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-brand-700">
            <span>Paso {stepIndex + 1} de {steps.length}</span>
            <span className="h-1 w-1 rounded-full bg-brand-400" />
            <span>Configuracion inicial opcional</span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold">{currentStep.title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {currentStep.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {steps.map((step, index) => (
              <span
                key={step.key}
                className={`rounded-full border px-3 py-1 ${
                  index === stepIndex
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {step.title}
              </span>
            ))}
          </div>
        </header>

        {currentStep.key === "establishments" ? (
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Registro rapido</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Completa lo minimo para ubicar animales y movimientos.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Finca principal
                </label>
                <Input
                  placeholder="Ej: Finca Los Sauces"
                  value={fincaName}
                  onChange={(event) => setFincaName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Potreros (opcional)
                </label>
                {potreros.map((value, index) => (
                  <div key={`potrero-${index}`} className="flex items-center gap-2">
                    <Input
                      placeholder={`Potrero ${index + 1}`}
                      value={value}
                      onChange={(event) => {
                        const next = [...potreros];
                        next[index] = event.target.value;
                        setPotreros(next);
                      }}
                    />
                    {potreros.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setPotreros((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPotreros((prev) => [...prev, ""])}
                >
                  Agregar potrero
                </Button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Corral (opcional)
                </label>
                <Input
                  placeholder="Ej: Corral Principal"
                  value={corralName}
                  onChange={(event) => setCorralName(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {currentStep.key === "animals" ? (
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Registro rapido</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Elige la forma mas rapida de cargar animales iniciales.
              </p>
            </CardHeader>
            <CardContent>
              <Tabs value={animalMode} onValueChange={(value) => setAnimalMode(value as any)}>
                <TabsList>
                  <TabsTrigger value="quick">Por cantidad</TabsTrigger>
                  <TabsTrigger value="manual">Individual</TabsTrigger>
                </TabsList>

                <TabsContent value="quick">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400">
                        <span className="col-span-5">Categoria</span>
                        <span className="col-span-3">Sexo</span>
                        <span className="col-span-4 text-right">Cantidad</span>
                      </div>
                      {quickLines.map((line, index) => (
                        <div key={line.category} className="grid grid-cols-12 items-center gap-2">
                          <input type="hidden" {...register(`lines.${index}.category`)} />
                          <span className="col-span-5 text-sm text-slate-700 dark:text-slate-200">
                            {getAnimalCategoryLabel(line.category)}
                          </span>
                          {line.category === "TERNERO" ? (
                            <select
                              className="col-span-3 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                              {...register(`lines.${index}.sex`)}
                            >
                              {animalSexOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <input
                                type="hidden"
                                value={defaultSexByCategory[line.category] ?? "FEMALE"}
                                {...register(`lines.${index}.sex`)}
                              />
                              <div className="col-span-3 flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                                {(defaultSexByCategory[line.category] ?? "FEMALE") === "MALE"
                                  ? "Macho"
                                  : "Hembra"}
                              </div>
                            </>
                          )}
                          <Input
                            type="number"
                            min={0}
                            className="col-span-4 text-right"
                            {...register(`lines.${index}.count`, {
                              setValueAs: (value) => (value === "" ? 0 : Number(value)),
                            })}
                          />
                        </div>
                      ))}
                    </div>
                    {errors.lines ? (
                      <p className="text-xs text-red-500">{errors.lines.message as string}</p>
                    ) : null}
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="text-slate-500 dark:text-slate-400">Total a registrar</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{quickTotal}</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Raza</label>
                        <Input placeholder="Brahman o Mixto" {...register("breed")} />
                        {errors.breed ? (
                          <p className="text-xs text-red-500">{errors.breed.message}</p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Fecha nacimiento</label>
                        <Input type="date" {...register("birthDate")} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Origen</label>
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                          {...register("origin")}
                        >
                          {animalOriginOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Estado</label>
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                          {...register("status")}
                        >
                          {animalStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Establecimiento</label>
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                          {...register("establishmentId")}
                        >
                          <option value="">Sin asignar</option>
                          {locationOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 md:col-span-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300 dark:border-slate-600"
                          {...register("birthEstimated")}
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-300">Fecha estimada</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Notas</label>
                      <textarea
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                        placeholder="Observaciones generales"
                        {...register("notes")}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="manual">
                  <div className="space-y-4">
                    {manualAnimals.map((animal, index) => (
                      <div
                        key={`manual-${index}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/70"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Animal {index + 1}
                          </p>
                          {manualAnimals.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                setManualAnimals((prev) => prev.filter((_, i) => i !== index))
                              }
                            >
                              Quitar
                            </Button>
                          ) : null}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Categoria</label>
                            <select
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              value={animal.category}
                              onChange={(event) =>
                                updateManualAnimal(index, "category", event.target.value)
                              }
                            >
                              {animalCategoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Sexo</label>
                            <select
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              value={animal.sex}
                              onChange={(event) =>
                                updateManualAnimal(index, "sex", event.target.value)
                              }
                            >
                              {animalSexOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Raza</label>
                            <Input
                              placeholder="Brahman"
                              value={animal.breed}
                              onChange={(event) =>
                                updateManualAnimal(index, "breed", event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Origen</label>
                            <select
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              value={animal.origin}
                              onChange={(event) =>
                                updateManualAnimal(index, "origin", event.target.value)
                              }
                            >
                              {animalOriginOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Estado</label>
                            <select
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              value={animal.status}
                              onChange={(event) =>
                                updateManualAnimal(index, "status", event.target.value)
                              }
                            >
                              {animalStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Establecimiento</label>
                            <select
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              value={animal.establishmentId}
                              onChange={(event) =>
                                updateManualAnimal(index, "establishmentId", event.target.value)
                              }
                            >
                              <option value="">Sin asignar</option>
                              {locationOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Notas</label>
                            <textarea
                              className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                              placeholder="Observaciones"
                              value={animal.notes}
                              onChange={(event) =>
                                updateManualAnimal(index, "notes", event.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setManualAnimals((prev) => [...prev, createManualAnimal()])}
                    >
                      Agregar animal
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : null}

        {currentStep.key === "products" ? (
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Medicamentos base</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Registra los productos mas usados para empezar a cargar tratamientos.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.map((product, index) => (
                <div
                  key={`product-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Medicamento {index + 1}
                    </p>
                    {products.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setProducts((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Nombre</label>
                      <Input
                        placeholder="Ej: Ivermectina"
                        value={product.name}
                        onChange={(event) => updateProduct(index, "name", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Tipo (opcional)</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        value={product.type}
                        onChange={(event) => updateProduct(index, "type", event.target.value)}
                      >
                        <option value="">Sin tipo</option>
                        {productTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {product.type === "VACUNAS" ? (
                      <div className="space-y-1 text-sm md:col-span-2">
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          Tipos de vacuna (separados por coma)
                        </label>
                        <Input
                          placeholder="Ej: clostridiales, aftosa"
                          value={product.vaccineTypes}
                          onChange={(event) =>
                            updateProduct(index, "vaccineTypes", event.target.value)
                          }
                        />
                      </div>
                    ) : null}
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Via recomendada
                      </label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        value={product.recommendedRoute}
                        onChange={(event) =>
                          updateProduct(index, "recommendedRoute", event.target.value)
                        }
                      >
                        <option value="subcutanea">Subcutanea</option>
                        <option value="intramuscular">Intramuscular</option>
                      </select>
                    </div>
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Notas (opcional)
                      </label>
                      <textarea
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                        placeholder="Observaciones adicionales"
                        value={product.notes}
                        onChange={(event) => updateProduct(index, "notes", event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setProducts((prev) => [...prev, createProductEntry()])}
              >
                Agregar medicamento
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
              >
                Volver
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={handleSkip}>
              Saltar por ahora
            </Button>
          </div>
          <Button type="button" onClick={handleContinue} disabled={saving}>
            {saving
              ? "Guardando..."
              : stepIndex === steps.length - 1
              ? "Guardar y finalizar"
              : "Guardar y continuar"}
          </Button>
        </div>
      </div>
    </ThemeShell>
  );
};

export default OnboardingPage;
