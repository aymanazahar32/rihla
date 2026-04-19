/** Viewer shape from useGetMe (null = logged out — browse-only, no filtering). */
export type GenderViewer = {
  id: string;
  gender: string | null;
  userType: string | null;
} | null;

/** Strict male↔female hiding for riders/drivers. Organizations see everyone. Logged-out users see everyone (browse). */
export function maySeePersonByGender(viewer: GenderViewer, otherGender: string | null | undefined): boolean {
  if (!viewer) return true;
  if (viewer.userType === "organization") return true;
  const v = viewer.gender;
  const o = otherGender ?? null;
  if (v === "male" && o === "female") return false;
  if (v === "female" && o === "male") return false;
  return true;
}

export function displayNameForGenderPolicy(
  viewer: GenderViewer,
  subjectUserId: string,
  subjectName: string,
  subjectGender: string | null | undefined,
): string {
  if (!viewer || viewer.id === subjectUserId) return subjectName;
  if (!maySeePersonByGender(viewer, subjectGender)) return "Member";
  return subjectName;
}
