import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useRegister, useGetMe, getGetMeQueryKey, RegisterBodyRole } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { CarFront, Mail, Lock, User, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Name is required"),
  role: z.enum(["driver", "passenger"] as const),
});

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!isLoading && user) {
    setLocation("/events");
    return null;
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24 bg-primary/5 text-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-sm lg:w-96 z-10">
          <div className="flex items-center gap-3 text-primary mb-8">
            <div className="bg-primary/20 p-3 rounded-2xl">
              <CarFront className="w-8 h-8" />
            </div>
            <span className="font-bold text-3xl tracking-tight text-foreground">RideShare</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-foreground leading-tight">
            Share the journey. <br />
            <span className="text-primary">Enjoy the event.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Connect with neighbors, save on gas, and start the fun before you even arrive.
          </p>

          <div className="space-y-6 hidden md:block">
            <div className="flex items-start gap-4">
              <div className="bg-background p-2 rounded-lg shadow-sm">
                <MapPin className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">Event-focused</h3>
                <p className="text-sm text-muted-foreground">Find rides going exactly where you're going.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-background p-2 rounded-lg shadow-sm">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Community-driven</h3>
                <p className="text-sm text-muted-foreground">Ride with verified event attendees.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-background/50 backdrop-blur-sm sm:border sm:bg-card z-10">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="animate-in fade-in-50 zoom-in-95 duration-300">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register" className="animate-in fade-in-50 zoom-in-95 duration-300">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoginForm() {
  const login = useLogin();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    login.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Welcome back!", description: "Successfully logged in." });
          setLocation("/events");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: error.error || "Please check your credentials and try again.",
          });
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="name@example.com" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-6" disabled={login.isPending}>
          {login.isPending ? "Logging in..." : "Login"}
          {!login.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm() {
  const register = useRegister();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "passenger" },
  });

  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    register.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Account created!", description: "Welcome to RideShare." });
          setLocation("/events");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: error.error || "An error occurred during registration.",
          });
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="John Doe" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="name@example.com" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem className="space-y-3 pt-2">
              <FormLabel>I want to join as a...</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${field.value === 'passenger' ? 'border-primary bg-primary/5 text-primary' : 'border-muted hover:border-primary/50 text-muted-foreground hover:bg-muted/50'}`}>
                    <input type="radio" className="sr-only" {...field} value="passenger" checked={field.value === 'passenger'} onChange={() => field.onChange('passenger')} />
                    <User className="w-6 h-6" />
                    <span className="font-medium text-sm">Passenger</span>
                  </label>
                  <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${field.value === 'driver' ? 'border-primary bg-primary/5 text-primary' : 'border-muted hover:border-primary/50 text-muted-foreground hover:bg-muted/50'}`}>
                    <input type="radio" className="sr-only" {...field} value="driver" checked={field.value === 'driver'} onChange={() => field.onChange('driver')} />
                    <CarFront className="w-6 h-6" />
                    <span className="font-medium text-sm">Driver</span>
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-6" disabled={register.isPending}>
          {register.isPending ? "Creating account..." : "Create Account"}
          {!register.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </form>
    </Form>
  );
}
