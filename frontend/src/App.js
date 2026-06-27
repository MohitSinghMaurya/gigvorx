import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { CurrencyProvider } from "@/lib/CurrencyContext";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/layouts/AppLayout";
import PublicLayout from "@/layouts/PublicLayout";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Pricing from "@/pages/Pricing";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Clients from "@/pages/Clients";
import ClientForm from "@/pages/ClientForm";
import Briefs from "@/pages/Briefs";
import BriefEditor from "@/pages/BriefEditor";
import Invoices from "@/pages/Invoices";
import InvoiceEditor from "@/pages/InvoiceEditor";
import Analytics from "@/pages/Analytics";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import About from "@/pages/About";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import PublicIntakeForm from "@/pages/PublicIntakeForm";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
      <Route path="/pricing" element={<PublicLayout><Pricing /></PublicLayout>} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />

      {/* PUBLIC INTAKE FORM - No login required */}
      <Route path="/intake/:shareToken" element={<PublicLayout><PublicIntakeForm /></PublicLayout>} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/new" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
      <Route path="/clients/:id/edit" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
      <Route path="/briefs" element={<ProtectedRoute><Briefs /></ProtectedRoute>} />
      <Route path="/briefs/new" element={<ProtectedRoute><BriefEditor /></ProtectedRoute>} />
      <Route path="/briefs/:id" element={<ProtectedRoute><BriefEditor /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/invoices/new" element={<ProtectedRoute><InvoiceEditor /></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceEditor /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/pricing-app" element={<ProtectedRoute><Pricing inApp /></ProtectedRoute>} />

      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

      <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
      <Route path="/privacy" element={<PublicLayout><Privacy /></PublicLayout>} />
      <Route path="/terms" element={<PublicLayout><Terms /></PublicLayout>} />
      <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
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