-- Remove "90%" claims from workshop data

-- Update description: remove the "90% of our runway workshop attendees..." line
UPDATE workshops
SET description = regexp_replace(
  description,
  E'\n\n\\*\\*90% of our runway workshop attendees walk in our Miami Swim Week Shows!\\*\\*\n',
  E'\n',
  'g'
)
WHERE slug = 'miami-swim-week-runway-workshop-2026';

-- Remove "90% of attendees walk in our Miami Swim Week Shows" from highlights array
UPDATE workshops
SET highlights = array_remove(highlights, '90% of attendees walk in our Miami Swim Week Shows')
WHERE slug = 'miami-swim-week-runway-workshop-2026';

-- Update meta_description to remove the 90% claim
UPDATE workshops
SET meta_description = 'Perfect your catwalk and camera-ready skills at our Miami Swim Week Runway Workshop. Workshop attendees get priority casting for our Miami Swim Week Shows.'
WHERE slug = 'miami-swim-week-runway-workshop-2026';
