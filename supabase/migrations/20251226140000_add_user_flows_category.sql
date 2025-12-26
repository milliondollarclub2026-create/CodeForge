-- Migration: Add user_flows category to node_categories table
-- Created: 2025-12-26
-- Purpose: Add user_flows as a new system category for tracking user interaction flows

-- Insert user_flows category if it doesn't already exist
INSERT INTO public.node_categories (name, color, icon, is_system)
VALUES ('user_flows', '#a855f7', 'GitBranch', true)
ON CONFLICT (name) DO NOTHING;

-- Verify the insertion
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count
    FROM public.node_categories
    WHERE name = 'user_flows';

    IF category_count = 0 THEN
        RAISE EXCEPTION 'Failed to insert user_flows category';
    ELSE
        RAISE NOTICE 'user_flows category inserted successfully';
    END IF;
END $$;
