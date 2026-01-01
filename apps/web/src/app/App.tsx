import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { isAuthenticated } from "@/lib/auth";
import LoginPage from "@/app/pages/LoginPage";
import DashboardPage from "@/app/pages/DashboardPage";
import AnimalsPage from "@/app/pages/AnimalsPage";
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

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
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

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <RequireAuth>
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/animals"
      element={
        <RequireAuth>
          <DashboardLayout>
            <AnimalsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/animals/import"
      element={
        <RequireAuth>
          <DashboardLayout>
            <AnimalsImportPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/events"
      element={
        <RequireAuth>
          <DashboardLayout>
            <EventsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/animals/:id"
      element={
        <RequireAuth>
          <DashboardLayout>
            <AnimalDetailPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/animals/:id/print"
      element={
        <RequireAuth>
          <AnimalPrintPage />
        </RequireAuth>
      }
    />
    <Route
      path="/products"
      element={
        <RequireAuth>
          <DashboardLayout>
            <ProductsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/batches"
      element={
        <RequireAuth>
          <DashboardLayout>
            <BatchesPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/inventory"
      element={
        <RequireAuth>
          <DashboardLayout>
            <InventoryPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/treatments"
      element={
        <RequireAuth>
          <DashboardLayout>
            <TreatmentsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/withdrawals"
      element={
        <RequireAuth>
          <DashboardLayout>
            <WithdrawalsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/reports"
      element={
        <RequireAuth>
          <DashboardLayout>
            <ReportsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/alerts"
      element={
        <RequireAuth>
          <DashboardLayout>
            <AlertsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/tasks"
      element={
        <RequireAuth>
          <DashboardLayout>
            <TasksPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/movements"
      element={
        <RequireAuth>
          <DashboardLayout>
            <MovementsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/establishments"
      element={
        <RequireAuth>
          <DashboardLayout>
            <EstablishmentsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/users"
      element={
        <RequireAuth>
          <DashboardLayout>
            <UsersPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/audit"
      element={
        <RequireAuth>
          <DashboardLayout>
            <AuditPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/settings"
      element={
        <RequireAuth>
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        </RequireAuth>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
