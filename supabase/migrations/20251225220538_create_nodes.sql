-- Migration: Create nodes table
-- Purpose: Store flowchart nodes for PRD builder with ownership via projects
-- Security: RLS enabled, access controlled via project ownership
-- Created: 2024-12-25

-- =====================================================
-- TABLE: nodes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    category_id UUID NOT NULL,
    parent_node_id UUID,
    title TEXT NOT NULL,
    priority TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Foreign Key Constraints
    CONSTRAINT fk_nodes_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_nodes_category
        FOREIGN KEY (category_id)
        REFERENCES public.node_categories(id),

    CONSTRAINT fk_nodes_parent
        FOREIGN KEY (parent_node_id)
        REFERENCES public.nodes(id)
        ON DELETE CASCADE,

    -- Validation Constraints
    CONSTRAINT nodes_title_length
        CHECK (char_length(trim(title)) >= 1 AND char_length(trim(title)) <= 200),

    CONSTRAINT nodes_priority_values
        CHECK (priority IS NULL OR priority IN ('core', 'important', 'nice_to_have', 'future')),

    CONSTRAINT nodes_status_values
        CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),

    -- Unique Constraint: No duplicate titles under same parent within same project
    CONSTRAINT nodes_unique_title_per_parent
        UNIQUE (project_id, parent_node_id, title)
);

-- =====================================================
-- INDEXES (Performance Optimization)
-- =====================================================
-- Single column indexes
CREATE INDEX idx_nodes_project_id ON public.nodes(project_id);
CREATE INDEX idx_nodes_parent_node_id ON public.nodes(parent_node_id);
CREATE INDEX idx_nodes_category_id ON public.nodes(category_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_nodes_project_status ON public.nodes(project_id, status);
CREATE INDEX idx_nodes_project_priority ON public.nodes(project_id, priority);

-- Index for updated_at ordering (recent nodes first)
CREATE INDEX idx_nodes_updated_at ON public.nodes(updated_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anon and public roles
REVOKE ALL ON public.nodes FROM anon;
REVOKE ALL ON public.nodes FROM public;

-- Grant table access to authenticated users (policies will control row access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes TO authenticated;

-- Policy: Users can view nodes only in projects they own
CREATE POLICY "Users can view nodes in their projects"
    ON public.nodes
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Policy: Users can insert nodes only in projects they own
CREATE POLICY "Users can insert nodes in their projects"
    ON public.nodes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Policy: Users can update nodes only in projects they own
CREATE POLICY "Users can update nodes in their projects"
    ON public.nodes
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Policy: Users can delete nodes only in projects they own
CREATE POLICY "Users can delete nodes in their projects"
    ON public.nodes
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nodes_updated_at_trigger
    BEFORE UPDATE ON public.nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_nodes_updated_at();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify correctness:
--
-- Test 1: Verify table structure
-- \d nodes;
-- Expected: All columns with correct types, constraints, and foreign keys
--
-- Test 2: Verify indexes
-- \di nodes*
-- Expected: 6 indexes (1 primary key + 5 custom)
--
-- Test 3: Test title length constraint
-- INSERT INTO nodes (project_id, category_id, title, position_x, position_y)
-- VALUES ('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, '', 0, 0);
-- Expected: ERROR - title too short
--
-- Test 4: Test priority constraint
-- INSERT INTO nodes (project_id, category_id, title, priority, position_x, position_y)
-- VALUES ('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Test', 'invalid', 0, 0);
-- Expected: ERROR - invalid priority value
--
-- Test 5: Test status constraint
-- INSERT INTO nodes (project_id, category_id, title, status, position_x, position_y)
-- VALUES ('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Test', 'invalid', 0, 0);
-- Expected: ERROR - invalid status value
--
-- Test 6: Test RLS with mock project (requires existing test user and project)
-- -- Setup: Create test project as authenticated user
-- SET ROLE authenticated;
-- SET request.jwt.claims.sub TO '<test_user_uuid>';
--
-- -- Insert test node in owned project
-- INSERT INTO nodes (project_id, category_id, title, position_x, position_y)
-- SELECT id, (SELECT id FROM node_categories WHERE name = 'root'), 'Test Node', 0, 0
-- FROM projects
-- WHERE user_id = '<test_user_uuid>'
-- LIMIT 1;
-- Expected: SUCCESS
--
-- -- Try to view own nodes
-- SELECT count(*) FROM nodes;
-- Expected: >= 1 (can see own nodes)
--
-- -- Try to insert node in another user's project
-- INSERT INTO nodes (project_id, category_id, title, position_x, position_y)
-- SELECT id, (SELECT id FROM node_categories WHERE name = 'root'), 'Hack Attempt', 0, 0
-- FROM projects
-- WHERE user_id != '<test_user_uuid>'
-- LIMIT 1;
-- Expected: ERROR - RLS policy violation or 0 rows affected
--
-- Test 7: Test CASCADE DELETE from project
-- -- Delete project should cascade delete all its nodes
-- DELETE FROM projects WHERE id = '<test_project_id>';
-- Expected: Nodes in that project are also deleted
--
-- Test 8: Test CASCADE DELETE from parent node
-- -- Create parent-child node relationship
-- INSERT INTO nodes (project_id, category_id, parent_node_id, title, position_x, position_y)
-- VALUES ('<project_id>', '<category_id>', '<parent_node_id>', 'Child Node', 0, 0);
-- -- Delete parent node
-- DELETE FROM nodes WHERE id = '<parent_node_id>';
-- Expected: Child nodes are also deleted
--
-- Test 9: Test unique constraint on title per parent
-- -- Insert two nodes with same title under same parent
-- INSERT INTO nodes (project_id, category_id, parent_node_id, title, position_x, position_y)
-- VALUES ('<project_id>', '<category_id>', '<parent_id>', 'Duplicate', 0, 0);
-- INSERT INTO nodes (project_id, category_id, parent_node_id, title, position_x, position_y)
-- VALUES ('<project_id>', '<category_id>', '<parent_id>', 'Duplicate', 0, 0);
-- Expected: ERROR - unique constraint violation
--
-- Test 10: Verify updated_at trigger
-- -- Update a node and check if updated_at changes
-- UPDATE nodes SET title = 'New Title' WHERE id = '<node_id>';
-- SELECT updated_at FROM nodes WHERE id = '<node_id>';
-- Expected: updated_at is more recent than created_at

-- =====================================================
-- SECURITY NOTES
-- =====================================================
-- 1. Ownership Hierarchy:
--    - Nodes are owned via projects (user_id → projects → nodes)
--    - RLS policies use EXISTS subquery to verify project ownership
--    - No direct user_id column on nodes (normalized design)
--
-- 2. Defense in Depth:
--    - RLS policies at database level
--    - Client-side queries should still filter by project_id explicitly
--    - Foreign key constraints prevent orphaned nodes
--
-- 3. Cascade Behavior:
--    - Delete project → cascades to all nodes in project
--    - Delete parent node → cascades to all child nodes
--    - This maintains referential integrity
--
-- 4. No IDOR Vulnerabilities:
--    - Node IDs are UUIDs (not easily guessable)
--    - RLS prevents access to nodes in other users' projects
--    - Generic error messages (no information disclosure)
--
-- 5. Input Validation:
--    - title: 1-200 chars (database CHECK constraint)
--    - priority: enum values (database CHECK constraint)
--    - status: enum values (database CHECK constraint)
--    - Client-side should use Zod for additional validation
