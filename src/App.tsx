import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ChannelProvider } from "@/contexts/ChannelContext";
import { ViewModeProvider, useViewMode } from "@/contexts/ViewModeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthForm } from "@/components/auth/AuthForm";
import { MainApp } from "@/components/app/MainApp";
import { DesktopApp } from "@/components/app/DesktopApp";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import NotFound from "./pages/NotFound";
import JoinWorkspace from "./pages/JoinWorkspace";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const { isMobile } = useViewMode();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthForm onSuccess={() => {}} />;
  }

  return isMobile ? <MainApp /> : <DesktopApp />;
}

function AuthenticatedApp() {
  return (
    <WorkspaceProvider>
      <ChannelProvider>
        <ViewModeProvider>
          <AppContent />
        </ViewModeProvider>
      </ChannelProvider>
    </WorkspaceProvider>
  );
}

function RootContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthForm onSuccess={() => {}} />;
  }

  return <AuthenticatedApp />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootContent />} />
              <Route path="/join/:code" element={<JoinWorkspace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
