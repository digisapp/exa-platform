-- Add category column to auctions table
ALTER TABLE public.auctions
ADD COLUMN category text DEFAULT 'other'
  CHECK (category IN ('video_call', 'custom_content', 'meet_greet', 'shoutout', 'experience', 'other'));
