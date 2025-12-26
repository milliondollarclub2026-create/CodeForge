ALTER TABLE public.edges
ADD COLUMN source_handle TEXT,
ADD COLUMN target_handle TEXT;

-- Recreate the insert policy to include the new columns
DROP POLICY "Users can insert edges in their projects" ON public.edges;

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

-- Since edges are immutable, we only need to grant insert access to the new columns.
-- The existing GRANT statement on the table already covers this.
