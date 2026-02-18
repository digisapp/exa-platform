-- Change show_social_media default to true so new models show their social links by default
ALTER TABLE models ALTER COLUMN show_social_media SET DEFAULT true;
