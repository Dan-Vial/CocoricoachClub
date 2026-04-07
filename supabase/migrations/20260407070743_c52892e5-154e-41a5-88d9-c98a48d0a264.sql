
-- Remove old single-schedule wellness reminder cron
SELECT cron.unschedule('wellness-reminder-daily');

-- Create two cron jobs: 6 UTC (=8h CEST summer) and 7 UTC (=8h CET winter)
-- The edge function has a timezone guard and will skip if it's not 8h in Paris
SELECT cron.schedule(
  'wellness-reminder-summer',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mbloebaovvvgfwxsdzgo.supabase.co/functions/v1/scheduled-wellness-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ibG9lYmFvdnZ2Z2Z3eHNkemdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc0NzksImV4cCI6MjA3ODU5MzQ3OX0.o2SMHIz5Vg34bhLErBlMT1Ign6enDcHTzhbIzMIkJLE"}'::jsonb,
    body := concat('{"triggered_at": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'wellness-reminder-winter',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mbloebaovvvgfwxsdzgo.supabase.co/functions/v1/scheduled-wellness-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ibG9lYmFvdnZ2Z2Z3eHNkemdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc0NzksImV4cCI6MjA3ODU5MzQ3OX0.o2SMHIz5Vg34bhLErBlMT1Ign6enDcHTzhbIzMIkJLE"}'::jsonb,
    body := concat('{"triggered_at": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
