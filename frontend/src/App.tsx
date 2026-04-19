import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@/lib/api-client";
import { useLocation } from "wouter";
import { useEffect, type ReactNode } from "react";
import { Layout } from "@/components/Layout";
import { ModeProvider } from "@/lib/ModeContext";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import ProfileSetupPage from "@/pages/profile-setup";
import HomePage from "@/pages/home";
import ProfilePage from "@/pages/profile";
import EventsPage from "@/pages/events";
import EventDetailPage from "@/pages/event-detail";
import EventCreatePage from "@/pages/event-create";
import SalahPage from "@/pages/salah";
import MasjidDetailPage from "@/pages/masjid-detail";
import ErrandsPage from "@/pages/errands";
import ErrandDetailPage from "@/pages/errand-detail";
import RideCreatePage from "@/pages/ride-create";
import RideDetailPage from "@/pages/ride-detail";
import DriverModePage from "@/pages/driver-mode";
import RequestCreatePage from "@/pages/request-create";
import MyRidesPage from "@/pages/my-rides";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function SessionGuard({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      setLocation(`/login?next=${encodeURIComponent(path)}`, { replace: true });
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto h-48 animate-pulse rounded-xl bg-muted" />
      </Layout>
    );
  }
  if (!user) {
    return (
      <Layout>
        <p className="text-center py-16 text-muted-foreground text-sm">Redirecting to sign in…</p>
      </Layout>
    );
  }
  return <>{children}</>;
}

function CompleteProfileGuard({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading || !user) return;
    if (!user.profileCompleted) setLocation("/profile-setup", { replace: true });
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) return null;
  if (!user.profileCompleted) {
    return (
      <Layout>
        <p className="text-center py-16 text-muted-foreground text-sm">Continue profile setup…</p>
      </Layout>
    );
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/profile-setup">
        {() => (
          <SessionGuard>
            <ProfileSetupPage />
          </SessionGuard>
        )}
      </Route>

      <Route path="/events" component={EventsPage} />
      <Route path="/events/:eventId">{(p) => <EventDetailPage eventId={parseInt(p.eventId)} />}</Route>
      <Route path="/salah" component={SalahPage} />
      <Route path="/salah/:masjidId">{(p) => <MasjidDetailPage masjidId={parseInt(p.masjidId)} />}</Route>
      <Route path="/errands" component={ErrandsPage} />
      <Route path="/errands/:errandId">{(p) => <ErrandDetailPage errandId={parseInt(p.errandId)} />}</Route>
      <Route path="/rides/:rideId/drive">
        {(p) => (
          <SessionGuard>
            <CompleteProfileGuard>
              <DriverModePage rideId={parseInt(p.rideId)} />
            </CompleteProfileGuard>
          </SessionGuard>
        )}
      </Route>
      <Route path="/rides/:rideId">{(p) => <RideDetailPage rideId={parseInt(p.rideId)} />}</Route>

      <Route path="/events/new">
        {() => (
          <SessionGuard>
            <CompleteProfileGuard>
              <EventCreatePage />
            </CompleteProfileGuard>
          </SessionGuard>
        )}
      </Route>
      <Route path="/profile">{() => <SessionGuard><CompleteProfileGuard><ProfilePage /></CompleteProfileGuard></SessionGuard>}</Route>
      <Route path="/rides/new">{() => <SessionGuard><CompleteProfileGuard><RideCreatePage /></CompleteProfileGuard></SessionGuard>}</Route>
      <Route path="/requests/new">{() => <SessionGuard><CompleteProfileGuard><RequestCreatePage /></CompleteProfileGuard></SessionGuard>}</Route>
      <Route path="/my-rides">{() => <SessionGuard><CompleteProfileGuard><MyRidesPage /></CompleteProfileGuard></SessionGuard>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ModeProvider>
          <Router />
          <Toaster />
        </ModeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
