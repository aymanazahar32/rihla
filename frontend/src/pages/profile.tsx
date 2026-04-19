import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  getGetMeQueryKey,
  useUpdateMyProfile,
  useSetupDriverProfile,
  useVerifyId,
  useRunDriverCheck,
  useSaveDriverProfileDetails,
  canUserOfferRides,
} from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { Car, ShieldCheck, FileSearch, Upload, Loader2, CheckCircle2, CalendarPlus } from "lucide-react";

const STUDENT_ID_DIGITS = 10;

export default function ProfilePage() {
  const { data: me, isLoading } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [university, setUniversity] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");

  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carColor, setCarColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vinNumber, setVinNumber] = useState("");
  const [driversLicenseNumber, setDriversLicenseNumber] = useState("");
  const [upgradeFile, setUpgradeFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [checkBusy, setCheckBusy] = useState(false);
  const [driverConfirmOpen, setDriverConfirmOpen] = useState(false);

  const updateProfile = useUpdateMyProfile();
  const setupDriver = useSetupDriverProfile();
  const verifyId = useVerifyId();
  const driverCheck = useRunDriverCheck();
  const saveDriverDetails = useSaveDriverProfileDetails();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setGender(me.gender ?? "");
    setAge(me.age != null ? String(me.age) : "");
    setUniversity(me.university ?? "");
    setStudentIdNumber((me.studentIdNumber ?? "").replace(/\D/g, "").slice(0, STUDENT_ID_DIGITS));
    setCarMake(me.carMake ?? "");
    setCarModel(me.carModel ?? "");
    setCarColor(me.carColor ?? "");
    setLicensePlate(me.licensePlate ?? "");
    setVinNumber(me.vinNumber ?? "");
    setDriversLicenseNumber(me.driversLicenseNumber ?? "");
  }, [me]);

  const saveBasics = async () => {
    const digits = studentIdNumber.replace(/\D/g, "");
    if (digits.length !== STUDENT_ID_DIGITS) {
      toast({ title: "Student ID must be 10 digits", variant: "destructive" });
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!gender || Number.isNaN(ageNum) || ageNum < 16) {
      toast({ title: "Check gender and age", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        data: {
          name: name.trim(),
          gender,
          age: ageNum,
          university: university.trim(),
          studentIdNumber: digits,
        },
      });
      refresh();
      toast({ title: "Profile updated" });
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.error, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const buildDriverPayload = () => {
    const ageNum = parseInt(age, 10);
    const digits = studentIdNumber.replace(/\D/g, "");
    return {
      gender: gender as "male" | "female" | "other" | "prefer_not_to_say",
      age: ageNum,
      university: university.trim(),
      studentIdNumber: digits,
      licensePlate: licensePlate.trim(),
      vinNumber: vinNumber.trim(),
      driversLicenseNumber: driversLicenseNumber.trim(),
      carMake: carMake.trim(),
      carModel: carModel.trim(),
      carColor: carColor.trim(),
    };
  };

  const validateDriverForm = () => {
    const ageNum = parseInt(age, 10);
    if (!gender || Number.isNaN(ageNum) || ageNum < 16) {
      toast({ title: "Set gender and age", variant: "destructive" });
      return false;
    }
    const digits = studentIdNumber.replace(/\D/g, "");
    if (digits.length !== STUDENT_ID_DIGITS) {
      toast({ title: "Student ID must be 10 digits", variant: "destructive" });
      return false;
    }
    if (!carMake.trim() || !carModel.trim() || !carColor.trim() || !licensePlate.trim() || !vinNumber.trim() || !driversLicenseNumber.trim()) {
      toast({ title: "Fill all vehicle & license fields", variant: "destructive" });
      return false;
    }
    if (vinNumber.replace(/\s/g, "").length < 11) {
      toast({ title: "VIN looks too short", variant: "destructive" });
      return false;
    }
    return true;
  };

  const submitDriverUpgrade = async () => {
    if (!me) return;
    if (!validateDriverForm()) return;
    if (!me.idVerified && !upgradeFile) {
      toast({ title: "Upload an ID photo", variant: "destructive" });
      return;
    }
    setUpgradeBusy(true);
    try {
      await setupDriver.mutateAsync({ data: buildDriverPayload() });
      if (!me.idVerified) await verifyId.mutateAsync();
      await driverCheck.mutateAsync();
      refresh();
      toast({ title: "You’re a verified driver!" });
      setUpgradeFile(null);
    } catch (e: any) {
      toast({ title: "Could not complete driver setup", description: e?.error, variant: "destructive" });
    } finally {
      setUpgradeBusy(false);
    }
  };

  const confirmSaveDriverEdits = async () => {
    if (!validateDriverForm()) return;
    setDriverConfirmOpen(false);
    setUpgradeBusy(true);
    try {
      await saveDriverDetails.mutateAsync({
        data: buildDriverPayload(),
        clearDriverCheck: true,
      });
      toast({
        title:
          "Saved — vehicle/license changed, driver check cleared; run Driver check below to post rides again.",
      });
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.error, variant: "destructive" });
    } finally {
      setUpgradeBusy(false);
    }
  };

  const runCheckOnly = async () => {
    setCheckBusy(true);
    try {
      await driverCheck.mutateAsync();
      refresh();
      toast({ title: "Driver check complete" });
    } catch (e: any) {
      toast({ title: "Check failed", description: e?.error, variant: "destructive" });
    } finally {
      setCheckBusy(false);
    }
  };

  const driverFormFields = (
    <>
      <p className="text-sm text-muted-foreground">Same questions as registration: your details, then vehicle & license.</p>
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
          <Label htmlFor="d-age">Age</Label>
          <Input id="d-age" type="number" min={16} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="d-uni">University</Label>
          <Input id="d-uni" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University of Texas at Arlington" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-sid">Student ID ({STUDENT_ID_DIGITS} digits)</Label>
          <Input
            id="d-sid"
            inputMode="numeric"
            value={studentIdNumber}
            onChange={(e) => setStudentIdNumber(e.target.value.replace(/\D/g, "").slice(0, STUDENT_ID_DIGITS))}
            maxLength={STUDENT_ID_DIGITS}
          />
        </div>
      </div>
      <div className="pt-2 border-t space-y-3">
        <h4 className="font-semibold flex items-center gap-2 text-sm"><Car className="w-4 h-4 text-primary" /> Vehicle & license</h4>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Car make</Label><Input value={carMake} onChange={(e) => setCarMake(e.target.value)} /></div>
          <div className="space-y-2"><Label>Model</Label><Input value={carModel} onChange={(e) => setCarModel(e.target.value)} /></div>
          <div className="space-y-2"><Label>Color</Label><Input value={carColor} onChange={(e) => setCarColor(e.target.value)} /></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>License plate</Label><Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} /></div>
          <div className="space-y-2"><Label>VIN</Label><Input value={vinNumber} onChange={(e) => setVinNumber(e.target.value)} /></div>
          <div className="space-y-2"><Label>Driver&apos;s license #</Label><Input value={driversLicenseNumber} onChange={(e) => setDriversLicenseNumber(e.target.value)} /></div>
        </div>
      </div>
    </>
  );

  if (isLoading || !me) {
    return (
      <Layout>
        <div className="h-64 animate-pulse bg-muted rounded-xl max-w-2xl mx-auto" />
      </Layout>
    );
  }

  if (me.userType === "organization") {
    return <OrganizationProfileSection me={me} />;
  }

  const isRider = me.userType === "rider";
  const isDriver = me.userType === "driver";
  const driverOk = canUserOfferRides(me);
  const driverPending = isDriver && !me.driverHistoryChecked && me.idVerified;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1">Update your account. Driver onboarding uses the same questions as registration.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="secondary">{me.userType ?? "unknown"}</Badge>
            {me.idVerified && <Badge className="bg-emerald-600">ID verified</Badge>}
            {isDriver && me.driverHistoryChecked && <Badge className="bg-sky-600">Driver check OK</Badge>}
            {driverOk && <Badge>Can offer rides</Badge>}
          </div>
        </div>

        <Card className="border-0 ring-1 ring-border/40">
          <CardContent className="p-8 space-y-5">
            <h2 className="text-lg font-semibold">Account</h2>
            <div className="space-y-2">
              <Label htmlFor="pname">Name</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
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
                <Label htmlFor="page">Age</Label>
                <Input id="page" type="number" min={16} value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="puni">University</Label>
                <Input id="puni" value={university} onChange={(e) => setUniversity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="psid">Student ID ({STUDENT_ID_DIGITS} digits)</Label>
                <Input
                  id="psid"
                  inputMode="numeric"
                  value={studentIdNumber}
                  onChange={(e) => setStudentIdNumber(e.target.value.replace(/\D/g, "").slice(0, STUDENT_ID_DIGITS))}
                  maxLength={STUDENT_ID_DIGITS}
                />
              </div>
            </div>
            <Button type="button" className="rounded-full" onClick={saveBasics} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save account details
            </Button>
          </CardContent>
        </Card>

        {isRider && (
          <Card className="border-0 ring-1 ring-primary/25 bg-primary/5">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Become a driver</h2>
              </div>
              {driverFormFields}
              {!me.idVerified && (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                  <Label>ID photo</Label>
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setUpgradeFile(e.target.files?.[0] ?? null)} />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" className="rounded-full" onClick={() => fileRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Choose photo
                    </Button>
                    {upgradeFile ? (
                      <span className="text-sm text-emerald-700 flex items-center gap-1"><ImageIcon className="w-4 h-4" /> {upgradeFile.name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Required if not yet verified</span>
                    )}
                  </div>
                </div>
              )}
              <Button type="button" className="rounded-full" onClick={submitDriverUpgrade} disabled={upgradeBusy}>
                {upgradeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Submit driver application
              </Button>
            </CardContent>
          </Card>
        )}

        {isDriver && (
          <Card className="border-0 ring-1 ring-border/40">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Car className="w-5 h-5 text-primary" /> Driver & vehicle</h2>
              <p className="text-sm text-muted-foreground">Saving edits clears your driver check until you run it again. You’ll be asked to confirm.</p>
              {driverFormFields}
              <Button type="button" variant="secondary" className="rounded-full" onClick={() => setDriverConfirmOpen(true)} disabled={upgradeBusy}>
                Save driver & vehicle changes…
              </Button>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={driverConfirmOpen} onOpenChange={setDriverConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update driver details?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? Changing vehicle or license information clears your driver history check until you run it again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction type="button" onClick={confirmSaveDriverEdits}>
                Yes, save changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {driverPending && (
          <Card className="border-0 ring-1 ring-amber-200 bg-amber-50/80 dark:bg-amber-950/20">
            <CardContent className="p-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <FileSearch className="w-10 h-10 text-amber-700 shrink-0" />
              <div className="flex-1">
                <h2 className="font-semibold text-amber-900 dark:text-amber-100">Finish driver verification</h2>
                <p className="text-sm text-amber-900/80 dark:text-amber-100/80 mt-1">Run the demo driver history check to offer rides again.</p>
              </div>
              <Button type="button" className="rounded-full shrink-0" onClick={runCheckOnly} disabled={checkBusy}>
                {checkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Run driver check
              </Button>
            </CardContent>
          </Card>
        )}

        {driverOk && (
          <Card className="border-0 ring-1 ring-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-6 flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-8 h-8 shrink-0" />
              <p className="text-sm font-medium">You’re cleared to offer rides. Open an event to see rider requests and open seats.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function OrganizationProfileSection({ me }: { me: { name: string; organizationName?: string | null } }) {
  const [name, setName] = useState(me.name);
  const [orgName, setOrgName] = useState(() => me.organizationName ?? "");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateProfile = useUpdateMyProfile();
  const [saving, setSaving] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        data: { name: name.trim(), organizationName: orgName.trim() },
      });
      refresh();
      toast({ title: "Saved" });
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.error, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization profile</h1>
          <p className="text-muted-foreground mt-1">Update your group&apos;s public name.</p>
        </div>
        <Card className="border-0 ring-1 ring-primary/20 bg-primary/5">
          <CardContent className="p-8 space-y-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-primary" /> Events
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Publish new events with date, location, and description for the community.</p>
            </div>
            <Button type="button" className="rounded-full" asChild>
              <Link href="/events/new">Create new event</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 ring-1 ring-border/40">
          <CardContent className="p-8 space-y-5">
            <div className="space-y-2">
              <Label>Contact name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Organization name</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <Button type="button" className="rounded-full" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
