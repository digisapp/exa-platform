-- Fix city name capitalization in models table
-- Converts lowercase or improperly capitalized city names to proper title case
-- e.g., "cumming" -> "Cumming", "new york" -> "New York"

UPDATE models
SET city = INITCAP(city)
WHERE city IS NOT NULL
  AND city != INITCAP(city);
