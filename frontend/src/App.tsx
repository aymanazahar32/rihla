import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@/lib/api-client";
import { useLocation } from "wouter";
import { useEffect } from "react";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import ProfileSetupPage from "@/pages/profile-setup";
import EventsPage from "@/pages/events";
import EventDetailPage from "@/pages/event-detail";
import SalahPage from "@/pages/salah";
import MasjidDetailPage from "@/pages/masjid-detail";
import ErrandsPage from "@/pages/errands";
import ErrandDetailPage from "@/pages/errand-detail";
import RideCreatePage from "@/pages/ride-create";
import RideDetailPage from "@/pages/ride-detail";
import RequestCreatePage from "@/pages/request-create";
import MyRidesPage from "@/pages/my-rides";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function ProfileGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user && !user.profileCompleted && location !== "/profile-setup") {
      setLocation("/profile-setup");
    }
    if (!isLoading && !user && location !== "/") {
      setLocation("/");
    }
  }, [user, isLoading, location, setLocation]);

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/profile-setup" component={ProfileSetupPage} />
      <Route path="/salah">{() => <ProfileGuard><SalahPage /></ProfileGuard>}</Route>
      <Route path="/salah/:masjidId">{(p) => <ProfileGuard><MasjidDetailPage masjidId={parseInt(p.masjidId)} /></ProfileGuard>}</Route>
      <Route path="/events">{() => <ProfileGuard><EventsPage /></ProfileGuard>}</Route>
      <Route path="/events/:eventId">{(p) => <ProfileGuard><EventDetailPage eventId={parseInt(p.eventId)} /></ProfileGuard>}</Route>
      <Route path="/errands">{() => <ProfileGuard><ErrandsPage /></ProfileGuard>}</Route>
      <Route path="/errands/:errandId">{(p) => <ProfileGuard><ErrandDetailPage errandId={parseInt(p.errandId)} /></ProfileGuard>}</Route>
      <Route path="/rides/new" component={RideCreatePage} />
      <Route path="/requests/new" component={RequestCreatePage} />
      <Route path="/rides/:rideId">{(p) => <ProfileGuard><RideDetailPage rideId={parseInt(p.rideId)} /></ProfileGuard>}</Route>
      <Route path="/my-rides">{() => <ProfileGuard><MyRidesPage /></ProfileGuard>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
