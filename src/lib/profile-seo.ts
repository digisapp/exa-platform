// Shared SEO copy builder for public model profile pages ([username] and
// [username]/rates). Titles and descriptions are composed from the model's
// public fields so each page is unique — identical boilerplate across ~800
// profiles reads as thin/duplicate content and Google declines to index it.
//
// Only fields that are already public on the rendered page may be used here:
// city/state gated by show_location, focus tags, bio. Never legal names.

const FOCUS_LABELS: Record<string, string> = {
  fashion: "Fashion",
  commercial: "Commercial",
  fitness: "Fitness",
  athlete: "Athlete",
  swimwear: "Swimwear",
  beauty: "Beauty",
  editorial: "Editorial",
  ecommerce: "E-Commerce",
  promo: "Promo",
  lifestyle: "Lifestyle",
  runway: "Runway",
  lingerie: "Lingerie",
  influencer: "Influencer",
  print: "Print",
  streamer: "Streamer",
  ugc: "UGC",
};

export interface ModelSeoFields {
  username: string;
  display_name?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  show_location?: boolean | null;
  focus_tags?: string[] | null;
}

/**
 * The name a profile is publicly known by: the model's opt-in display name
 * when set, otherwise their @username. display_name is typed in by the model
 * herself in Settings (never auto-filled from the admin-only legal-name
 * columns) with copy stating it becomes public and searchable.
 */
export function modelPublicName(model: ModelSeoFields): string {
  return model.display_name?.trim() || model.username;
}

export function modelSeoLocation(model: ModelSeoFields): string | null {
  return model.show_location && model.city && model.state
    ? `${model.city}, ${model.state}`
    : null;
}

export function modelSeoTags(model: ModelSeoFields): string[] {
  return (model.focus_tags || [])
    .map((tag) => FOCUS_LABELS[tag])
    .filter(Boolean)
    .slice(0, 3);
}

/** "Fashion Model in Miami, FL" / "Fashion & Swimwear Model" / "Model" */
export function modelSeoDescriptor(model: ModelSeoFields): string {
  const tags = modelSeoTags(model);
  const location = modelSeoLocation(model);
  const tagPhrase = tags.length ? `${tags.slice(0, 2).join(" & ")} Model` : "Model";
  return location ? `${tagPhrase} in ${location}` : tagPhrase;
}

/** Page title (root layout template appends "| EXA Models"). */
export function modelSeoTitle(model: ModelSeoFields): string {
  const descriptor = modelSeoDescriptor(model);
  const name = modelPublicName(model);
  // With an opt-in display name the title leads with it so the page can rank
  // for real-name searches: "Kaitlin Williams (@kaitlin) — Fashion Model in…"
  const handle = name === model.username ? `@${model.username}` : `${name} (@${model.username})`;
  return descriptor === "Model" ? handle : `${handle} — ${descriptor}`;
}

export function modelSeoDescription(model: ModelSeoFields): string {
  if (model.bio) return model.bio;

  const name = modelPublicName(model);
  const tags = modelSeoTags(model);
  const location = modelSeoLocation(model);
  const intro = tags.length
    ? `${name} is a ${tags.join(", ").toLowerCase()} model`
    : `${name} is a professional model`;
  const based = location ? ` based in ${location}` : "";
  return `${intro}${based} on EXA Models. Book ${name} for photoshoots, events, and brand collaborations, or connect through chat, tips, and video calls.`;
}
