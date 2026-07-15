export const MINIMUM_AGE = 18;

/** Whole years between a YYYY-MM-DD date-of-birth string and today, or null if unparseable. */
export function ageFromDob(dobString: string): number | null {
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/** True only for a parseable DOB that is 18+ (future dates yield a negative age and fail). */
export function isAdultDob(dobString: string): boolean {
  const age = ageFromDob(dobString);
  return age !== null && age >= MINIMUM_AGE;
}
