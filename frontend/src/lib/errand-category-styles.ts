/** Consistent badge colours for errand categories (list + detail). */
export const ERRAND_CATEGORY_STYLES: Record<string, string> = {
  Groceries: "bg-emerald-100 text-emerald-800 border-0",
  Shopping: "bg-sky-100 text-sky-800 border-0",
  Travel: "bg-violet-100 text-violet-800 border-0",
  Errands: "bg-amber-100 text-amber-900 border-0",
};

export function errandCategoryClass(category: string): string {
  return ERRAND_CATEGORY_STYLES[category] ?? "bg-stone-100 text-stone-800 border-0";
}
