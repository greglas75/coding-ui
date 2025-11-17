-- Migration: Create RPC for fetching codes with usage counts (fixes N+1 query problem)
-- This replaces hundreds of sequential queries with a single aggregated query

CREATE OR REPLACE FUNCTION get_codes_with_usage_counts(
  p_search_text TEXT DEFAULT NULL,
  p_only_whitelisted BOOLEAN DEFAULT FALSE,
  p_category_ids INTEGER[] DEFAULT NULL,
  p_limit INTEGER DEFAULT NULL,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  is_whitelisted BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  category_ids INTEGER[],
  usage_count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH filtered_codes AS (
    SELECT 
      c.id,
      c.name,
      c.is_whitelisted,
      c.created_at,
      c.updated_at,
      COALESCE(array_agg(DISTINCT cc.category_id) FILTER (WHERE cc.category_id IS NOT NULL), ARRAY[]::INTEGER[]) AS category_ids
    FROM codes c
    LEFT JOIN codes_categories cc ON c.id = cc.code_id
    WHERE 
      (p_search_text IS NULL OR c.name ILIKE '%' || p_search_text || '%')
      AND (NOT p_only_whitelisted OR c.is_whitelisted = TRUE)
    GROUP BY c.id, c.name, c.is_whitelisted, c.created_at, c.updated_at
  ),
  category_filtered_codes AS (
    SELECT fc.*
    FROM filtered_codes fc
    WHERE 
      p_category_ids IS NULL 
      OR p_category_ids = ARRAY[]::INTEGER[]
      OR fc.category_ids && p_category_ids  -- Array overlap operator
  ),
  codes_with_counts AS (
    SELECT 
      cfc.*,
      (
        SELECT COUNT(*)
        FROM answers a
        WHERE 
          a.selected_code ILIKE '%' || cfc.name || '%'
          OR a.selected_code = cfc.name
      ) AS usage_count
    FROM category_filtered_codes cfc
    ORDER BY cfc.name
  )
  SELECT *
  FROM codes_with_counts
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_codes_with_usage_counts IS 
'Fetches codes with their category associations and usage counts in a single query.
Supports filtering by search text, whitelist status, and category IDs.
Includes pagination with limit/offset.
Returns usage_count as number of answers using each code.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_codes_with_usage_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_codes_with_usage_counts TO anon;

