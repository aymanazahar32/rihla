import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, getGetMeQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CarFront, LogOut, Moon, Calendar, ShoppingBag, MapPin, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  { href: "/salah", label: "Salah", icon: Moon },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/errands", label: "Errands", icon: ShoppingBag },
  { href: "/my-rides", label: "My Rides", icon: MapPin },
];

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
      },
    });
  };

  const userTypeLabel = user?.userType
    ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1)
    : "Setup needed";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl h-16 flex items-center justify-between px-4">
          <Link href={user ? "/events" : "/"} className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <CarFront className="w-5 h-5" />
            </div>
            RideShare
          </Link>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="w-32 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
            ) : user ? (
              <>
                <nav className="hidden md:flex items-center gap-1 font-medium text-sm">
                  {NAV.map((item) => {
                    const active = location.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`px-3 py-2 rounded-full transition-colors flex items-center gap-1.5 ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="flex items-center gap-3 ml-3 pl-3 border-l">
                  <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="font-semibold text-sm">{user.name}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {user.idVerified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                      {userTypeLabel}
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

      <main className="flex-1 flex flex-col container mx-auto max-w-7xl p-4 md:p-8 pb-24 md:pb-8">
        {children}
      </main>

      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur z-40">
          <div className="flex justify-around p-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`flex flex-col items-center p-2 rounded-xl flex-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
