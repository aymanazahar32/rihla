import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { getGetMeQueryKey } from "@/lib/api-client";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/auth";
import EventsPage from "@/pages/events";
import EventDetailPage from "@/pages/event-detail";
import RideCreatePage from "@/pages/ride-create";
import RideDetailPage from "@/pages/ride-detail";
import MyRidesPage from "@/pages/my-rides";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthListener() {
  const qc = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/events" component={EventsPage} />
      <Route path="/events/:eventId" component={EventDetailPage} />
      <Route path="/rides/new" component={RideCreatePage} />
      <Route path="/rides/:rideId" component={RideDetailPage} />
      <Route path="/my-rides" component={MyRidesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthListener />
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
