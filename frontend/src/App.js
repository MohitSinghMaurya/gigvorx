import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { CurrencyProvider } from "@/lib/CurrencyContext";

import AppLayout from "@/layouts/AppLayout";
import PublicLayout from "@/layouts/PublicLayout";

import About from "@/pages/About";
import Admin from "@/pages/Admin";
import Analytics from "@/pages/Analytics";
import BriefEditor from "@/pages/BriefEditor";
import BriefResponses from "@/pages/BriefResponses";
import Briefs from "@/pages/Briefs";
import ClientForm from "@/pages/ClientForm";
import Clients from "@/pages/Clients";
import Dashboard from "@/pages/Dashboard";
import Demo from "@/pages/Demo";
import InvoiceEditor from "@/pages/InvoiceEditor";
import Invoices from "@/pages/Invoices";
import Landing from "@/pages/Landing";
import Leads from "@/pages/Leads";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Pricing from "@/pages/Pricing";
import Privacy from "@/pages/Privacy";
import PublicIntakeForm from "@/pages/PublicIntakeForm";
import Settings from "@/pages/Settings";
import Signup from "@/pages/Signup";
import Terms from "@/pages/Terms";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
    </div>
  );
}

function useAuthLoading() {
  const auth = useAuth();

  return {
    ...auth,
    authLoading: auth.isLoading ?? auth.loading ?? false,
  };
}

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuthLoading();
  const location = useLocation();

  if (authLoading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }) {
  const { user, authLoading } = useAuthLoading();
  const location = useLocation();

  if (authLoading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function PublicOnly({ children }) {
  const { user, authLoading } = useAuthLoading();

  if (authLoading) return <LoadingScreen />;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicLayout>
            <Landing />
          </PublicLayout>
        }
      />

      <Route
        path="/pricing"
        element={
          <PublicLayout>
            <Pricing />
          </PublicLayout>
        }
      />

      <Route
        path="/demo"
        element={
          <PublicLayout>
            <Demo />
          </PublicLayout>
        }
      />

      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />

      <Route
        path="/signup"
        element={
          <PublicOnly>
            <Signup />
          </PublicOnly>
        }
      />

      <Route
        path="/intake/:shareToken"
        element={
          <PublicLayout>
            <PublicIntakeForm />
          </PublicLayout>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <Leads />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clients/new"
        element={
          <ProtectedRoute>
            <ClientForm />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clients/:id/edit"
        element={
          <ProtectedRoute>
            <ClientForm />
          </ProtectedRoute>
        }
      />

      <Route
        path="/briefs"
        element={
          <ProtectedRoute>
            <Briefs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/briefs/new"
        element={
          <ProtectedRoute>
            <BriefEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/briefs/:id"
        element={
          <ProtectedRoute>
            <BriefEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/briefs/:id/responses"
        element={
          <ProtectedRoute>
            <BriefResponses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <Invoices />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoices/new"
        element={
          <ProtectedRoute>
            <InvoiceEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoices/:id"
        element={
          <ProtectedRoute>
            <InvoiceEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pricing-app"
        element={
          <ProtectedRoute>
            <Pricing inApp />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        }
      />

      <Route
        path="/about"
        element={
          <PublicLayout>
            <About />
          </PublicLayout>
        }
      />

      <Route
        path="/privacy"
        element={
          <PublicLayout>
            <Privacy />
          </PublicLayout>
        }
      />

      <Route
        path="/terms"
        element={
          <PublicLayout>
            <Terms />
          </PublicLayout>
        }
      />

      <Route
        path="*"
        element={
          <PublicLayout>
            <NotFound />
          </PublicLayout>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <CurrencyProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </CurrencyProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;