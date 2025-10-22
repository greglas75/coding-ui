-- Fix the generation that completed but status wasn't updated
-- Update status to 'completed' for generation 767c2079-8c79-4f29-a187-a0148b1627f2

UPDATE codeframe_generations
SET
  status = 'completed',
  n_themes = (
    SELECT COUNT(*)
    FROM codeframe_hierarchy
    WHERE generation_id = '767c2079-8c79-4f29-a187-a0148b1627f2'
      AND node_type = 'theme'
  ),
  n_codes = (
    SELECT COUNT(*)
    FROM codeframe_hierarchy
    WHERE generation_id = '767c2079-8c79-4f29-a187-a0148b1627f2'
      AND node_type = 'code'
  )
WHERE id = '767c2079-8c79-4f29-a187-a0148b1627f2';
