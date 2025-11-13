-- Check if AI Chat app definition exists
SELECT 
  id,
  key,
  name,
  app_type,
  is_active,
  created_at
FROM app_definitions
WHERE key = 'ai-chat';

-- If no rows returned, the migration didn't work
-- If rows returned, the issue is elsewhere
