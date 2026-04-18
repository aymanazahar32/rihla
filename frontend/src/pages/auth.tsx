import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useLogin, useRegister, getGetMeQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CarFront, MapPin, ShieldCheck, GraduationCap, ArrowRight, Mail, Lock, User } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const login = useLogin();
  const register = useRegister();

  const handleSuccess = (profileCompleted: boolean) => {
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation(profileCompleted ? "/events" : "/profile-setup");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      login.mutate({ data: { email, password } }, {
        onSuccess: (res) => {
          toast({ title: "Welcome back!" });
          handleSuccess(res.user.profileCompleted);
        },
        onError: (err: any) => toast({ title: "Login failed", description: err?.error || "Invalid credentials", variant: "destructive" }),
      });
    } else {
      if (!/\.edu$/i.test(email.trim())) {
        toast({ title: ".edu email required", description: "Only university (.edu) emails are allowed.", variant: "destructive" });
        return;
      }
      register.mutate({ data: { name, email, password } }, {
        onSuccess: () => {
          toast({ title: "Account created!", description: "Now let's set up your profile." });
          handleSuccess(false);
        },
        onError: (err: any) => toast({ title: "Registration failed", description: err?.error || "Could not register", variant: "destructive" }),
      });
    }
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-center p-16 bg-gradient-to-br from-primary/15 via-orange-100/40 to-amber-50/60 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-[26rem] h-[26rem] rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-primary/20 p-3 rounded-2xl text-primary"><CarFront className="w-7 h-7" /></div>
            <span className="font-bold text-2xl tracking-tight">RideShare</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight mb-4">
            Share the journey. <br /><span className="text-primary">Together.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10">A trusted carpool community for university students — for events, prayer, and everyday errands.</p>
          <div className="space-y-5">
            <Feature icon={<GraduationCap className="w-5 h-5" />} title="Students only" desc="Verified .edu sign-up keeps your community safe." />
            <Feature icon={<MapPin className="w-5 h-5" />} title="Salah, events & errands" desc="One app for prayer rides, campus events, and group runs." />
            <Feature icon={<ShieldCheck className="w-5 h-5" />} title="Verified riders & drivers" desc="ID verification and driver history checks built-in." />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md shadow-xl border-0 ring-1 ring-border/40">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Welcome</h2>
              <p className="text-sm text-muted-foreground mt-1">Sign in or create your student account</p>
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aisha Khan" className="pl-9" required />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">University email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" className="pl-9" required />
                  </div>
                  {mode === "register" && <p className="text-xs text-muted-foreground">Only .edu addresses are accepted.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" required minLength={6} />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-full" size="lg" disabled={login.isPending || register.isPending}>
                  {mode === "login" ? "Login" : "Create account"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-white/70 backdrop-blur p-2.5 rounded-xl text-primary shadow-sm">{icon}</div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
