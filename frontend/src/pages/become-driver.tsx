import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey, useSetupDriverProfile, useVerifyId, useRunDriverCheck } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Car, CheckCircle2, Loader2 } from "lucide-react";

export default function BecomeDriverPage() {
  const { data: user } = useGetMe();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [gender, setGender] = useState(user?.gender ?? "");
  const [age, setAge] = useState(user?.age ? String(user.age) : "");
  const [university, setUniversity] = useState(user?.university ?? "University of Texas at Arlington");
  const [studentIdNumber, setStudentIdNumber] = useState(user?.studentIdNumber ?? "");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carColor, setCarColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vinNumber, setVinNumber] = useState("");
  const [driversLicenseNumber, setDriversLicenseNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setupDriver = useSetupDriverProfile();
  const verifyId = useVerifyId();
  const runDriverCheck = useRunDriverCheck();

  const handleSubmit = async () => {
    if (!gender || !age || !carMake || !carModel || !carColor || !licensePlate || !driversLicenseNumber) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const ageNum = parseInt(age, 10);
    if (Number.isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      toast({ title: "Drivers must be at least 18", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await setupDriver.mutateAsync({
        data: {
          gender,
          age: ageNum,
          university: university.trim(),
          studentIdNumber: studentIdNumber.replace(/\D/g, ""),
          carMake: carMake.trim(),
          carModel: carModel.trim(),
          carColor: carColor.trim(),
          licensePlate: licensePlate.trim().toUpperCase(),
          vinNumber: vinNumber.trim().toUpperCase(),
          driversLicenseNumber: driversLicenseNumber.trim(),
        },
      });
      await verifyId.mutateAsync();
      await runDriverCheck.mutateAsync();
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "You're now a driver!", description: "You can start offering rides." });
      setLocation("/", { replace: true });
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e?.error ?? "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full pb-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Become a Driver</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Add your car details to start offering rides</p>
          </div>
        </div>

        <Card className="border-0 ring-1 ring-border/40 shadow-sm">
          <CardContent className="p-6 space-y-8">

            {/* Personal details */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Personal details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
                  <Label htmlFor="age">Age (must be 18+)</Label>
                  <Input id="age" type="number" min={18} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="uni">University</Label>
                  <Input id="uni" value={university} onChange={(e) => setUniversity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sid">Student ID</Label>
                  <Input id="sid" inputMode="numeric" value={studentIdNumber} onChange={(e) => setStudentIdNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10 digits" />
                </div>
              </div>
            </section>

            {/* Car details */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Car details</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="make">Make</Label>
                  <Input id="make" placeholder="Toyota" value={carMake} onChange={(e) => setCarMake(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" placeholder="Camry" value={carModel} onChange={(e) => setCarModel(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" placeholder="White" value={carColor} onChange={(e) => setCarColor(e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plate">License plate</Label>
                  <Input id="plate" placeholder="ABC-1234" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vin">VIN <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="vin" placeholder="17-character VIN" value={vinNumber} onChange={(e) => setVinNumber(e.target.value)} />
                </div>
              </div>
            </section>

            {/* License */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">License</h2>
              <div className="space-y-1.5">
                <Label htmlFor="dl">Driver's license number</Label>
                <Input id="dl" placeholder="e.g. T12345678" value={driversLicenseNumber} onChange={(e) => setDriversLicenseNumber(e.target.value)} />
              </div>
            </section>

            <div className="flex justify-end pt-2">
              <Button size="lg" className="rounded-full min-w-[200px]" disabled={submitting} onClick={handleSubmit}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Submit &amp; become a driver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
