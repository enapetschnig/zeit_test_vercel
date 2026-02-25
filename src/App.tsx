import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { InstallPromptDialog } from "./components/InstallPromptDialog";
import { useOnboarding } from "./contexts/OnboardingContext";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import TimeTracking from "./pages/TimeTracking";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectOverview from "./pages/ProjectOverview";
import MyHours from "./pages/MyHours";
import MyDocuments from "./pages/MyDocuments";
import Reports from "./pages/Reports";
import ConstructionSites from "./pages/ConstructionSites";
import Admin from "./pages/Admin";
import HoursReport from "./pages/HoursReport";
import Employees from "./pages/Employees";
import Notepad from "./pages/Notepad";
import MaterialList from "./pages/MaterialList";
import Disturbances from "./pages/Disturbances";
import DisturbanceDetail from "./pages/DisturbanceDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // still loading
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppContent() {
  const {
    showInstallDialog,
    handleInstallDialogClose,
  } = useOnboarding();

  const [authStatus, setAuthStatus] = useState<'checking' | 'pending' | 'active' | 'unauthenticated'>('checking');

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthStatus('unauthenticated');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', user.id)
        .maybeSingle();
      setAuthStatus(profile?.is_active === true ? 'active' : 'pending');
    };

    checkProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthStatus('unauthenticated');
      } else {
        checkProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authStatus === 'checking') return null;

  if (authStatus === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background">
        <div className="max-w-md space-y-4">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold">Account wartet auf Freigabe</h1>
          <p className="text-muted-foreground">
            Deine Registrierung war erfolgreich. Der Administrator muss deinen Account noch freischalten.
            Bitte warte auf die Bestätigung.
          </p>
          <button
            className="mt-4 underline text-sm text-muted-foreground"
            onClick={() => supabase.auth.signOut()}
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/time-tracking" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectOverview /></ProtectedRoute>} />
        <Route path="/projects/:projectId/:type" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
        <Route path="/projects/:projectId/materials" element={<ProtectedRoute><MaterialList /></ProtectedRoute>} />
        <Route path="/my-hours" element={<ProtectedRoute><MyHours /></ProtectedRoute>} />
        <Route path="/my-documents" element={<ProtectedRoute><MyDocuments /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/construction-sites" element={<ProtectedRoute><ConstructionSites /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/hours-report" element={<ProtectedRoute><HoursReport /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
        <Route path="/notepad" element={<ProtectedRoute><Notepad /></ProtectedRoute>} />
        <Route path="/disturbances" element={<ProtectedRoute><Disturbances /></ProtectedRoute>} />
        <Route path="/disturbances/:id" element={<ProtectedRoute><DisturbanceDetail /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Install Prompt Dialog */}
      <InstallPromptDialog
        open={showInstallDialog}
        onClose={handleInstallDialogClose}
      />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OnboardingProvider>
          <AppContent />
        </OnboardingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
