import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@/lib/api-client";
import { useMatchingEngine } from "@/lib/useMatchingEngine";
import { useLocation } from "wouter";
import { useEffect, type ReactNode, Component, type ErrorInfo, lazy, Suspense } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{(this.state.error as Error).message}</p>
          <button className="text-sm underline" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Layout } from "@/components/Layout";
import { ModeProvider } from "@/lib/ModeContext";
import { NLPrefillProvider } from "@/lib/NLPrefillContext";

const NotFound = lazy(() => import("@/pages/not-found"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ProfileSetupPage = lazy(() => import("@/pages/profile-setup"));
const HomePage = lazy(() => import("@/pages/home"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const EventsPage = lazy(() => import("@/pages/events"));
const EventDetailPage = lazy(() => import("@/pages/event-detail"));
const EventCreatePage = lazy(() => import("@/pages/event-create"));
const SalahPage = lazy(() => import("@/pages/salah"));
const MasjidDetailPage = lazy(() => import("@/pages/masjid-detail"));
const ErrandsPage = lazy(() => import("@/pages/errands"));
const ErrandDetailPage = lazy(() => import("@/pages/errand-detail"));
const RideCreatePage = lazy(() => import("@/pages/ride-create"));
const RideDetailPage = lazy(() => import("@/pages/ride-detail"));
const DriverModePage = lazy(() => import("@/pages/driver-mode"));
const RequestCreatePage = lazy(() => import("@/pages/request-create"));
const MyRidesPage = lazy(() => import("@/pages/my-rides"));
const MatchResultsPage = lazy(() => import("@/pages/match-results"));
const FriendsPage = lazy(() => import("@/pages/friends"));
const BecomeDriverPage = lazy(() => import("@/pages/become-driver"));

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
      <Route path="/match" component={MatchResultsPage} />
      <Route path="/rides/new">{() => <SessionGuard><CompleteProfileGuard><RideCreatePage /></CompleteProfileGuard></SessionGuard>}</Route>
      <Route path="/requests/new">{() => <SessionGuard><CompleteProfileGuard><RequestCreatePage /></CompleteProfileGuard></SessionGuard>}</Route>
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
      <Route path="/my-rides">{() => <SessionGuard><CompleteProfileGuard><MyRidesPage /></CompleteProfileGuard></SessionGuard>}</Route>
      <Route path="/friends">{() => <SessionGuard><CompleteProfileGuard><FriendsPage /></CompleteProfileGuard></SessionGuard>}</Route>
      <Route path="/become-driver">{() => <SessionGuard><CompleteProfileGuard><BecomeDriverPage /></CompleteProfileGuard></SessionGuard>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function MatchingEngineMount() {
  const { data: me } = useGetMe();
  useMatchingEngine(!!me);
  return null;
}

function usePrefetchPages() {
  useEffect(() => {
    const pages = [
      () => import("@/pages/auth"),
      () => import("@/pages/salah"),
      () => import("@/pages/events"),
      () => import("@/pages/errands"),
      () => import("@/pages/my-rides"),
      () => import("@/pages/profile"),
      () => import("@/pages/ride-create"),
      () => import("@/pages/request-create"),
      () => import("@/pages/ride-detail"),
      () => import("@/pages/event-detail"),
      () => import("@/pages/errand-detail"),
      () => import("@/pages/match-results"),
      () => import("@/pages/profile-setup"),
      () => import("@/pages/driver-mode"),
      () => import("@/pages/event-create"),
      () => import("@/pages/masjid-detail"),
      () => import("@/pages/not-found"),
      () => import("@/pages/friends"),
    ];
    let i = 0;
    const next = () => { if (i < pages.length) pages[i++]().finally(next); };
    next();
  }, []);
}

function App() {
  usePrefetchPages();
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NLPrefillProvider>
            <ModeProvider>
              <MatchingEngineMount />
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>}>
                <Router />
              </Suspense>
              <Toaster />
            </ModeProvider>
          </NLPrefillProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
