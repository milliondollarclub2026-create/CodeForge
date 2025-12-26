-- Migration: Create node_categories table
-- Purpose: Store extensible node types for PRD builder flowcharts
-- Security: RLS enabled, read-only for authenticated users
-- Created: 2024-12-25

-- =====================================================
-- TABLE: node_categories
-- =====================================================
CREATE TABLE IF NOT EXISTS public.node_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT node_categories_name_length CHECK (char_length(trim(name)) >= 1 AND char_length(trim(name)) <= 50),
    CONSTRAINT node_categories_color_format CHECK (color ~* '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT node_categories_name_unique UNIQUE (name)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_node_categories_name ON public.node_categories(name);
CREATE INDEX idx_node_categories_is_system ON public.node_categories(is_system);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.node_categories ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anon and public roles
REVOKE ALL ON public.node_categories FROM anon;
REVOKE ALL ON public.node_categories FROM public;

-- Grant table access to authenticated users (policies will control row access)
GRANT SELECT ON public.node_categories TO authenticated;

-- Policy: Authenticated users can view all categories
CREATE POLICY "Authenticated users can view all node categories"
    ON public.node_categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Deny INSERT for now (future: admin-only)
-- System categories are seeded via migration
-- Custom categories will be admin-controlled in future phases
CREATE POLICY "Deny INSERT to all users (admin-only in future)"
    ON public.node_categories
    FOR INSERT
    TO authenticated
    WITH CHECK (false);

-- Policy: Deny UPDATE for now (future: admin-only)
CREATE POLICY "Deny UPDATE to all users (admin-only in future)"
    ON public.node_categories
    FOR UPDATE
    TO authenticated
    USING (false);

-- Policy: Deny DELETE for now (future: admin-only)
-- System categories should never be deleted
CREATE POLICY "Deny DELETE to all users (admin-only in future)"
    ON public.node_categories
    FOR DELETE
    TO authenticated
    USING (false);

-- =====================================================
-- TRIGGER: Auto-update created_at
-- =====================================================
-- Note: created_at won't change after insert, but following existing pattern
-- for consistency with other tables in the system
CREATE OR REPLACE FUNCTION update_node_categories_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_node_categories_created_at_trigger
    BEFORE UPDATE ON public.node_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_node_categories_created_at();

-- =====================================================
-- SEED DATA: System Categories
-- =====================================================
-- These categories are built-in and cannot be modified/deleted by users
-- Color scheme: Purple (root), Blue (feature), Green (audience),
--               Amber (tech), Red (competitor), Pink (database), Teal (integration)
-- Icons: Lucide React icon names (https://lucide.dev)

INSERT INTO public.node_categories (name, color, icon, is_system) VALUES
    ('root', '#8b5cf6', 'Folder', true),
    ('feature', '#3b82f6', 'Zap', true),
    ('target_audience', '#10b981', 'Users', true),
    ('tech_stack', '#f59e0b', 'Code', true),
    ('competitor', '#ef4444', 'TrendingUp', true),
    ('database', '#ec4899', 'Database', true),
    ('integration', '#14b8a6', 'Link', true);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify correctness:
--
-- Test 1: Verify seed data
-- SELECT name, color, icon, is_system FROM node_categories ORDER BY name;
-- Expected: 7 rows, all is_system=true
--
-- Test 2: Verify color constraint
-- INSERT INTO node_categories (name, color, icon)
-- VALUES ('test', 'invalid-color', 'Star');
-- Expected: ERROR - color constraint violation
--
-- Test 3: Verify name length constraint
-- INSERT INTO node_categories (name, color)
-- VALUES ('', '#ff0000');
-- Expected: ERROR - name too short
--
-- Test 4: Verify RLS blocks anon inserts
-- SET ROLE anon;
-- INSERT INTO node_categories (name, color)
-- VALUES ('custom', '#ff0000');
-- Expected: ERROR - RLS policy violation
--
-- Test 5: Verify authenticated can SELECT
-- SET ROLE authenticated;
-- SELECT count(*) FROM node_categories;
-- Expected: 7
