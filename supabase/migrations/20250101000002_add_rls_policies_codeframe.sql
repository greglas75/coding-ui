-- Migration: Add Row Level Security (RLS) policies for codeframe tables
-- Description: Implements security policies to ensure users can only access their own data
-- Dependencies: Requires previous migrations and Supabase Auth

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE codeframe_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE codeframe_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper function for ownership checks
-- ============================================================================

-- Function to check if user owns a category
CREATE OR REPLACE FUNCTION user_owns_category(category_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM categories
        WHERE id = category_id_param
            AND created_by = auth.jwt() ->> 'email'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_owns_category IS
'Check if current authenticated user owns the specified category';

-- Function to check if user owns a generation (via category ownership)
CREATE OR REPLACE FUNCTION user_owns_generation(generation_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM codeframe_generations cg
        JOIN categories c ON c.id = cg.category_id
        WHERE cg.id = generation_id_param
            AND c.created_by = auth.jwt() ->> 'email'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_owns_generation IS
'Check if current authenticated user owns the specified codeframe generation';

-- ============================================================================
-- RLS Policies: codeframe_generations
-- ============================================================================

-- Policy: Users can view their own generations
CREATE POLICY "Users can view own codeframe generations"
    ON codeframe_generations
    FOR SELECT
    USING (
        category_id IN (
            SELECT id FROM categories
            WHERE created_by = auth.jwt() ->> 'email'
        )
    );

-- Policy: Users can insert generations for their own categories
CREATE POLICY "Users can create codeframe generations for own categories"
    ON codeframe_generations
    FOR INSERT
    WITH CHECK (
        user_owns_category(category_id)
    );

-- Policy: Users can update their own generations
CREATE POLICY "Users can update own codeframe generations"
    ON codeframe_generations
    FOR UPDATE
    USING (
        category_id IN (
            SELECT id FROM categories
            WHERE created_by = auth.jwt() ->> 'email'
        )
    )
    WITH CHECK (
        category_id IN (
            SELECT id FROM categories
            WHERE created_by = auth.jwt() ->> 'email'
        )
    );

-- Policy: Users can delete their own generations
CREATE POLICY "Users can delete own codeframe generations"
    ON codeframe_generations
    FOR DELETE
    USING (
        category_id IN (
            SELECT id FROM categories
            WHERE created_by = auth.jwt() ->> 'email'
        )
    );

-- ============================================================================
-- RLS Policies: codeframe_hierarchy
-- ============================================================================

-- Policy: Users can view hierarchy nodes from their own generations
CREATE POLICY "Users can view own codeframe hierarchy"
    ON codeframe_hierarchy
    FOR SELECT
    USING (
        user_owns_generation(generation_id)
    );

-- Policy: Users can insert hierarchy nodes for their own generations
CREATE POLICY "Users can create codeframe hierarchy for own generations"
    ON codeframe_hierarchy
    FOR INSERT
    WITH CHECK (
        user_owns_generation(generation_id)
    );

-- Policy: Users can update their own hierarchy nodes
CREATE POLICY "Users can update own codeframe hierarchy"
    ON codeframe_hierarchy
    FOR UPDATE
    USING (
        user_owns_generation(generation_id)
    )
    WITH CHECK (
        user_owns_generation(generation_id)
    );

-- Policy: Users can delete their own hierarchy nodes
CREATE POLICY "Users can delete own codeframe hierarchy"
    ON codeframe_hierarchy
    FOR DELETE
    USING (
        user_owns_generation(generation_id)
    );

-- ============================================================================
-- RLS Policies: answer_embeddings
-- ============================================================================

-- Policy: Users can view embeddings for answers in their categories
CREATE POLICY "Users can view embeddings for own answers"
    ON answer_embeddings
    FOR SELECT
    USING (
        answer_id IN (
            SELECT a.id
            FROM answers a
            JOIN categories c ON c.id = a.category_id
            WHERE c.created_by = auth.jwt() ->> 'email'
        )
    );

-- Policy: Users can insert embeddings for answers in their categories
CREATE POLICY "Users can create embeddings for own answers"
    ON answer_embeddings
    FOR INSERT
    WITH CHECK (
        answer_id IN (
            SELECT a.id
            FROM answers a
            JOIN categories c ON c.id = a.category_id
            WHERE c.created_by = auth.jwt() ->> 'email'
        )
    );

-- Policy: Users can update embeddings for their own answers
CREATE POLICY "Users can update embeddings for own answers"
    ON answer_embeddings
    FOR UPDATE
    USING (
        answer_id IN (
            SELECT a.id
            FROM answers a
            JOIN categories c ON c.id = a.category_id
            WHERE c.created_by = auth.jwt() ->> 'email'
        )
    )
    WITH CHECK (
        answer_id IN (
            SELECT a.id
            FROM answers a
            JOIN categories c ON c.id = a.category_id
            WHERE c.created_by = auth.jwt() ->> 'email'
        )
    );

-- Policy: Users can delete embeddings for their own answers
CREATE POLICY "Users can delete embeddings for own answers"
    ON answer_embeddings
    FOR DELETE
    USING (
        answer_id IN (
            SELECT a.id
            FROM answers a
            JOIN categories c ON c.id = a.category_id
            WHERE c.created_by = auth.jwt() ->> 'email'
        )
    );

-- ============================================================================
-- Service role bypass (for backend operations)
-- ============================================================================

-- Allow service role to bypass RLS for backend operations
-- Service role policies (full access for backend)

CREATE POLICY "Service role has full access to codeframe_generations"
    ON codeframe_generations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to codeframe_hierarchy"
    ON codeframe_hierarchy
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to answer_embeddings"
    ON answer_embeddings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Grant usage on tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON codeframe_generations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON codeframe_hierarchy TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON answer_embeddings TO authenticated;

-- Grant full access to service role
GRANT ALL ON codeframe_generations TO service_role;
GRANT ALL ON codeframe_hierarchy TO service_role;
GRANT ALL ON answer_embeddings TO service_role;

-- ============================================================================
-- Testing queries (comment out in production)
-- ============================================================================

-- Test ownership function
-- SELECT user_owns_category(1);
-- SELECT user_owns_generation('some-uuid');

-- Test RLS policies
-- SELECT * FROM codeframe_generations; -- Should only show user's own generations
-- SELECT * FROM codeframe_hierarchy; -- Should only show user's own hierarchy

-- Verify policies are enabled
-- SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'codeframe%';
