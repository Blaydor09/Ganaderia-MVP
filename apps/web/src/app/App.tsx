import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeShell } from "@/components/layout/ThemeProvider";
import { hasAnyRole, isAuthenticated } from "@/lib/auth";
import type { Role } from "@/lib/auth";
import { Access } from "@/lib/access";

const LoginPage = lazy(() => import("@/app/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/app/pages/RegisterPage"));
const LandingPage = lazy(() => import("@/app/pages/LandingPage"));
const DashboardPage = lazy(() => import("@/app/pages/DashboardPage"));
const AnimalsPage = lazy(() => import("@/app/pages/AnimalsPage"));
const AnimalCreatePage = lazy(() => import("@/app/pages/AnimalCreatePage"));
const AnimalsQuickCreatePage = lazy(() => import("@/app/pages/AnimalsQuickCreatePage"));
const AnimalDetailPage = lazy(() => import("@/app/pages/AnimalDetailPage"));
const AnimalPrintPage = lazy(() => import("@/app/pages/AnimalPrintPage"));
const AnimalsImportPage = lazy(() => import("@/app/pages/AnimalsImportPage"));
const EventsPage = lazy(() => import("@/app/pages/EventsPage"));
const ProductsPage = lazy(() => import("@/app/pages/ProductsPage"));
const BatchesPage = lazy(() => import("@/app/pages/BatchesPage"));
const InventoryPage = lazy(() => import("@/app/pages/InventoryPage"));
const TreatmentsPage = lazy(() => import("@/app/pages/TreatmentsPage"));
const WithdrawalsPage = lazy(() => import("@/app/pages/WithdrawalsPage"));
const ReportsPage = lazy(() => import("@/app/pages/ReportsPage"));
const AlertsPage = lazy(() => import("@/app/pages/AlertsPage"));
const TasksPage = lazy(() => import("@/app/pages/TasksPage"));
const MovementsPage = lazy(() => import("@/app/pages/MovementsPage"));
const EstablishmentsPage = lazy(() => import("@/app/pages/EstablishmentsPage"));
const UsersPage = lazy(() => import("@/app/pages/UsersPage"));
const AuditPage = lazy(() => import("@/app/pages/AuditPage"));
const SettingsPage = lazy(() => import("@/app/pages/SettingsPage"));
const AccessDeniedPage = lazy(() => import("@/app/pages/AccessDeniedPage"));
const OnboardingPage = lazy(() => import("@/app/pages/OnboardingPage"));

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const RedirectIfAuth = ({ children }: { children: JSX.Element }) => {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const RequireRole = ({
  allowed,
  children,
}: {
  allowed: Role[];
  children: JSX.Element;
}) => {
  if (!hasAnyRole(allowed)) {
    return <AccessDeniedPage />;
  }
  return children;
};

const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <ThemeShell className="relative flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <Sidebar />
    <div className="flex flex-1 flex-col">
      <Topbar />
      <main className="flex-1 px-4 py-5 pb-20 md:px-6 lg:pb-6">{children}</main>
    </div>
    <MobileNav />
  </ThemeShell>
);

const HomeRoute = () => {
  if (!isAuthenticated()) {
    return <LandingPage />;
  }
  return (
    <DashboardLayout>
      <RequireRole allowed={Access.dashboard}>
        <DashboardPage />
      </RequireRole>
    </DashboardLayout>
  );
};

const AppFallback = () => (
  <div className="grid min-h-screen place-items-center text-sm text-slate-500 dark:text-slate-400">
    Cargando...
  </div>
);

const App = () => (
  <Suspense fallback={<AppFallback />}>
    <Routes>
      <Route
        path="/landing"
        element={
          <RedirectIfAuth>
            <LandingPage />
          </RedirectIfAuth>
        }
      />
      <Route
        path="/login"
        element={
          <RedirectIfAuth>
            <LoginPage />
          </RedirectIfAuth>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuth>
            <RegisterPage />
          </RedirectIfAuth>
        }
      />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />
      <Route path="/" element={<HomeRoute />} />
      <Route
        path="/animals"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.animals}>
                <AnimalsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/animals/new"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.animalsCreate}>
                <AnimalCreatePage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/animals/quick"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.animalsCreate}>
                <AnimalsQuickCreatePage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/animals/import"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.animalsImport}>
                <AnimalsImportPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/events"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.events}>
                <EventsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/animals/:id"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.animals}>
                <AnimalDetailPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/animals/:id/print"
        element={
          <RequireAuth>
            <RequireRole allowed={Access.animals}>
              <AnimalPrintPage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/products"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.products}>
                <ProductsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/batches"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.batches}>
                <BatchesPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/inventory"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.inventory}>
                <InventoryPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/treatments"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.treatments}>
                <TreatmentsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/withdrawals"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.withdrawals}>
                <WithdrawalsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/reports"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.reports}>
                <ReportsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/alerts"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.alerts}>
                <AlertsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/tasks"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.tasks}>
                <TasksPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/movements"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.movements}>
                <MovementsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/establishments"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.establishments}>
                <EstablishmentsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.users}>
                <UsersPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/audit"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.audit}>
                <AuditPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <DashboardLayout>
              <RequireRole allowed={Access.settings}>
                <SettingsPage />
              </RequireRole>
            </DashboardLayout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default App;
