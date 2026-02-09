import { Navigate, Route, Routes } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TenantsPage from "./pages/TenantsPage";
import TenantDetailPage from "./pages/TenantDetailPage";
import PlansPage from "./pages/PlansPage";
import AuditPage from "./pages/AuditPage";
import SupportPage from "./pages/SupportPage";

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PlatformLayout = ({ children }: { children: JSX.Element }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    <div className="flex min-h-screen flex-1 flex-col">
      <Topbar />
      <main className="flex-1 px-4 py-5 xl:px-6">{children}</main>
    </div>
  </div>
);

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/dashboard"
      element={
        <RequireAuth>
          <PlatformLayout>
            <DashboardPage />
          </PlatformLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/tenants"
      element={
        <RequireAuth>
          <PlatformLayout>
            <TenantsPage />
          </PlatformLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/tenants/:id"
      element={
        <RequireAuth>
          <PlatformLayout>
            <TenantDetailPage />
          </PlatformLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/plans"
      element={
        <RequireAuth>
          <PlatformLayout>
            <PlansPage />
          </PlatformLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/audit"
      element={
        <RequireAuth>
          <PlatformLayout>
            <AuditPage />
          </PlatformLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/support"
      element={
        <RequireAuth>
          <PlatformLayout>
            <SupportPage />
          </PlatformLayout>
        </RequireAuth>
      }
    />
    <Route path="/" element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
