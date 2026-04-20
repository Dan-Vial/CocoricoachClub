-- Clean up duplicate periodization_categories: keep only the oldest row per (category_id, name)
DELETE FROM periodization_categories
WHERE id NOT IN (
  SELECT DISTINCT ON (category_id, name) id
  FROM periodization_categories
  ORDER BY category_id, name, created_at ASC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE periodization_categories
ADD CONSTRAINT periodization_categories_category_id_name_unique UNIQUE (category_id, name);