-- Migration: Create edges table
-- Purpose: Store connections between nodes in PRD builder flowcharts
-- Security: RLS enabled, access controlled via project ownership
-- Created: 2024-12-25

-- =====================================================
-- TABLE: edges
-- =====================================================
CREATE TABLE IF NOT EXISTS public.edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    source_node_id UUID NOT NULL,
    target_node_id UUID NOT NULL,
    edge_type TEXT NOT NULL DEFAULT 'parent_child',
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Foreign Key Constraints
    CONSTRAINT fk_edges_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_edges_source_node
        FOREIGN KEY (source_node_id)
        REFERENCES public.nodes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_edges_target_node
        FOREIGN KEY (target_node_id)
        REFERENCES public.nodes(id)
        ON DELETE CASCADE,

    -- Validation Constraints
    CONSTRAINT edges_type_values
        CHECK (edge_type IN ('parent_child', 'depends_on', 'implements', 'related_to', 'conflicts_with')),

    CONSTRAINT edges_label_length
        CHECK (label IS NULL OR char_length(label) <= 100),

    CONSTRAINT edges_no_self_loop
        CHECK (source_node_id != target_node_id),

    -- Unique Constraint: No duplicate edges between same nodes with same type
    CONSTRAINT edges_unique_connection
        UNIQUE (source_node_id, target_node_id, edge_type)
);

-- =====================================================
-- INDEXES (Performance Optimization)
-- =====================================================
-- Single column indexes
CREATE INDEX idx_edges_project_id ON public.edges(project_id);
CREATE INDEX idx_edges_source_node_id ON public.edges(source_node_id);
CREATE INDEX idx_edges_target_node_id ON public.edges(target_node_id);
CREATE INDEX idx_edges_edge_type ON public.edges(edge_type);

-- Composite indexes for common query patterns
CREATE INDEX idx_edges_project_source ON public.edges(project_id, source_node_id);
CREATE INDEX idx_edges_project_target ON public.edges(project_id, target_node_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anon and public roles
REVOKE ALL ON public.edges FROM anon;
REVOKE ALL ON public.edges FROM public;

-- Grant table access to authenticated users (policies will control row access)
GRANT SELECT, INSERT, DELETE ON public.edges TO authenticated;

-- Policy: Users can view edges only in projects they own
CREATE POLICY "Users can view edges in their projects"
    ON public.edges
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = edges.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Policy: Users can insert edges only in projects they own
-- Additional check: Both source and target nodes must belong to the project
CREATE POLICY "Users can insert edges in their projects"
    ON public.edges
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = edges.project_id
              AND projects.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1
            FROM public.nodes
            WHERE nodes.id = edges.source_node_id
              AND nodes.project_id = edges.project_id
        )
        AND EXISTS (
            SELECT 1
            FROM public.nodes
            WHERE nodes.id = edges.target_node_id
              AND nodes.project_id = edges.project_id
        )
    );

-- Policy: Users can delete edges only in projects they own
CREATE POLICY "Users can delete edges in their projects"
    ON public.edges
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = edges.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Note: No UPDATE policy - edges are immutable
-- To change an edge, delete and recreate it

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify correctness:
--
-- Test 1: Verify table structure
-- \d edges;
-- Expected: All columns with correct types, constraints, and foreign keys
--
-- Test 2: Verify indexes
-- \di edges*
-- Expected: 7 indexes (1 primary key + 6 custom)
--
-- Test 3: Test edge_type constraint
-- INSERT INTO edges (project_id, source_node_id, target_node_id, edge_type)
-- VALUES ('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'invalid_type');
-- Expected: ERROR - invalid edge_type value
--
-- Test 4: Test label length constraint
-- INSERT INTO edges (project_id, source_node_id, target_node_id, label)
-- VALUES ('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, repeat('x', 101));
-- Expected: ERROR - label too long
--
-- Test 5: Test self-loop prevention
-- INSERT INTO edges (project_id, source_node_id, target_node_id)
-- VALUES ('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid);
-- Expected: ERROR - self-loop check violation
--
-- Test 6: Create valid edge between two nodes (requires existing project and nodes)
-- -- Setup: Get existing project and create two test nodes
-- SET ROLE authenticated;
-- SET request.jwt.claims.sub TO '<test_user_uuid>';
--
-- -- Get project ID
-- SELECT id FROM projects WHERE user_id = '<test_user_uuid>' LIMIT 1;
-- -- Save as <project_id>
--
-- -- Create parent node
-- INSERT INTO nodes (project_id, category_id, title, position_x, position_y)
-- VALUES ('<project_id>', (SELECT id FROM node_categories WHERE name = 'root'), 'Parent Node', 0, 0)
-- RETURNING id;
-- -- Save as <parent_node_id>
--
-- -- Create child node
-- INSERT INTO nodes (project_id, category_id, title, position_x, position_y)
-- VALUES ('<project_id>', (SELECT id FROM node_categories WHERE name = 'feature'), 'Child Node', 100, 100)
-- RETURNING id;
-- -- Save as <child_node_id>
--
-- -- Create edge between nodes
-- INSERT INTO edges (project_id, source_node_id, target_node_id, edge_type)
-- VALUES ('<project_id>', '<parent_node_id>', '<child_node_id>', 'parent_child')
-- RETURNING *;
-- Expected: SUCCESS - edge created
--
-- Test 7: Prevent duplicate edge
-- INSERT INTO edges (project_id, source_node_id, target_node_id, edge_type)
-- VALUES ('<project_id>', '<parent_node_id>', '<child_node_id>', 'parent_child');
-- Expected: ERROR - unique constraint violation
--
-- Test 8: Test RLS - try to view own edges
-- SELECT count(*) FROM edges WHERE project_id = '<project_id>';
-- Expected: >= 1 (can see own edges)
--
-- Test 9: Test RLS - try to insert edge in another user's project
-- -- Get another user's project
-- SELECT id FROM projects WHERE user_id != '<test_user_uuid>' LIMIT 1;
-- -- Try to create edge in that project
-- INSERT INTO edges (project_id, source_node_id, target_node_id)
-- VALUES ('<other_project_id>', '<parent_node_id>', '<child_node_id>');
-- Expected: ERROR - RLS policy violation or 0 rows affected
--
-- Test 10: Test CASCADE DELETE from project
-- -- Delete project should cascade delete all its edges
-- DELETE FROM projects WHERE id = '<test_project_id>';
-- SELECT count(*) FROM edges WHERE project_id = '<test_project_id>';
-- Expected: 0 (edges deleted with project)
--
-- Test 11: Test CASCADE DELETE from node
-- -- Delete node should cascade delete all edges connected to it
-- -- Create fresh test setup
-- INSERT INTO nodes (project_id, category_id, title, position_x, position_y)
-- VALUES ('<project_id>', (SELECT id FROM node_categories WHERE name = 'feature'), 'Test Node', 0, 0)
-- RETURNING id;
-- -- Save as <node_id>
--
-- INSERT INTO edges (project_id, source_node_id, target_node_id, edge_type)
-- VALUES ('<project_id>', '<parent_node_id>', '<node_id>', 'parent_child');
--
-- -- Verify edge exists
-- SELECT count(*) FROM edges WHERE target_node_id = '<node_id>';
-- Expected: 1
--
-- -- Delete the target node
-- DELETE FROM nodes WHERE id = '<node_id>';
--
-- -- Verify edge is gone
-- SELECT count(*) FROM edges WHERE target_node_id = '<node_id>';
-- Expected: 0 (edge auto-deleted via CASCADE)
--
-- Test 12: Test different edge types
-- INSERT INTO edges (project_id, source_node_id, target_node_id, edge_type, label)
-- VALUES ('<project_id>', '<node1_id>', '<node2_id>', 'depends_on', 'Requires API'),
--        ('<project_id>', '<node1_id>', '<node3_id>', 'implements', 'Implements feature'),
--        ('<project_id>', '<node2_id>', '<node3_id>', 'related_to', 'Similar feature'),
--        ('<project_id>', '<node4_id>', '<node5_id>', 'conflicts_with', 'Cannot coexist');
-- Expected: SUCCESS - all edge types accepted

-- =====================================================
-- SECURITY NOTES
-- =====================================================
-- 1. Ownership Hierarchy:
--    - Edges are owned via projects (user_id → projects → edges)
--    - RLS policies use EXISTS subquery to verify project ownership
--    - Additional validation: both nodes must belong to the project
--
-- 2. Defense in Depth:
--    - RLS policies at database level
--    - Foreign key constraints prevent dangling edges
--    - INSERT policy verifies both nodes belong to project
--
-- 3. Cascade Behavior:
--    - Delete project → cascades to all edges in project
--    - Delete node → cascades to all edges connected to that node
--    - This maintains graph integrity
--
-- 4. Immutability:
--    - Edges have no UPDATE policy (immutable by design)
--    - To change an edge, delete and recreate it
--    - Simplifies client logic and prevents partial updates
--
-- 5. Graph Constraints:
--    - No self-loops (source != target)
--    - No duplicate edges (same source, target, type)
--    - Multiple edge types allowed between same nodes
--
-- 6. Edge Types:
--    - parent_child: Hierarchical relationship (default)
--    - depends_on: Dependency relationship
--    - implements: Implementation relationship
--    - related_to: General association
--    - conflicts_with: Mutual exclusion
--
-- 7. Performance Considerations:
--    - Indexes on project_id, source_node_id, target_node_id for fast lookups
--    - Composite indexes for common query patterns (all edges from a node)
--    - Created_at for temporal queries (when was edge created)
