import { Link } from "wouter";
import { useGetErrand } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { errandCategoryClass } from "@/lib/errand-category-styles";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { RidesAndRequests } from "@/components/RidesAndRequests";

export default function ErrandDetailPage({ errandId }: { errandId: number }) {
  const { data: errand, isLoading } = useGetErrand(errandId);

  if (isLoading) return <Layout><div className="h-64 animate-pulse bg-muted rounded-xl" /></Layout>;
  if (!errand) return <Layout><div className="text-center py-16 text-muted-foreground">Errand not found.</div></Layout>;

  return (
    <Layout>
      <div className="mb-4 w-full flex justify-start">
        <Button variant="ghost" size="sm" className="-ml-2 shrink-0" asChild>
          <Link href="/errands" className="inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to errands
          </Link>
        </Button>
      </div>
      <div className="mb-8">
        <Badge className={`mb-3 font-medium ${errandCategoryClass(errand.category)}`}>{errand.category}</Badge>
        <h1 className="text-4xl font-bold tracking-tight">{errand.title}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">{errand.description}</p>
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {format(parseISO(errand.scheduledTime), "EEEE, MMM d • h:mm a")}</div>
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {errand.location}</div>
        </div>
      </div>

      <RidesAndRequests
        contextType="errand"
        contextId={errand.id}
        contextLabel={errand.title}
        rideCreateHref={`/rides/new?contextType=errand&contextId=${errand.id}`}
        requestCreateHref={`/requests/new?contextType=errand&contextId=${errand.id}`}
      />
    </Layout>
  );
}
