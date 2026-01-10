import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle,
  ClipboardList,
  FileCheck,
  Leaf,
  LineChart,
  MapPinned,
  PawPrint,
  Pill,
  ScanSearch,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import logo from "@/assets/logo.png";

const heroBadges = [
  { label: "Retiros automaticos", variant: "warning" as const },
  { label: "Inventario por lote", variant: "success" as const },
  { label: "Auditoria y roles", variant: "default" as const },
];

const benefits = [
  {
    title: "Cumplimiento sanitario sin friccion",
    description:
      "Retiros automaticos de carne y leche, con alertas claras y trazabilidad por lote.",
    icon: ShieldCheck,
  },
  {
    title: "Menos perdidas de stock",
    description:
      "Vencimientos y stock minimo visibles por producto para compras oportunas.",
    icon: AlertTriangle,
  },
  {
    title: "Operacion mas rapida",
    description:
      "Registro guiado de animales, eventos, tratamientos y movimientos en minutos.",
    icon: CheckCircle,
  },
  {
    title: "Datos listos para auditoria",
    description: "Bitacora completa y reportes exportables para inspecciones.",
    icon: FileCheck,
  },
];

const modules = [
  {
    title: "Animales",
    description: "Ficha individual, categoria, estado, origen y documentos.",
    icon: PawPrint,
  },
  {
    title: "Eventos",
    description: "Peso, nacimiento, celo, preñez, parto y observaciones.",
    icon: ClipboardList,
  },
  {
    title: "Tratamientos",
    description: "Diagnostico, veterinario, aplicaciones y retiros.",
    icon: Stethoscope,
  },
  {
    title: "Medicamentos",
    description: "Catalogo de productos con dosis, vias y periodos.",
    icon: Pill,
  },
  {
    title: "Inventario y lotes",
    description: "Stock por lote, vencimientos y ajustes controlados.",
    icon: Boxes,
  },
  {
    title: "Movimientos",
    description: "Traslados internos o externos con ubicacion origen y destino.",
    icon: MapPinned,
  },
  {
    title: "Reportes",
    description: "Consumo, retiros, inventario y pesajes por periodo.",
    icon: BarChart3,
  },
  {
    title: "Alertas y tareas",
    description: "Recordatorios operativos y vencimientos criticos.",
    icon: AlertTriangle,
  },
  {
    title: "Auditoria y roles",
    description: "Accesos por perfil y cambios registrados.",
    icon: Users,
  },
  {
    title: "Busqueda global",
    description: "Encuentra aretes, animales, lotes y productos al instante.",
    icon: ScanSearch,
  },
];

const workflow = [
  {
    title: "Registro del animal",
    description: "Crea ficha, asigna categoria y ubicacion inicial.",
  },
  {
    title: "Lote y stock",
    description: "Crea productos y lotes con cantidades reales.",
  },
  {
    title: "Tratamiento y aplicacion",
    description: "Registra diagnostico y aplica dosis por lote.",
  },
  {
    title: "Retiro automatico",
    description: "Bloqueo sanitario activo hasta cumplir plazos.",
  },
  {
    title: "Reporte operativo",
    description: "Analiza consumo, movimientos y estado sanitario.",
  },
];

const categoryData = [
  { name: "Ternero", value: 38 },
  { name: "Vaquilla", value: 22 },
  { name: "Vaca", value: 45 },
  { name: "Toro", value: 9 },
  { name: "Torillo", value: 14 },
];

const lifecycleData = [
  { month: "Ene", births: 12, deaths: 2, sales: 4 },
  { month: "Feb", births: 9, deaths: 1, sales: 5 },
  { month: "Mar", births: 15, deaths: 3, sales: 6 },
  { month: "Abr", births: 11, deaths: 2, sales: 3 },
  { month: "May", births: 18, deaths: 4, sales: 7 },
  { month: "Jun", births: 14, deaths: 2, sales: 5 },
];

const stockData = [
  { name: "Ivermectina", stock: 180, min: 50 },
  { name: "Oxitetra", stock: 120, min: 40 },
  { name: "Vitaminas", stock: 90, min: 30 },
  { name: "Antiparasitario", stock: 70, min: 25 },
];

const testimonials = [
  {
    quote:
      "Pasamos de registros en papel a tener inventario por lote y retiros claros. La auditoria es inmediata.",
    name: "Rosa M.",
    role: "Administradora de finca",
  },
  {
    quote:
      "El flujo de tratamientos y eventos reduce errores y nos deja el historial completo del animal.",
    name: "Dr. Luis R.",
    role: "Veterinario",
  },
  {
    quote:
      "Los reportes de consumo y stock minimo nos ayudan a comprar con tiempo y evitar quiebres.",
    name: "Marcos G.",
    role: "Jefe de inventario",
  },
];

const faqs = [
  {
    question: "Puedo usarlo en varias fincas y potreros?",
    answer:
      "Si, los establecimientos se organizan por finca, potrero y corral con conteos automaticos.",
  },
  {
    question: "Incluye control de retiros de carne y leche?",
    answer:
      "Si, cada aplicacion calcula el retiro automaticamente y bloquea ventas o faena.",
  },
  {
    question: "Se puede importar o exportar datos?",
    answer:
      "Incluye importacion CSV para animales y exportaciones desde tablas operativas.",
  },
  {
    question: "Como se maneja el acceso del equipo?",
    answer:
      "Usa roles predefinidos (admin, veterinario, operador, auditor) y auditoria.",
  },
];

const heroChart = [
  { day: "Lun", value: 6 },
  { day: "Mar", value: 9 },
  { day: "Mie", value: 7 },
  { day: "Jue", value: 11 },
  { day: "Vie", value: 8 },
  { day: "Sab", value: 5 },
  { day: "Dom", value: 10 },
];

const chartColors = ["#4d7d66", "#6e9a86", "#97b7a8", "#8a9a8b", "#c2d3cb"];

const LandingPage = () => {
  return (
    <div className="relative overflow-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-brand-100 opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-24 h-80 w-80 rounded-full bg-amber-100 opacity-70 blur-3xl" />

      <header className="relative z-10 border-b border-slate-200/70 bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
              <img
                src={logo}
                alt="Inventario Ganaderia"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Inventario Ganaderia
              </p>
              <p className="font-display text-lg font-semibold">Control sanitario</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 lg:flex">
            <a className="hover:text-slate-900" href="#features">
              Caracteristicas
            </a>
            <a className="hover:text-slate-900" href="#modules">
              Modulos
            </a>
            <a className="hover:text-slate-900" href="#analytics">
              Reportes
            </a>
            <a className="hover:text-slate-900" href="#security">
              Seguridad
            </a>
            <a className="hover:text-slate-900" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <a href="#contact">Solicitar demo</a>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
            Trazabilidad sanitaria y control de stock en un solo lugar
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight md:text-5xl">
            Inventario ganadero listo para auditoria y operaciones diarias
          </h1>
          <p className="text-base text-slate-600 md:text-lg">
            Registra animales, eventos y tratamientos con inventario por lote,
            retiros automaticos y reportes claros para decisiones rapidas.
          </p>
          <div className="flex flex-wrap gap-2">
            {heroBadges.map((badge) => (
              <Badge key={badge.label} variant={badge.variant}>
                {badge.label}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="#contact">Solicitar demo</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Ver plataforma</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Leaf className="h-4 w-4 text-brand-600" />
            Operacion diaria mas segura y sustentable.
          </div>
        </div>
        <div className="flex-1">
          <Card className="animate-[fade-up_0.6s_ease-out]">
            <CardHeader className="space-y-2">
              <p className="text-xs text-slate-500">Dashboard operativo</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-xl font-semibold">Animales activos</p>
                  <p className="text-2xl font-semibold text-brand-700">128</p>
                </div>
                <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                  +6.4% semana
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Retiros activos</p>
                  <p className="text-lg font-semibold text-slate-900">7</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Alertas inventario</p>
                  <p className="text-lg font-semibold text-slate-900">4</p>
                </div>
              </div>
              <div className="h-40 rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Tratamientos 7 dias</p>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={heroChart}>
                      <defs>
                        <linearGradient id="hero" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4d7d66" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#4d7d66" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#4d7d66"
                        fill="url(#hero)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-brand-600" />
                  Reportes de consumo y pesajes
                </div>
                <div className="flex items-center gap-2">
                  <ScanSearch className="h-4 w-4 text-brand-600" />
                  Busqueda global por arete y lote
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-brand-700">
              Beneficios principales
            </p>
            <h2 className="font-display text-3xl font-semibold">
              Control sanitario, inventario y trazabilidad en tiempo real
            </h2>
            <p className="text-slate-600">
              Diseñado para operaciones ganaderas que necesitan orden,
              cumplimiento y decisiones con datos confiables.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
            <ShieldCheck className="h-4 w-4 text-brand-700" />
            RBAC, auditoria y reportes listos para inspeccion.
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="animate-[fade-up_0.6s_ease-out]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <CardHeader className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-brand-700">Modulos</p>
          <h2 className="font-display text-3xl font-semibold">
            Todo el flujo ganadero en una sola plataforma
          </h2>
          <p className="text-slate-600">
            Desde el registro del animal hasta el reporte de consumo y retiros.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="animate-[fade-up_0.6s_ease-out]"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <CardHeader className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-wide text-brand-700">
              Flujo de trabajo
            </p>
            <h2 className="font-display text-3xl font-semibold">
              Operacion guiada para equipos de campo y clinica
            </h2>
            <p className="text-slate-600">
              Un recorrido claro desde el registro hasta la toma de decisiones.
            </p>
            <div className="grid gap-4">
              {workflow.map((step, index) => (
                <div key={step.title} className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{step.title}</p>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card className="bg-gradient-to-br from-white via-white to-brand-50">
            <CardHeader>
              <p className="text-xs text-slate-500">Vista rapida</p>
              <p className="font-display text-xl font-semibold">
                Trazabilidad por establecimiento
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span>Finca Central</span>
                <span className="text-brand-700">128 animales</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span>Potrero Norte</span>
                <span className="text-brand-700">48 animales</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span>Corral Principal</span>
                <span className="text-brand-700">32 animales</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPinned className="h-4 w-4 text-brand-600" />
                Movimientos internos y externos en un solo lugar.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="analytics" className="mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-brand-700">Analitica</p>
          <h2 className="font-display text-3xl font-semibold">
            Reportes listos para decisiones diarias
          </h2>
          <p className="text-slate-600">Datos de ejemplo para mostrar el potencial.</p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500">Distribucion por categoria</p>
              <p className="font-display text-lg font-semibold">Animales activos</p>
            </CardHeader>
            <CardContent className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cat-${entry.name}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <p className="text-xs text-slate-500">Nacimientos vs muertes vs ventas</p>
              <p className="font-display text-lg font-semibold">Ultimos 6 meses</p>
            </CardHeader>
            <CardContent className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lifecycleData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="births" name="Nacimientos" fill="#4d7d66" />
                  <Bar dataKey="deaths" name="Muertes" fill="#b91c1c" />
                  <Bar dataKey="sales" name="Ventas" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6">
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500">Stock total vs minimo</p>
              <p className="font-display text-lg font-semibold">Productos criticos</p>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="stock" name="Stock" fill="#2563eb" />
                  <Bar dataKey="min" name="Minimo" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="security" className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-wide text-brand-700">
              Seguridad y cumplimiento
            </p>
            <h2 className="font-display text-3xl font-semibold">
              Auditoria completa con roles y trazabilidad
            </h2>
            <p className="text-slate-600">
              Diseñado para inspecciones y controles internos sin perder velocidad.
            </p>
            <div className="grid gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-700" />
                Roles predefinidos para admin, veterinario, operador y auditor.
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-brand-700" />
                Auditoria de cambios criticos y exportacion de reportes.
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-brand-700" />
                Historial sanitario por animal con eventos y tratamientos.
              </div>
            </div>
          </div>
          <Card>
            <CardHeader className="space-y-2">
              <p className="text-xs text-slate-500">Checklist operativo</p>
              <p className="font-display text-xl font-semibold">
                Controles listos para auditoria
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
                Retiros activos calculados automaticamente por lote.
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
                Movimientos registrados con origen y destino.
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
                Alertas de vencimiento y stock minimo visibles.
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
                Reportes exportables para inspeccion y control interno.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-brand-700">Casos de uso</p>
          <h2 className="font-display text-3xl font-semibold">
            Equipos que ya trabajan con mas claridad
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <Card key={item.name}>
              <CardHeader className="space-y-4">
                <p className="text-sm text-slate-600">"{item.quote}"</p>
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.role}</p>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-brand-700">FAQ</p>
          <h2 className="font-display text-3xl font-semibold">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {faqs.map((item) => (
            <details
              key={item.question}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft"
            >
              <summary className="cursor-pointer text-sm font-medium text-slate-900">
                {item.question}
              </summary>
              <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-6xl px-6 py-16">
        <Card className="bg-gradient-to-r from-brand-50 via-white to-white">
          <CardHeader className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-brand-700">
              Solicitar demo
            </p>
            <h2 className="font-display text-3xl font-semibold">
              Listo para ordenar tu inventario ganadero?
            </h2>
            <p className="text-sm text-slate-600">
              Completa el formulario y te contactamos para una demo personalizada.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600" htmlFor="demo-name">
                  Nombre
                </label>
                <input
                  type="text"
                  id="demo-name"
                  placeholder="Nombre y apellido"
                  className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600" htmlFor="demo-email">
                  Email
                </label>
                <input
                  type="email"
                  id="demo-email"
                  placeholder="correo@empresa.com"
                  className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-600" htmlFor="demo-msg">
                  Mensaje
                </label>
                <textarea
                  rows={4}
                  id="demo-msg"
                  placeholder="Cuantas fincas y animales gestionas?"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <Button type="button" size="lg">
                  Enviar solicitud
                </Button>
                <Button type="button" size="lg" variant="outline" asChild>
                  <Link to="/login">Entrar al sistema</Link>
                </Button>
                <span className="text-xs text-slate-500">
                  Frontend demo, sin envio real.
                </span>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-slate-200/70 bg-white/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-white">
              <img
                src={logo}
                alt="Inventario Ganaderia"
                className="h-full w-full object-contain"
              />
            </div>
            <p className="text-sm text-slate-600">
              Inventario Ganaderia - Operacion y salud bovina.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-900">
              Caracteristicas
            </a>
            <a href="#modules" className="hover:text-slate-900">
              Modulos
            </a>
            <a href="#contact" className="hover:text-slate-900">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
