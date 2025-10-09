-- Update get_category_stats function to include global_blacklist
-- This adds the GLOBAL BL column to the categories table

-- First, drop the existing function
DROP FUNCTION IF EXISTS get_category_stats();

-- Create the new function with global_blacklist column
CREATE FUNCTION get_category_stats()
RETURNS TABLE(
  category_id int,
  whitelisted bigint,
  blacklisted bigint,
  gibberish bigint,
  categorized bigint,
  not_categorized bigint,
  global_blacklist bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.category_id::int,
    COUNT(*) FILTER (WHERE a.general_status = 'whitelist')::bigint as whitelisted,
    COUNT(*) FILTER (WHERE a.general_status = 'blacklist')::bigint as blacklisted,
    COUNT(*) FILTER (WHERE a.general_status = 'gibberish')::bigint as gibberish,
    COUNT(*) FILTER (WHERE a.general_status = 'categorized')::bigint as categorized,
    COUNT(*) FILTER (WHERE a.general_status = 'uncategorized')::bigint as not_categorized,
    COUNT(*) FILTER (WHERE a.general_status = 'global_blacklist')::bigint as global_blacklist
  FROM answers a
  WHERE a.category_id IS NOT NULL
  GROUP BY a.category_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_category_stats() TO anon, authenticated;

-- Test the function
SELECT * FROM get_category_stats() LIMIT 5;
