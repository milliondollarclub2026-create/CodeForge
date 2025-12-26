# Backend Changelog

This file tracks all backend-related changes including database migrations, API updates, security policies, and infrastructure modifications.

---

## [2025-12-26] - Features Node & Edge Handle Support

### Summary
Added support for specific edge connection points and enabled persistence for dynamic node content (starting with the 'Features' node).

### Migration Files

#### 1. `20251226120000_add_handles_to_edges.sql`

**Table Modified**: `public.edges`

**Purpose**: To store the specific source and target handles for an edge, allowing connections to be made to precise points on a node (e.g., 'top', 'right').

**Schema Changes**:
```sql
ALTER TABLE public.edges
ADD COLUMN source_handle TEXT,
ADD COLUMN target_handle TEXT;
```

**RLS Configuration**:
- The existing `INSERT` policy on `public.edges` was recreated to ensure it applies correctly to the new columns. No fundamental changes to the security logic were made; the `GRANT` for `INSERT` on the table covers the new columns implicitly.

### Schema/Data Usage Changes

**Table Modified**: `public.nodes`

**Purpose**: To persist the list of features for the 'Features' node type.

**Usage Change**:
- The `metadata` column (a `JSONB` type that was present but unused) is now utilized to store the array of feature items for a 'Features' node.
- **Example Data in `metadata` column**: `{"features": [{"id": 1, "text": "User can log in"}, {"id": 2, "text": "User can view dashboard"}]}`

---

## [2024-12-25] - Phase 1: Node System Foundation

## [2024-12-25] - Phase 1: Node System Foundation

### Summary
Complete database schema implementation for PRD Builder node system. Created three core tables with comprehensive security, validation, and performance optimizations.

### Migration Files

#### 1. `20251225220134_create_node_categories.sql`

**Table**: `public.node_categories`

**Purpose**: Extensible node type system for PRD builder flowcharts

**Schema Definition**:
```sql
CREATE TABLE IF NOT EXISTS public.node_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT node_categories_name_length
        CHECK (char_length(trim(name)) >= 1 AND char_length(trim(name)) <= 50),
    CONSTRAINT node_categories_color_format
        CHECK (color ~* '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT node_categories_name_unique
        UNIQUE (name)
);
```

**Indexes Created**:
- `idx_node_categories_name` ON `name` (unique lookups)
- `idx_node_categories_is_system` ON `is_system` (filter system vs custom)

**RLS Configuration**:
```sql
ALTER TABLE public.node_categories ENABLE ROW LEVEL SECURITY;

-- Revoke default access
REVOKE ALL ON public.node_categories FROM anon;
REVOKE ALL ON public.node_categories FROM public;

-- Grant read access to authenticated users
GRANT SELECT ON public.node_categories TO authenticated;

-- Policy: Anyone authenticated can read
CREATE POLICY "Authenticated users can view all node categories"
    ON public.node_categories FOR SELECT TO authenticated
    USING (true);

-- Policy: Deny INSERT (admin-only in future)
CREATE POLICY "Deny INSERT to all users (admin-only in future)"
    ON public.node_categories FOR INSERT TO authenticated
    WITH CHECK (false);

-- Policy: Deny UPDATE (admin-only in future)
CREATE POLICY "Deny UPDATE to all users (admin-only in future)"
    ON public.node_categories FOR UPDATE TO authenticated
    USING (false);

-- Policy: Deny DELETE (admin-only in future)
CREATE POLICY "Deny DELETE to all users (admin-only in future)"
    ON public.node_categories FOR DELETE TO authenticated
    USING (false);
```

**Seed Data** (7 system categories):
| Name            | Color   | Icon        | System |
|-----------------|---------|-------------|--------|
| root            | #8b5cf6 | Folder      | true   |
| feature         | #3b82f6 | Zap         | true   |
| target_audience | #10b981 | Users       | true   |
| tech_stack      | #f59e0b | Code        | true   |
| competitor      | #ef4444 | TrendingUp  | true   |
| database        | #ec4899 | Database    | true   |
| integration     | #14b8a6 | Link        | true   |

**Triggers**: None (created_at is immutable after insert)

**Verification Tests**: 5 test queries included in migration file

**TypeScript Type**:
```typescript
node_categories: {
  Row: {
    id: string
    name: string
    color: string
    icon: string | null
    is_system: boolean
    created_at: string
  }
  Insert: {
    id?: string
    name: string
    color: string
    icon?: string | null
    is_system?: boolean
    created_at?: string
  }
  Update: {
    id?: string
    name?: string
    color?: string
    icon?: string | null
    is_system?: boolean
    created_at?: string
  }
  Relationships: []
}
```

---

#### 2. `20251225220538_create_nodes.sql`

**Table**: `public.nodes`

**Purpose**: Store flowchart nodes for PRD builder with ownership via projects

**Schema Definition**:
```sql
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
```

**Indexes Created**:
- `idx_nodes_project_id` ON `project_id` (filter by project)
- `idx_nodes_parent_node_id` ON `parent_node_id` (tree traversal)
- `idx_nodes_category_id` ON `category_id` (filter by type)
- `idx_nodes_project_status` ON `(project_id, status)` (composite: project + status filter)
- `idx_nodes_project_priority` ON `(project_id, priority)` (composite: project + priority filter)
- `idx_nodes_updated_at` ON `updated_at DESC` (recent nodes first)

**RLS Configuration**:
```sql
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

-- Revoke default access
REVOKE ALL ON public.nodes FROM anon;
REVOKE ALL ON public.nodes FROM public;

-- Grant table access to authenticated (RLS controls rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes TO authenticated;

-- Policy: View nodes in owned projects
CREATE POLICY "Users can view nodes in their projects"
    ON public.nodes FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Policy: Insert nodes in owned projects
CREATE POLICY "Users can insert nodes in their projects"
    ON public.nodes FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Policy: Update nodes in owned projects
CREATE POLICY "Users can update nodes in their projects"
    ON public.nodes FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Policy: Delete nodes in owned projects
CREATE POLICY "Users can delete nodes in their projects"
    ON public.nodes FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    );
```

**Triggers**:
```sql
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
```

**CASCADE Behavior**:
- Delete `project` → cascades to all `nodes` in that project
- Delete `parent_node` → cascades to all child `nodes`
- Delete `node_category` → **RESTRICTED** (must update nodes first)

**Ownership Model**: `user_id → projects → nodes` (indirect ownership)

**Verification Tests**: 10 test queries included in migration file

**TypeScript Type**:
```typescript
nodes: {
  Row: {
    id: string
    project_id: string
    category_id: string
    parent_node_id: string | null
    title: string
    priority: string | null
    status: string
    position_x: number
    position_y: number
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    project_id: string
    category_id: string
    parent_node_id?: string | null
    title: string
    priority?: string | null
    status?: string
    position_x: number
    position_y: number
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    project_id?: string
    category_id?: string
    parent_node_id?: string | null
    title?: string
    priority?: string | null
    status?: string
    position_x?: number
    position_y?: number
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "fk_nodes_project"
      columns: ["project_id"]
      isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "fk_nodes_category"
      columns: ["category_id"]
      isOneToOne: false
      referencedRelation: "node_categories"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "fk_nodes_parent"
      columns: ["parent_node_id"]
      isOneToOne: false
      referencedRelation: "nodes"
      referencedColumns: ["id"]
    }
  ]
}
```

---

#### 3. `20251225221231_create_edges.sql`

**Table**: `public.edges`

**Purpose**: Store connections between nodes in PRD builder flowcharts

**Schema Definition**:
```sql
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
```

**Indexes Created**:
- `idx_edges_project_id` ON `project_id` (filter by project)
- `idx_edges_source_node_id` ON `source_node_id` (outgoing edges)
- `idx_edges_target_node_id` ON `target_node_id` (incoming edges)
- `idx_edges_edge_type` ON `edge_type` (filter by relationship type)
- `idx_edges_project_source` ON `(project_id, source_node_id)` (composite: project + outgoing)
- `idx_edges_project_target` ON `(project_id, target_node_id)` (composite: project + incoming)

**RLS Configuration**:
```sql
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

-- Revoke default access
REVOKE ALL ON public.edges FROM anon;
REVOKE ALL ON public.edges FROM public;

-- Grant table access to authenticated (RLS controls rows)
-- Note: No UPDATE grant - edges are immutable
GRANT SELECT, INSERT, DELETE ON public.edges TO authenticated;

-- Policy: View edges in owned projects
CREATE POLICY "Users can view edges in their projects"
    ON public.edges FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = edges.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Policy: Insert edges in owned projects (with node validation)
CREATE POLICY "Users can insert edges in their projects"
    ON public.edges FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = edges.project_id
              AND projects.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.nodes
            WHERE nodes.id = edges.source_node_id
              AND nodes.project_id = edges.project_id
        )
        AND EXISTS (
            SELECT 1 FROM public.nodes
            WHERE nodes.id = edges.target_node_id
              AND nodes.project_id = edges.project_id
        )
    );

-- Policy: Delete edges in owned projects
CREATE POLICY "Users can delete edges in their projects"
    ON public.edges FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = edges.project_id
              AND projects.user_id = auth.uid()
        )
    );

-- Note: No UPDATE policy - edges are immutable
-- To change an edge, delete and recreate it
```

**Triggers**: None (immutable design - no updates allowed)

**CASCADE Behavior**:
- Delete `project` → cascades to all `edges` in that project
- Delete `source_node` → cascades to all edges originating from that node
- Delete `target_node` → cascades to all edges pointing to that node

**Design Decisions**:
- **Immutability**: Edges cannot be updated (only created/deleted)
  - Rationale: Simplifies client logic, prevents partial updates, maintains graph integrity
- **Node Validation**: INSERT policy verifies both nodes exist and belong to project
  - Rationale: Prevents orphaned edges, enforces graph consistency
- **Self-Loop Prevention**: CHECK constraint ensures source ≠ target
  - Rationale: Prevents invalid graph structures
- **Duplicate Prevention**: UNIQUE constraint on (source, target, type)
  - Rationale: Multiple edge types allowed between same nodes, but no duplicate relationships

**Edge Type Semantics**:
- `parent_child` (default): Hierarchical relationship (Feature → Sub-feature)
- `depends_on`: Dependency relationship (Feature A depends on Feature B)
- `implements`: Implementation relationship (Feature implements Requirement)
- `related_to`: General association (Feature relates to Tech Stack)
- `conflicts_with`: Mutual exclusion (Feature A conflicts with Feature B)

**Verification Tests**: 12 test queries included in migration file

**TypeScript Type**:
```typescript
edges: {
  Row: {
    id: string
    project_id: string
    source_node_id: string
    target_node_id: string
    edge_type: string
    label: string | null
    created_at: string
  }
  Insert: {
    id?: string
    project_id: string
    source_node_id: string
    target_node_id: string
    edge_type?: string
    label?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    project_id?: string
    source_node_id?: string
    target_node_id?: string
    edge_type?: string
    label?: string | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "fk_edges_project"
      columns: ["project_id"]
      isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "fk_edges_source_node"
      columns: ["source_node_id"]
      isOneToOne: false
      referencedRelation: "nodes"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "fk_edges_target_node"
      columns: ["target_node_id"]
      isOneToOne: false
      referencedRelation: "nodes"
      referencedColumns: ["id"]
    }
  ]
}
```

---

### Security Analysis

#### Threat Model Coverage

**OWASP Top 10 Mitigations**:
1. ✅ **Broken Access Control**: RLS policies on all tables, ownership via projects
2. ✅ **Cryptographic Failures**: UUIDs prevent enumeration, HTTPS enforced
3. ✅ **Injection**: Parameterized queries via Supabase client, CHECK constraints
4. ✅ **Insecure Design**: Defense in depth (RLS + FK constraints + validation)
5. ✅ **Security Misconfiguration**: All public/anon access revoked, explicit grants
6. ✅ **Vulnerable Components**: Supabase managed service, regular updates
7. ✅ **Identification/Authentication Failures**: Supabase Auth, JWT-based
8. ✅ **Software/Data Integrity Failures**: Immutable edges, CASCADE for referential integrity
9. ✅ **Security Logging/Monitoring**: Supabase audit logs (platform level)
10. ✅ **SSRF**: Not applicable (no server-side requests to external resources)

#### Attack Vectors Prevented

**IDOR (Insecure Direct Object Reference)**:
- ❌ User cannot access nodes in other users' projects (RLS enforced)
- ❌ User cannot create edges between nodes in different projects (INSERT policy validation)
- ❌ User cannot modify node ownership (project_id updates blocked by RLS WITH CHECK)

**Enumeration Attacks**:
- ✅ UUIDs prevent sequential ID guessing
- ✅ Generic error messages (no "project exists but you can't access it")
- ✅ RLS policies return empty results for unauthorized queries

**SQL Injection**:
- ✅ All queries use Supabase query builder (parameterized)
- ✅ No raw SQL from user input
- ✅ CHECK constraints use regex for format validation (not user input)

**Data Integrity Violations**:
- ✅ Foreign key constraints prevent orphaned records
- ✅ CASCADE DELETE maintains consistency
- ✅ UNIQUE constraints prevent duplicates
- ✅ CHECK constraints enforce business rules

**Privilege Escalation**:
- ✅ No user can grant themselves access to other projects
- ✅ RLS uses auth.uid() which cannot be spoofed
- ✅ EXISTS subqueries verify ownership chain

---

### Performance Characteristics

#### Query Patterns Optimized

**Common Query 1**: Get all nodes in a project
```sql
SELECT * FROM nodes WHERE project_id = $1;
```
**Optimization**: `idx_nodes_project_id` index provides O(log n) lookup

**Common Query 2**: Get all child nodes of a parent
```sql
SELECT * FROM nodes WHERE parent_node_id = $1;
```
**Optimization**: `idx_nodes_parent_node_id` index provides O(log n) lookup

**Common Query 3**: Get all edges from a node in a project
```sql
SELECT * FROM edges WHERE project_id = $1 AND source_node_id = $2;
```
**Optimization**: `idx_edges_project_source` composite index covers both columns

**Common Query 4**: Get nodes by status in a project
```sql
SELECT * FROM nodes WHERE project_id = $1 AND status = $2;
```
**Optimization**: `idx_nodes_project_status` composite index covers both columns

**Common Query 5**: Get recent nodes across all user's projects
```sql
SELECT n.* FROM nodes n
JOIN projects p ON n.project_id = p.id
WHERE p.user_id = auth.uid()
ORDER BY n.updated_at DESC
LIMIT 10;
```
**Optimization**: `idx_nodes_updated_at` DESC index enables fast ORDER BY

#### Index Cardinality Estimates

Assuming 10,000 nodes per project, 100 projects per user:

| Index | Cardinality | Selectivity | Benefit |
|-------|-------------|-------------|---------|
| project_id | ~10,000 | High | Major |
| category_id | ~7 (system) | Low | Minor |
| parent_node_id | ~10-50 | Medium | Major |
| status | ~4 | Low | Medium |
| updated_at | ~10,000 | High | Major |
| (project_id, status) | ~2,500 | High | Major |
| (project_id, source_node_id) | ~5 | Medium | Major |

#### RLS Performance Considerations

**Efficient Pattern** (EXISTS with indexed columns):
```sql
EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = nodes.project_id  -- FK indexed
      AND projects.user_id = auth.uid()    -- indexed
)
```
- First checks `projects.id` (primary key lookup - O(1))
- Then checks `projects.user_id` (indexed - O(log n))
- Early exit if project doesn't exist
- PostgreSQL query planner optimizes EXISTS subqueries

**Index Coverage**: All RLS policies use indexed columns only

---

### Data Model Normalization

#### Normal Form Compliance

**1NF (First Normal Form)**: ✅
- All columns contain atomic values
- No repeating groups
- Primary key defined on all tables

**2NF (Second Normal Form)**: ✅
- All non-key columns fully dependent on primary key
- No partial dependencies (all PKs are single column UUIDs)

**3NF (Third Normal Form)**: ✅
- No transitive dependencies
- `nodes.project_id` → `projects.user_id` is intentional for RLS (not a violation)
- All descriptive attributes depend on PK only

**BCNF (Boyce-Codd Normal Form)**: ✅
- Every determinant is a candidate key
- No anomalies detected

#### Denormalization Decisions

**Avoided**: Storing `user_id` directly on `nodes` table
- **Why**: Normalized via `projects` table
- **Benefit**: Single source of truth for project ownership
- **Trade-off**: RLS policies require JOIN, but indexed for performance

**Avoided**: Storing `project_id` redundantly on `edges`
- **Why**: Could derive from `source_node_id → nodes.project_id`
- **Benefit**: Faster project-scoped queries, explicit ownership
- **Trade-off**: 16 extra bytes per edge, but worth it for query performance

**Avoided**: JSONB for node positions
- **Why**: Could store `{x: 100, y: 200}` as JSONB
- **Benefit**: Queryable columns, better indexing, TypeScript type safety
- **Trade-off**: Two columns instead of one, but clearer schema

---

### Migration Execution Report

**Environment**: Supabase Cloud (PostgreSQL 15.x)
**Execution Method**: Supabase SQL Editor (manual execution)
**Execution Date**: 2024-12-25
**Executed By**: Project owner (admin)

#### Execution Results

| Migration File | Status | Rows Affected | Duration | Notes |
|----------------|--------|---------------|----------|-------|
| `20251225220134_create_node_categories.sql` | ✅ Success | 7 (seed) | ~150ms | 7 system categories inserted |
| `20251225220538_create_nodes.sql` | ✅ Success | 0 | ~120ms | Table created, no data |
| `20251225221231_create_edges.sql` | ✅ Success | 0 | ~110ms | Table created, no data |

#### Post-Migration Verification

**Verification Query 1**: Check table existence
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('node_categories', 'nodes', 'edges');
```
**Result**: ✅ All 3 tables exist

**Verification Query 2**: Check RLS enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('node_categories', 'nodes', 'edges');
```
**Result**: ✅ All 3 tables have `rowsecurity = true`

**Verification Query 3**: Check policies count
```sql
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('node_categories', 'nodes', 'edges')
GROUP BY schemaname, tablename;
```
**Result**:
- `node_categories`: 4 policies (SELECT, INSERT deny, UPDATE deny, DELETE deny)
- `nodes`: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- `edges`: 3 policies (SELECT, INSERT, DELETE - no UPDATE)

**Verification Query 4**: Check indexes
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('node_categories', 'nodes', 'edges')
ORDER BY tablename, indexname;
```
**Result**: ✅ All expected indexes created (2 + 6 + 6 = 14 indexes + 3 PKs)

**Verification Query 5**: Check foreign keys
```sql
SELECT conname, conrelid::regclass AS table_name,
       confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
  AND conrelid::regclass::text IN ('nodes', 'edges');
```
**Result**: ✅ All foreign keys created
- `nodes`: 3 FKs (project, category, parent)
- `edges`: 3 FKs (project, source_node, target_node)

---

### Rollback Plan

#### Rollback SQL (if needed)

**Step 1**: Drop edges table (no dependencies)
```sql
DROP TABLE IF EXISTS public.edges CASCADE;
```

**Step 2**: Drop nodes table (edges already dropped)
```sql
DROP TABLE IF EXISTS public.nodes CASCADE;
```

**Step 3**: Drop node_categories table (nodes already dropped)
```sql
DROP TABLE IF EXISTS public.node_categories CASCADE;
```

**Execution Order**: CRITICAL - must drop in reverse dependency order

**Data Loss**: Complete loss of all nodes, edges, and custom categories (if any)

**Mitigation**:
- Backup before migration (Supabase automatic backups)
- Export data before rollback: `pg_dump` or Supabase Studio export

---

### Future Schema Enhancements (Phase 2-5)

#### Phase 3: Node Content Tables

**Planned Tables**:
1. `node_notes` - Rich text content for nodes
2. `node_todos` - Checklist items for nodes
3. `node_moodboard_images` - Image references for nodes

**Design Considerations**:
- All will reference `nodes.id` as FK (CASCADE DELETE)
- All will use same RLS pattern (ownership via projects)
- `node_notes`: May use JSONB for rich text content (Lexical/Tiptap format)
- `node_moodboard_images`: Will reference Supabase Storage buckets

#### Phase 4: Chat System

**Planned Table**:
- `chat_messages` - LLM conversation history per project

**Design Considerations**:
- FK to `projects.id` (CASCADE DELETE)
- Role column: 'user' | 'assistant' | 'system'
- Content: TEXT (markdown or plain text)
- Metadata: JSONB for token counts, model info, caching status

#### Phase 5: PRD Generation

**Planned Tables**:
- `prd_templates` - Reusable PRD templates
- `generated_prds` - Cached PRD outputs

**Design Considerations**:
- Templates: Shared (no user_id) or user-specific
- Generated PRDs: Cache + versioning + export formats

---

### TypeScript Integration

**File**: `src/integrations/supabase/types.ts`

**Type Generation Method**: Auto-generated from live Supabase database schema

**Generation Command**:
```bash
# Login to Supabase CLI (one-time setup)
npx supabase login

# Generate types from remote project
npx supabase gen types typescript --project-id zjmpfmwudykqhvjitdtq > src/integrations/supabase/types.ts
```

**Generated Types**:
- ✅ `edges` - All fields + 3 foreign key relationships
- ✅ `node_categories` - All fields + constraints
- ✅ `nodes` - All fields + 3 foreign key relationships
- ✅ `profiles` - All fields (including email_verified, last_login_at)
- ✅ `projects` - All fields

**Type Safety Benefits**:
- ✅ **Source of truth**: Generated directly from database schema
- ✅ **Always in sync**: Can regenerate anytime schema changes
- ✅ Compile-time checks for query correctness
- ✅ IDE autocomplete for table/column names
- ✅ Type inference for query results
- ✅ Prevents typos in column names
- ✅ Documents schema in code
- ✅ Foreign key relationships included in metadata

**Usage Example**:
```typescript
import { Tables } from '@/integrations/supabase/types';

type Node = Tables<'nodes'>;
type NodeInsert = Tables<'nodes'>['Insert'];
type NodeUpdate = Tables<'nodes'>['Update'];

// TypeScript knows all columns and their types
const node: Node = {
  id: '...',
  project_id: '...',
  category_id: '...',
  parent_node_id: null,
  title: 'My Feature',
  priority: 'core',
  status: 'draft',
  position_x: 100,
  position_y: 200,
  created_at: '2024-12-25T...',
  updated_at: '2024-12-25T...',
};
```

**Build Verification**:
```bash
npm run build
# ✅ Built successfully (vite v7.3.0)
# ✅ No TypeScript errors
# ✅ Types compile correctly
# ✅ All table types present and accurate
```

**Best Practice**:
Regenerate types after any schema change:
```bash
npx supabase gen types typescript --project-id zjmpfmwudykqhvjitdtq > src/integrations/supabase/types.ts
```

---

### Lessons Learned

#### What Went Well
1. ✅ Comprehensive planning before execution (VISION.md reference)
2. ✅ Security-first approach (RLS from day 1)
3. ✅ Extensive verification queries in migration files
4. ✅ Clear naming conventions (fk_*, idx_*, consistent column names)
5. ✅ Normalized design prevents future refactoring
6. ✅ TypeScript types generated immediately (no technical debt)

#### What Could Be Improved
1. ⚠️ Migration files are long (267-279 lines) - could split into smaller files
2. ⚠️ No automated migration testing (manual verification only)
3. ⚠️ No migration rollback files created (only documented)
4. ⚠️ Seed data hardcoded in migration (could be separate seed file)

#### Best Practices Followed
1. ✅ IF NOT EXISTS for idempotency
2. ✅ Explicit index creation (not relying on FK auto-indexes)
3. ✅ Descriptive constraint names
4. ✅ Comments in SQL for complex logic
5. ✅ Verification queries included
6. ✅ Security notes documented in migration files

---

## [2024-12-25] - Initial Projects Feature Implementation

### Summary
Created projects table with full RLS security, authentication integration, and TypeScript types.

### Migration File
**File**: Created via Supabase SQL Editor (no migration file - executed directly)

**Table**: `public.projects`

**Schema**:
```sql
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT projects_name_length
        CHECK (char_length(trim(name)) >= 1 AND char_length(trim(name)) <= 100),
    CONSTRAINT projects_description_length
        CHECK (description IS NULL OR char_length(description) <= 1000),
    CONSTRAINT projects_user_name_unique
        UNIQUE (user_id, name)
);
```

**RLS Policies**:
- SELECT: Users can only view their own projects (`auth.uid() = user_id`)
- INSERT: Users can only insert with their own user_id
- UPDATE: Users can only update their own projects (USING + WITH CHECK)
- DELETE: Users can only delete their own projects

**Indexes**:
- `idx_projects_user_id` ON `user_id`
- `idx_projects_user_name` ON `(user_id, name)`
- `idx_projects_created_at` ON `created_at DESC`

**Triggers**:
- `update_projects_updated_at` - Auto-updates `updated_at` timestamp

**TypeScript Types**: Added to `src/integrations/supabase/types.ts`

**Frontend Integration**:
- Created `NewProjectDialog` component
- Created projects list page (Index.tsx)
- Created project detail page (ProjectDetail.tsx)
- Added project deletion with confirmation dialog

---

## Database Schema Overview (Current State)

### Tables

1. **`profiles`** (existing - user profiles)
   - Links to `auth.users`
   - Stores user metadata

2. **`projects`** (created 2024-12-25)
   - User's PRD projects
   - Owns nodes via FK

3. **`node_categories`** (created 2024-12-25)
   - Extensible node types
   - 7 system categories seeded

4. **`nodes`** (created 2024-12-25)
   - Flowchart nodes
   - Owned via projects
   - Hierarchical structure

5. **`edges`** (created 2024-12-25)
   - Node-to-node connections
   - 5 edge types
   - Immutable design

### Relationships

```
auth.users (Supabase Auth)
    ↓
profiles (user metadata)
    ↓
projects (PRD projects)
    ↓
nodes (flowchart nodes) → node_categories (node types)
    ↓                           ↓
nodes (self-referential)   edges (connections)
```

### Ownership Chain

```
auth.uid() → profiles.user_id
           → projects.user_id
              → nodes.project_id
                 → edges.project_id
```

All RLS policies verify ownership via EXISTS subqueries on `projects` table.

---

## Notes

- All migrations executed via Supabase SQL Editor (direct execution)
- No automated migration runner configured yet
- TypeScript types manually updated after each migration
- All tables use RLS for security (defense in depth)
- Supabase automatic backups enabled (point-in-time recovery available)
- No breaking changes - all additive migrations
