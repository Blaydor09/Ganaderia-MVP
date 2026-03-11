import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Leaf,
  MapPinned,
  ShieldCheck,
  Stethoscope,
  Users2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import logo from "@/assets/logo_system.png";

type BadgeVariant = "default" | "success" | "warning" | "danger";

type NavItem = {
  href: string;
  label: string;
};

type PulseItem = {
  label: string;
  current: number;
  total: number;
  helper: string;
};

type LandingSectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

const navItems: NavItem[] = [
  { href: "#solucion", label: "Solucion" },
  { href: "#roles", label: "Roles" },
  { href: "#flujo", label: "Flujo operativo" },
  { href: "#cumplimiento", label: "Cumplimiento" },
  { href: "#faq", label: "FAQ" },
];

const heroBadges: { label: string; variant: BadgeVariant }[] = [
  { label: "Retiro automatico por lote", variant: "warning" },
  { label: "Inventario sanitario en tiempo real", variant: "success" },
  { label: "Auditoria con evidencia exportable", variant: "default" },
];

const heroSnapshot = [
  {
    title: "Animales con seguimiento activo",
    value: "1,248",
    detail: "6 establecimientos conectados en un solo tablero.",
  },
  {
    title: "Eventos sanitarios de la semana",
    value: "42",
    detail: "Aplicaciones, revisiones y controles documentados.",
  },
  {
    title: "Alertas criticas pendientes",
    value: "5",
    detail: "Stock minimo y lotes por vencer con prioridad alta.",
  },
];

const pulseItems: PulseItem[] = [
  {
    label: "Lotes con retiro activo",
    current: 18,
    total: 22,
    helper: "81% bloqueado segun protocolo sanitario.",
  },
  {
    label: "Stock sobre minimo operativo",
    current: 74,
    total: 90,
    helper: "16 lotes requieren reposicion planificada.",
  },
  {
    label: "Eventos con trazabilidad completa",
    current: 97,
    total: 100,
    helper: "Solo 3 registros pendientes de cierre documental.",
  },
];

const outcomes = [
  {
    title: "Reducir riesgo regulatorio",
    description:
      "Cada aplicacion queda vinculada a lote, responsable, retiro y establecimiento.",
    icon: ShieldCheck,
    points: [
      "Bloqueos automaticos para venta o faena durante retiro.",
      "Historial completo por animal y por establecimiento.",
    ],
  },
  {
    title: "Evitar quiebres de stock sanitario",
    description:
      "Inventario por lote con alertas de minimo y vencimiento antes de que afecte la operacion.",
    icon: Boxes,
    points: [
      "Visibilidad diaria de consumo por producto.",
      "Prioridad de compra basada en riesgo y vencimiento.",
    ],
  },
  {
    title: "Acelerar decisiones de campo",
    description:
      "Reportes operativos y sanitarios listos para reunion tecnica o auditoria interna.",
    icon: BarChart3,
    points: [
      "Resumen ejecutivo por rol y establecimiento.",
      "Exportacion rapida para inspeccion o comite tecnico.",
    ],
  },
];

const roleCards = [
  {
    role: "Gerencia y direccion tecnica",
    focus: "Controla riesgo, costo y cumplimiento desde una sola vista.",
    icon: Building2,
    signals: [
      "Indicadores sanitarios consolidados por unidad productiva.",
      "Estado de retiros y alertas criticas en tiempo real.",
      "Reporte ejecutivo para seguimiento semanal.",
    ],
  },
  {
    role: "Veterinaria y calidad",
    focus: "Define protocolos y valida ejecucion con evidencia trazable.",
    icon: Stethoscope,
    signals: [
      "Prescripcion y aplicacion vinculadas al historial del animal.",
      "Retiro automatico de carne o leche por producto aplicado.",
      "Bitacora auditable para inspeccion sanitaria.",
    ],
  },
  {
    role: "Operaciones e inventario",
    focus: "Ejecuta tareas con menos friccion y menos errores de captura.",
    icon: Users2,
    signals: [
      "Carga guiada de eventos, movimientos y tratamientos.",
      "Control de stock por lote con trazabilidad de ajustes.",
      "Alertas operativas para priorizar el trabajo diario.",
    ],
  },
];

const workflowSteps = [
  {
    title: "Diagnostico del flujo actual",
    description:
      "Mapeamos como registran animales, tratamientos, compras y retiros hoy.",
  },
  {
    title: "Configuracion por establecimiento y roles",
    description:
      "Se define acceso por perfil y estructura de finca, potreros y bodega.",
  },
  {
    title: "Carga inicial con plantillas",
    description:
      "Importacion de animales y catalogo sanitario para iniciar operacion sin frenar campo.",
  },
  {
    title: "Operacion diaria con alertas",
    description:
      "El equipo registra eventos y recibe avisos para actuar antes de un desvio.",
  },
  {
    title: "Seguimiento y mejora continua",
    description:
      "Comites semanales con reportes para ajustar protocolos y reposicion.",
  },
];

const modules = [
  "Animales y ficha sanitaria",
  "Eventos productivos",
  "Tratamientos",
  "Inventario por lote",
  "Movimientos internos y externos",
  "Alertas y tareas",
  "Reportes operativos",
  "Auditoria por usuario",
];

const auditMatrix = [
  {
    control: "Retiro por aplicacion",
    evidence: "Bloqueo sanitario + fecha de liberacion",
    owner: "Veterinaria",
  },
  {
    control: "Stock y vencimiento",
    evidence: "Lote, saldo y alerta de criticidad",
    owner: "Inventario",
  },
  {
    control: "Movimiento de animales",
    evidence: "Origen, destino y responsable",
    owner: "Operaciones",
  },
  {
    control: "Cambios de datos sensibles",
    evidence: "Auditoria con usuario y timestamp",
    owner: "Administracion",
  },
];

const faqItems = [
  {
    question: "Sirve para varias fincas y potreros en paralelo?",
    answer:
      "Si. La estructura por establecimiento permite separar y consolidar informacion en una misma cuenta.",
  },
  {
    question: "Como se controla el retiro de carne o leche?",
    answer:
      "Cada aplicacion calcula retiro por lote y mantiene bloqueo operativo hasta su liberacion.",
  },
  {
    question: "El equipo puede trabajar con permisos diferentes?",
    answer:
      "Si. Incluye roles por perfil y registro de acciones para trazabilidad interna.",
  },
  {
    question: "Se puede empezar con datos actuales?",
    answer:
      "Si. Incluye importacion CSV para animales y carga asistida para catalogo sanitario.",
  },
];

const LandingSectionHeading = ({
  eyebrow,
  title,
  description,
}: LandingSectionHeadingProps) => (
  <div className="space-y-3">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
      {eyebrow}
    </p>
    <h2 className="font-display text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
      {title}
    </h2>
    <p className="max-w-2xl text-base text-slate-600">{description}</p>
  </div>
);

const PulseBar = ({ label, current, total, helper }: PulseItem) => {
  const progress = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium text-slate-700">{label}</p>
        <p className="font-semibold text-brand-700">{progress}%</p>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className="landing-meter h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
  );
};

const LandingPage = () => {
  return (
    <div className="landing-shell relative isolate overflow-hidden text-slate-900">
      <div className="landing-grid-overlay pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-brand-200/70 blur-3xl" />
      <div className="pointer-events-none absolute top-72 -left-20 h-96 w-96 rounded-full bg-amber-100/70 blur-3xl" />

      <header className="relative z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
              <img
                src={logo}
                alt="Inventario Ganaderia"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Inventario Ganaderia
              </p>
              <p className="font-display text-lg font-semibold text-slate-900">
                Salud e inventario bovino
              </p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-6 text-sm text-slate-600 lg:flex"
            aria-label="Navegacion principal de la landing"
          >
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-slate-900">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <a href="#contacto" className="inline-flex items-center gap-2">
                Solicitar demo
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
              <Leaf className="h-3.5 w-3.5" />
              Plataforma B2B para operaciones agro sanitarias
            </div>

            <div className="space-y-4">
              <h1 className="font-display text-4xl font-semibold leading-tight text-slate-900 md:text-5xl xl:text-6xl">
                Control sanitario verificable y stock sin sorpresas para equipos de campo.
              </h1>
              <p className="max-w-2xl text-base text-slate-600 md:text-lg">
                Centraliza animales, tratamientos, inventario por lote y retiros automaticos
                en un flujo unico. Disenado para convertir datos operativos en decisiones
                rapidas y defendibles.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {heroBadges.map((item) => (
                <Badge key={item.label} variant={item.variant}>
                  {item.label}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#contacto" className="inline-flex items-center gap-2">
                  Quiero una demo guiada
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Ver la plataforma</Link>
              </Button>
            </div>

            <ul className="grid gap-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-brand-700" />
                Implementacion por fases sin detener la operacion.
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-brand-700" />
                Roles por area para reducir errores de captura.
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-brand-700" />
                Evidencia lista para auditoria sanitaria.
              </li>
            </ul>
          </div>

          <Card className="landing-panel border-slate-200/90">
            <CardHeader className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Resumen operativo
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
                    Estado sanitario y de inventario en una sola pantalla
                  </h3>
                </div>
                <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Operacion activa
                </div>
              </div>

              <div className="grid gap-3">
                {heroSnapshot.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {item.title}
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold text-slate-900">
                      {item.value}
                    </p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Semaforo de control
              </p>
              {pulseItems.map((item) => (
                <PulseBar key={item.label} {...item} />
              ))}
            </CardContent>
          </Card>
        </section>

        <section id="solucion" className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <LandingSectionHeading
            eyebrow="Propuesta de valor"
            title="Una capa operativa para alinear sanidad, inventario y auditoria."
            description="La plataforma transforma registros dispersos en controles accionables. Menos riesgo sanitario, menos perdida de stock y mas capacidad de respuesta frente a inspecciones."
          />

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {outcomes.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="border-slate-200/90 bg-white/90 animate-[fade-up_0.45s_ease-out]"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <CardHeader className="space-y-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-display text-xl font-semibold text-slate-900">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 pt-0 text-sm text-slate-600">
                    {item.points.map((point) => (
                      <p key={point} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                        {point}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <LandingSectionHeading
            eyebrow="Jerarquia de mensajes"
            title="Cada rol ve lo que necesita para actuar con velocidad."
            description="Disenada para equipos multidisciplinarios: direccion tecnica, veterinaria y operaciones trabajan sobre la misma base, con vistas y responsabilidades separadas."
          />

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {roleCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.role}
                  className="border-slate-200/90 bg-white/90 animate-[fade-up_0.45s_ease-out]"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <CardHeader className="space-y-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-display text-xl font-semibold text-slate-900">
                        {item.role}
                      </h3>
                      <p className="text-sm text-slate-600">{item.focus}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {item.signals.map((signal) => (
                      <p key={signal} className="flex items-start gap-2 text-sm text-slate-600">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                        {signal}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="flujo" className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-6">
              <LandingSectionHeading
                eyebrow="Ritmo operativo"
                title="Del diagnostico al seguimiento semanal, sin pasos sueltos."
                description="El despliegue combina configuracion tecnica y adopcion en campo para que la plataforma genere valor desde la primera semana de uso real."
              />

              <div className="space-y-3 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-soft">
                {workflowSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="text-sm text-slate-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-slate-200/90 bg-gradient-to-b from-white via-white to-brand-50/60">
              <CardHeader className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Cobertura funcional
                </p>
                <h3 className="font-display text-2xl font-semibold text-slate-900">
                  Modulos conectados para operacion diaria y control sanitario
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {modules.map((module) => (
                    <span
                      key={module}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {module}
                    </span>
                  ))}
                </div>
                <div className="space-y-2 rounded-2xl border border-brand-100 bg-white/90 p-4 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <MapPinned className="h-4 w-4 text-brand-700" />
                    Estructura por finca y potreros operativos.
                  </p>
                  <p className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-brand-700" />
                    Checklist operativo para equipos de campo.
                  </p>
                  <p className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-brand-700" />
                    Evidencia lista para auditoria y comite tecnico.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="cumplimiento" className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <LandingSectionHeading
                eyebrow="Cumplimiento y seguridad"
                title="Controles que resisten auditorias internas y externas."
                description="No es solo captura de datos. Es una estructura de control con roles, bitacora y evidencia para responder rapido cuando hay inspeccion."
              />
              <div className="grid gap-3 rounded-3xl border border-slate-200/90 bg-white/85 p-5">
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  Roles por perfil: administracion, veterinaria, operador y auditor.
                </p>
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  Bitacora de acciones sensibles con responsable y fecha.
                </p>
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  Exportaciones para inspeccion sanitaria y seguimiento gerencial.
                </p>
              </div>
            </div>

            <Card className="border-slate-200/90 bg-white/90">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Matriz de evidencia
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-slate-900">
                  Que se controla y quien responde
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {auditMatrix.map((item) => (
                  <div
                    key={item.control}
                    className="grid gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3 text-sm"
                  >
                    <p className="font-semibold text-slate-900">{item.control}</p>
                    <p className="text-slate-600">{item.evidence}</p>
                    <p className="text-xs uppercase tracking-wide text-brand-700">
                      Responsable: {item.owner}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <LandingSectionHeading
            eyebrow="FAQ"
            title="Preguntas frecuentes antes de una demo."
            description="Respuestas cortas para validar alcance tecnico y operativo."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 shadow-soft"
              >
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="contacto" className="mx-auto max-w-6xl px-6 py-16">
          <Card className="overflow-hidden border-slate-200/90 bg-gradient-to-r from-brand-50 via-white to-white">
            <CardContent className="p-6 lg:p-10">
              <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                <div className="space-y-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                    Conversion
                  </p>
                  <h2 className="font-display text-3xl font-semibold text-slate-900">
                    Agenda una demo de 30 minutos con tu flujo real.
                  </h2>
                  <p className="text-sm text-slate-600">
                    Revisamos estructura de establecimientos, protocolos sanitarios y control
                    de inventario para proponerte un plan de implementacion por etapas.
                  </p>
                  <div className="grid gap-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Respuesta inicial en 24-48 horas habiles.
                    </p>
                    <p className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-brand-700" />
                      Alcance definido por rol y por establecimiento.
                    </p>
                    <p className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-brand-700" />
                      Entregable con prioridades operativas y sanitarias.
                    </p>
                  </div>
                </div>

                <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft md:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                      htmlFor="landing-name"
                    >
                      Nombre completo
                    </label>
                    <input
                      id="landing-name"
                      type="text"
                      placeholder="Nombre y apellido"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                      htmlFor="landing-company"
                    >
                      Empresa o finca
                    </label>
                    <input
                      id="landing-company"
                      type="text"
                      placeholder="Nombre comercial"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                      htmlFor="landing-email"
                    >
                      Email corporativo
                    </label>
                    <input
                      id="landing-email"
                      type="email"
                      placeholder="equipo@empresa.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                      htmlFor="landing-phone"
                    >
                      Telefono o WhatsApp
                    </label>
                    <input
                      id="landing-phone"
                      type="tel"
                      placeholder="+52 55 0000 0000"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                      htmlFor="landing-size"
                    >
                      Tamano de operacion
                    </label>
                    <select
                      id="landing-size"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Seleccionar rango
                      </option>
                      <option>1 a 100 animales</option>
                      <option>101 a 300 animales</option>
                      <option>301 a 700 animales</option>
                      <option>Mas de 700 animales</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                      htmlFor="landing-goal"
                    >
                      Objetivo prioritario
                    </label>
                    <textarea
                      id="landing-goal"
                      rows={4}
                      placeholder="Ej: reducir desorden en tratamientos y controlar vencimientos por lote."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
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
                      Formulario de muestra. No envia datos en esta version.
                    </span>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/80 py-8">
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
              Inventario Ganaderia - Plataforma de control sanitario bovino.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <a href="#solucion" className="transition hover:text-slate-900">
              Solucion
            </a>
            <a href="#flujo" className="transition hover:text-slate-900">
              Flujo operativo
            </a>
            <a href="#contacto" className="transition hover:text-slate-900">
              Solicitar demo
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

