import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  getGetMeQueryKey,
  useSetupRiderProfile,
  useSetupDriverProfile,
  useSetupOrgProfile,
  useVerifyId,
  useRunDriverCheck,
  useCompleteProfile,
} from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Car, Building2, ArrowRight, CheckCircle2, ShieldCheck, FileSearch, Upload, Loader2 } from "lucide-react";

type UserType = "rider" | "driver" | "organization" | null;

export default function ProfileSetupPage() {
  const { data: user } = useGetMe();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [type, setType] = useState<UserType>(null);
  const [step, setStep] = useState<"type" | "form" | "verify" | "done">("type");

  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [university, setUniversity] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vinNumber, setVinNumber] = useState("");
  const [driversLicenseNumber, setDriversLicenseNumber] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carColor, setCarColor] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  const setupRider = useSetupRiderProfile();
  const setupDriver = useSetupDriverProfile();
  const setupOrg = useSetupOrgProfile();
  const verifyId = useVerifyId();
  const driverCheck = useRunDriverCheck();
  const completeProfile = useCompleteProfile();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "rider") {
      setupRider.mutate(
        { data: { gender: gender as any, age: parseInt(age), university, studentIdNumber } },
        {
          onSuccess: () => { refresh(); setStep("verify"); toast({ title: "Profile saved", description: "Now let's verify your ID." }); },
          onError: (e: any) => toast({ title: "Failed", description: e?.error, variant: "destructive" }),
        }
      );
    } else if (type === "driver") {
      setupDriver.mutate(
        { data: { gender: gender as any, age: parseInt(age), university, studentIdNumber, licensePlate, vinNumber, driversLicenseNumber, carMake, carModel, carColor } },
        {
          onSuccess: () => { refresh(); setStep("verify"); toast({ title: "Profile saved", description: "Now let's verify your ID and run a driver check." }); },
          onError: (e: any) => toast({ title: "Failed", description: e?.error, variant: "destructive" }),
        }
      );
    } else if (type === "organization") {
      setupOrg.mutate(
        { data: { organizationName } },
        {
          onSuccess: () => { refresh(); setStep("done"); },
          onError: (e: any) => toast({ title: "Failed", description: e?.error, variant: "destructive" }),
        }
      );
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground mt-1">Let's set up your profile so you can start sharing rides.</p>
        </div>

        {step === "type" && (
          <div className="grid sm:grid-cols-3 gap-4">
            <TypeCard icon={<User className="w-7 h-7" />} title="Rider" desc="Find rides to events, masjids, and errands." selected={type === "rider"} onClick={() => setType("rider")} />
            <TypeCard icon={<Car className="w-7 h-7" />} title="Driver" desc="Offer rides and earn community trust." selected={type === "driver"} onClick={() => setType("driver")} />
            <TypeCard icon={<Building2 className="w-7 h-7" />} title="Organization" desc="Coordinate group rides for your org or masjid." selected={type === "organization"} onClick={() => setType("organization")} />
            <div className="sm:col-span-3 flex justify-end mt-4">
              <Button size="lg" disabled={!type} onClick={() => setStep("form")} className="rounded-full">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "form" && (
          <Card className="border-0 ring-1 ring-border/40 shadow-sm">
            <CardContent className="p-8">
              <form onSubmit={submitForm} className="space-y-5">
                {(type === "rider" || type === "driver") && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Input type="number" min={16} max={100} value={age} onChange={(e) => setAge(e.target.value)} required />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>University</Label>
                        <Input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="e.g. NYU" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Student ID number</Label>
                        <Input value={studentIdNumber} onChange={(e) => setStudentIdNumber(e.target.value)} required />
                      </div>
                    </div>
                  </>
                )}

                {type === "driver" && (
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Vehicle & license</h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Car make</Label><Input value={carMake} onChange={(e) => setCarMake(e.target.value)} placeholder="Toyota" required /></div>
                      <div className="space-y-2"><Label>Model</Label><Input value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="Camry" required /></div>
                      <div className="space-y-2"><Label>Color</Label><Input value={carColor} onChange={(e) => setCarColor(e.target.value)} placeholder="Silver" required /></div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4 mt-4">
                      <div className="space-y-2"><Label>License plate</Label><Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="ABC-1234" required /></div>
                      <div className="space-y-2"><Label>VIN number</Label><Input value={vinNumber} onChange={(e) => setVinNumber(e.target.value)} placeholder="17-character VIN" required /></div>
                      <div className="space-y-2"><Label>Driver's license #</Label><Input value={driversLicenseNumber} onChange={(e) => setDriversLicenseNumber(e.target.value)} required /></div>
                    </div>
                  </div>
                )}

                {type === "organization" && (
                  <div className="space-y-2">
                    <Label>Organization name</Label>
                    <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="e.g. NYU Muslim Students Association" required />
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="ghost" onClick={() => setStep("type")}>Back</Button>
                  <Button type="submit" size="lg" className="rounded-full" disabled={setupRider.isPending || setupDriver.isPending || setupOrg.isPending}>
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "verify" && (
          <div className="space-y-5">
            <VerifyCard
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Verify your ID"
              desc="Upload a photo of your government-issued ID. We'll match it against your name and student record."
              cta="Upload & verify"
              done={!!user?.idVerified}
              loading={verifyId.isPending}
              onAction={() => verifyId.mutate(undefined, { onSuccess: () => { refresh(); toast({ title: "ID verified ✓" }); } })}
            />
            {type === "driver" && (
              <VerifyCard
                icon={<FileSearch className="w-6 h-6" />}
                title="Driver history check"
                desc="We'll run a check against DMV and traffic records. This usually takes a few seconds."
                cta="Run driver check"
                done={!!user?.driverHistoryChecked}
                loading={driverCheck.isPending}
                onAction={() => driverCheck.mutate(undefined, { onSuccess: () => { refresh(); toast({ title: "Driver check passed ✓" }); } })}
              />
            )}
            <div className="flex justify-end pt-2">
              <Button size="lg" className="rounded-full"
                disabled={!user?.idVerified || (type === "driver" && !user?.driverHistoryChecked) || completeProfile.isPending}
                onClick={() => completeProfile.mutate(undefined, { onSuccess: () => { refresh(); setLocation("/events"); } })}>
                {completeProfile.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                You're all set <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <Card className="border-0 ring-1 ring-border/40 text-center p-12">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">You're all set!</h2>
            <p className="text-muted-foreground mt-2 mb-6">Your organization profile is ready.</p>
            <Button size="lg" className="rounded-full" onClick={() => setLocation("/events")}>Go to events</Button>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function TypeCard({ icon, title, desc, selected, onClick }: { icon: React.ReactNode; title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`text-left p-6 rounded-2xl border-2 transition-all ${selected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"}`}>
      <div className={`inline-flex p-3 rounded-xl mb-4 ${selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>{icon}</div>
      <div className="font-semibold text-lg">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}

function VerifyCard({ icon, title, desc, cta, done, loading, onAction }: { icon: React.ReactNode; title: string; desc: string; cta: string; done: boolean; loading: boolean; onAction: () => void }) {
  return (
    <Card className="border-0 ring-1 ring-border/40">
      <CardContent className="p-6 flex items-start gap-5">
        <div className={`p-3 rounded-xl ${done ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"}`}>{done ? <CheckCircle2 className="w-6 h-6" /> : icon}</div>
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground mt-1">{desc}</div>
        </div>
        <Button onClick={onAction} disabled={done || loading} variant={done ? "secondary" : "default"} className="rounded-full">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : done ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
          {done ? "Verified" : cta}
        </Button>
      </CardContent>
    </Card>
  );
}
