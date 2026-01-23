import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { hasAnyRole, isAuthenticated } from "@/lib/auth";
import type { Role } from "@/lib/auth";
import { Access } from "@/lib/access";
import LoginPage from "@/app/pages/LoginPage";
import RegisterPage from "@/app/pages/RegisterPage";
import LandingPage from "@/app/pages/LandingPage";
import DashboardPage from "@/app/pages/DashboardPage";
import AnimalsPage from "@/app/pages/AnimalsPage";
import AnimalCreatePage from "@/app/pages/AnimalCreatePage";
import AnimalsQuickCreatePage from "@/app/pages/AnimalsQuickCreatePage";
import AnimalDetailPage from "@/app/pages/AnimalDetailPage";
import AnimalPrintPage from "@/app/pages/AnimalPrintPage";
import AnimalsImportPage from "@/app/pages/AnimalsImportPage";
import EventsPage from "@/app/pages/EventsPage";
import ProductsPage from "@/app/pages/ProductsPage";
import BatchesPage from "@/app/pages/BatchesPage";
import InventoryPage from "@/app/pages/InventoryPage";
import TreatmentsPage from "@/app/pages/TreatmentsPage";
import WithdrawalsPage from "@/app/pages/WithdrawalsPage";
import ReportsPage from "@/app/pages/ReportsPage";
import AlertsPage from "@/app/pages/AlertsPage";
import TasksPage from "@/app/pages/TasksPage";
import MovementsPage from "@/app/pages/MovementsPage";
import EstablishmentsPage from "@/app/pages/EstablishmentsPage";
import UsersPage from "@/app/pages/UsersPage";
import AuditPage from "@/app/pages/AuditPage";
import SettingsPage from "@/app/pages/SettingsPage";
import AccessDeniedPage from "@/app/pages/AccessDeniedPage";

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
  <div className="flex min-h-screen bg-slate-50">
    <Sidebar />
    <div className="flex flex-1 flex-col">
      <Topbar />
      <main className="flex-1 px-6 py-6 pb-20 lg:pb-6">{children}</main>
    </div>
    <MobileNav />
  </div>
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

const App = () => (
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
);

export default App;
