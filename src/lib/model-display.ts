/**
 * Models' real names (first_name / last_name) are PRIVATE — visible to admins only.
 * Every non-admin surface (public pages, fan/brand dashboards, API responses,
 * emails/notifications about a model, OG metadata) must identify models by
 * username. Do not build display names from first_name/last_name outside
 * src/app/(admin) and src/app/api/admin.
 *
 * Every model row has a username in practice; the fallback only guards the
 * nullable column type.
 */
export function modelDisplayName(model: {
  username?: string | null
}): string {
  return model.username || "EXA Model"
}
