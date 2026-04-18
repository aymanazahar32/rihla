import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, getGetMeQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CarFront, Calendar, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl h-16 flex items-center justify-between px-4">
          <Link href={user ? "/events" : "/"} className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <CarFront className="w-5 h-5" />
            </div>
            RideShare
          </Link>

          <div className="flex items-center gap-6">
            {isLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
            ) : user ? (
              <>
                <nav className="hidden md:flex items-center gap-1 font-medium text-sm">
                  <Link
                    href="/events"
                    className={`px-4 py-2 rounded-full transition-colors ${location.startsWith("/events") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    Events
                  </Link>
                  <Link
                    href="/my-rides"
                    className={`px-4 py-2 rounded-full transition-colors ${location === "/my-rides" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    My Rides
                  </Link>
                </nav>
                <div className="flex items-center gap-4 ml-4 pl-4 border-l">
                  <div className="hidden sm:flex items-center gap-2 text-sm">
                    <span className="font-semibold">{user.name}</span>
                    <span className="bg-secondary/20 text-secondary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                      {user.role === 'driver' ? 'Driver' : 'Passenger'}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full text-muted-foreground hover:text-destructive">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col container mx-auto max-w-6xl p-4 md:p-8">
        {children}
      </main>

      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/90 backdrop-blur pb-safe">
          <div className="flex justify-around p-2">
            <Link href="/events" className={`flex flex-col items-center p-2 rounded-xl flex-1 ${location.startsWith("/events") ? "text-primary" : "text-muted-foreground"}`}>
              <Calendar className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Events</span>
            </Link>
            <Link href="/my-rides" className={`flex flex-col items-center p-2 rounded-xl flex-1 ${location === "/my-rides" ? "text-primary" : "text-muted-foreground"}`}>
              <CarFront className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">My Rides</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
