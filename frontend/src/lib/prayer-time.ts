import { format, isValid, parse } from "date-fns";

/** Parse masjid timetable strings like "1:20 PM" against a calendar day (default: today local). */
export function parseMasjidTimeToDate(timeStr: string, refDate: Date = new Date()): Date | null {
  const t = timeStr?.trim();
  if (!t) return null;
  for (const pattern of ["h:mm a", "hh:mm a", "H:mm", "HH:mm"]) {
    const d = parse(t, pattern, refDate);
    if (isValid(d)) return d;
  }
  return null;
}

export function toDatetimeLocalValue(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function masjidPrayerField(prayerName: string): keyof { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string; jumuah: string } | null {
  const k = prayerName.toLowerCase();
  if (k === "jumuah") return "jumuah";
  if (["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(k)) return k as "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  return null;
}
