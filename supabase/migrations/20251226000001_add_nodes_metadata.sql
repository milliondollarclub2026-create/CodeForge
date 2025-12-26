-- Migration: Add metadata column to nodes table
-- Purpose: Store additional node-specific data (e.g., features list for Features node)
-- Created: 2025-12-26

-- Add metadata JSONB column to nodes table
ALTER TABLE public.nodes
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_nodes_metadata ON public.nodes USING GIN (metadata);

-- Add comment explaining the column
COMMENT ON COLUMN public.nodes.metadata IS 'Flexible JSONB field for storing node-type-specific data (e.g., features list for Features nodes)';
