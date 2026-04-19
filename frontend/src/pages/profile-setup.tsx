import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  getGetMeQueryKey,
  useSetupRiderProfile,
  useSetupOrgProfile,
  useVerifyId,
  useCompleteProfile,
} from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, CheckCircle2, ShieldCheck, Upload, Loader2, ImageIcon } from "lucide-react";

type UserType = "rider" | "organization" | null;

const STUDENT_ID_DIGITS = 10;

export default function ProfileSetupPage() {
  const { data: user, isLoading } = useGetMe();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<UserType>(null);
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [university, setUniversity] = useState("University of Texas at Arlington");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setupRider = useSetupRiderProfile();
  const setupOrg = useSetupOrgProfile();
  const verifyId = useVerifyId();
  const completeProfile = useCompleteProfile();
  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(`/login?next=${encodeURIComponent("/profile-setup")}`, { replace: true });
    }
  }, [isLoading, user, setLocation]);

  useEffect(() => {
    if (!isLoading && user?.profileCompleted) {
      setLocation("/", { replace: true });
    }
  }, [isLoading, user?.profileCompleted, setLocation]);

  const openFilePicker = () => fileInputRef.current?.click();

  const onIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setIdFile(f ?? null);
  };

  const handleSubmit = async () => {
    if (!type) {
      toast({ title: "Choose rider or organization", variant: "destructive" });
      return;
    }

    if (type === "organization") {
      if (!organizationName.trim()) {
        toast({ title: "Organization name required", variant: "destructive" });
        return;
      }
      setSubmitting(true);
      try {
        await setupOrg.mutateAsync({ data: { organizationName: organizationName.trim() } });
        refresh();
        toast({ title: "Welcome!", description: "Your organization profile is ready." });
        setLocation("/", { replace: true });
      } catch (e: any) {
        toast({ title: "Could not save", description: e?.error ?? "Try again.", variant: "destructive" });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const digits = studentIdNumber.replace(/\D/g, "");
    if (digits.length !== STUDENT_ID_DIGITS) {
      toast({
        title: "Student ID must be 10 digits",
        description: `Enter exactly ${STUDENT_ID_DIGITS} digits (numbers only).`,
        variant: "destructive",
      });
      return;
    }

    if (!gender || !age || !university.trim()) {
      toast({ title: "Complete your details", variant: "destructive" });
      return;
    }

    const ageNum = parseInt(age, 10);
    if (Number.isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
      toast({ title: "Enter a valid age", variant: "destructive" });
      return;
    }

    if (!idFile) {
      toast({ title: "Upload your student or government ID", description: "Choose a photo so we can verify you (demo: any image file).", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await setupRider.mutateAsync({
        data: {
          gender: gender as "male" | "female" | "other" | "prefer_not_to_say",
          age: ageNum,
          university: university.trim(),
          studentIdNumber: digits,
        },
      });
      await verifyId.mutateAsync();
      await completeProfile.mutateAsync();
      refresh();
      toast({ title: "You’re set!", description: "Want to drive later? Use Profile → Become a driver." });
      setLocation("/", { replace: true });
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e?.error ?? "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto h-48 animate-pulse rounded-xl bg-muted" />
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <p className="text-center py-16 text-muted-foreground text-sm">Redirecting…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground mt-1">
            One-time setup: register as a <strong>rider</strong> (book seats) or an <strong>organization</strong>. To drive, finish this first, then open <strong>Profile</strong>.
          </p>
        </div>

        <Card className="border-0 ring-1 ring-border/40 shadow-sm mb-6">
          <CardContent className="p-8 space-y-10">
            <section>
              <h2 className="text-lg font-semibold mb-4">How will you start?</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <TypeCard icon={<User className="w-7 h-7" />} title="Rider" desc="Book seats on community rides. You can apply to drive later in Profile." selected={type === "rider"} onClick={() => setType("rider")} />
                <TypeCard icon={<Building2 className="w-7 h-7" />} title="Organization" desc="Coordinate group rides for your org or masjid." selected={type === "organization"} onClick={() => setType("organization")} />
              </div>
            </section>

            {type === "organization" && (
              <section className="space-y-2">
                <Label htmlFor="orgName">Organization name</Label>
                <Input id="orgName" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="e.g. UTA Muslim Students Association" />
              </section>
            )}

            {type === "rider" && (
              <>
                <section className="space-y-5">
                  <h2 className="text-lg font-semibold">Your details</h2>
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
                      <Label htmlFor="age">Age</Label>
                      <Input id="age" type="number" min={16} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="uni">University</Label>
                      <Input id="uni" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University of Texas at Arlington" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sid">Student ID ({STUDENT_ID_DIGITS} digits)</Label>
                      <Input
                        id="sid"
                        inputMode="numeric"
                        autoComplete="off"
                        value={studentIdNumber}
                        onChange={(e) => setStudentIdNumber(e.target.value.replace(/\D/g, "").slice(0, STUDENT_ID_DIGITS))}
                        maxLength={STUDENT_ID_DIGITS}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border bg-muted/30 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">ID photo</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload a clear photo of your UTA student ID or government ID. Demo: any image marks you as verified.
                      </p>
                      <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={onIdFileChange} />
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        <Button type="button" variant="default" className="rounded-full" onClick={openFilePicker}>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose photo
                        </Button>
                        {idFile ? (
                          <span className="text-sm text-emerald-700 font-medium flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4" /> {idFile.name}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No file selected yet.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" size="lg" className="rounded-full min-w-[220px]" disabled={submitting || !type} onClick={handleSubmit}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                {type === "organization" ? "Save organization" : "Finish registration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function TypeCard({ icon, title, desc, selected, onClick }: { icon: ReactNode; title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`text-left p-6 rounded-2xl border-2 transition-all ${selected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"}`}>
      <div className={`inline-flex p-3 rounded-xl mb-4 ${selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>{icon}</div>
      <div className="font-semibold text-lg">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}
