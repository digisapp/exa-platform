-- Fix model usernames that look like emails (missing @ stripped by sanitization)
-- e.g. "annad3014gmailcom" from "annad3014@gmail.com" entered in the Instagram field

-- Fix known case: annad3014gmailcom -> annadudka
UPDATE models
SET username = 'annadudka'
WHERE username IN ('annad3014gmailcom', 'annad3014');

-- Fix any other models whose username contains a mail provider suffix
-- These are clearly email-derived usernames where the domain leaked through
UPDATE models
SET username = regexp_replace(username, '(gmail|yahoo|hotmail|outlook|icloud|aol|protonmail|mail)(com|net|org|co|io)$', '')
WHERE username ~ '(gmail|yahoo|hotmail|outlook|icloud|aol|protonmail|mail)(com|net|org|co|io)$';
