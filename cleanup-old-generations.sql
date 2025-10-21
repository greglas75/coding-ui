-- Cleanup old failed generations
-- Run this in Supabase SQL Editor to clear failed generations

-- Delete old codeframe generations (keep only last 5 completed ones)
DELETE FROM codeframe_generations
WHERE status IN ('failed', 'partial')
OR created_at < NOW() - INTERVAL '24 hours';

-- Reset any stuck "processing" generations older than 1 hour
UPDATE codeframe_generations
SET status = 'failed'
WHERE status = 'processing'
AND created_at < NOW() - INTERVAL '1 hour';
