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
import { LayoutPreferencesProvider } from "@/hooks/useLayoutPreferences";
import { AuthForm } from "@/components/auth/AuthForm";
import { MainApp } from "@/components/app/MainApp";
import { DesktopApp } from "@/components/app/DesktopApp";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { BrowserNotificationPrompt } from "@/components/notifications/BrowserNotificationPrompt";
import { OnboardingTutorial } from "@/components/onboarding/OnboardingTutorial";
import { useOnboarding } from "@/hooks/useOnboarding";
import UpdatePrompt from "@/components/pwa/UpdatePrompt";
import NotFound from "./pages/NotFound";
import JoinWorkspace from "./pages/JoinWorkspace";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const { isMobile } = useViewMode();
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboarding();

  if (loading || onboardingLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthForm onSuccess={() => {}} />;
  }

  return (
    <>
      {needsOnboarding && <OnboardingTutorial />}
      {isMobile ? <MainApp /> : <DesktopApp />}
      <BrowserNotificationPrompt />
    </>
  );
}

function AuthenticatedApp() {
  return (
    <WorkspaceProvider>
      <ChannelProvider>
        <LayoutPreferencesProvider>
          <ViewModeProvider>
            <AppContent />
          </ViewModeProvider>
        </LayoutPreferencesProvider>
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
          <UpdatePrompt />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootContent />} />
              <Route path="/join/:code" element={<JoinWorkspace />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
