# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-12-26

### Added
- **Interactive Features Node**: Introduced a new node type called 'Features'. This node allows users to dynamically add, view, and remove a list of feature items directly on the canvas.
- **One-per-project limit for Features Node**: The node creation dropdown now intelligently hides the 'Features' option if a features node already exists in the project.
- **Feature Persistence**: The list of features within the 'Features' node is now saved to the database and will persist across sessions.
- **Directional Edge Connections**: Implemented smart edge routing that connects nodes based on which handle is clicked:
  - Click top handle → connects to bottom of target node
  - Click right handle → connects to left of target node
  - Click bottom handle → connects to top of target node
  - Click left handle → connects to right of target node
- **Handle IDs on Root Nodes**: Added explicit handle IDs ("top", "right", "bottom", "left") to all root node handles for proper edge connection tracking.
- **Dynamic Feature Node Handle**: Features node now displays a single handle on the appropriate side based on its connection to the root node, visible only on hover with blue styling.
- **Edge Handle Columns**: Added `source_handle` and `target_handle` TEXT columns to edges table for tracking precise connection points.
- **Smooth Step Edges**: Feature node connections now use smooth step routing (rounded 90-degree corners) instead of sharp angles.
- **Edge Creation Rollback**: If edge creation fails, the newly created node is automatically deleted from the database to maintain data integrity.

### Changed
- **Features Node Styling**: The 'Features' node now renders with a dark background and a blue border to distinguish it visually. Its default title is now "Features" instead of "New Features".
- **Edge Connection Specificity**: Edges created between nodes now connect to the specific handle point (+ icon) that was clicked, rather than a default position.
- **Edge Type for Features**: Changed from "step" edges to "smoothstep" edges for smoother visual appearance.
- **Edge Styling**: Feature edges now have increased stroke width (2px) for better visibility.
- **RLS Policy for Edges**: Updated INSERT policy to support new `source_handle` and `target_handle` columns.

### Fixed
- **Node Creation Stale State Bug**: Fixed a critical bug where creating a node would fail with a "parent node not found" error. The logic now correctly uses React Flow's internal state to find the parent node via `getNode()` hook.
- **Missing Connection Lines on Reload**: Fixed an issue where connection lines would disappear after reloading the page. The data-fetching logic now correctly loads the source and target handle information for each edge.
- **Node Creation Failure in New Projects**: Resolved a bug that prevented node creation in new projects due to a mismatch between the application code and the database schema for edges.
- **Edge Rendering Issue**: Fixed edges not appearing at all by updating RLS policies to allow insertion with handle columns and ensuring React Flow receives proper handle references.
- **Stale Callback Issue**: Wrapped `handleCreateNode` in `useCallback` with proper dependencies to prevent stale state issues with React Flow's internal memoization.

### Database Changes
- **Migration**: `20251226000001_add_nodes_metadata.sql` - Added `metadata` JSONB column to nodes table with GIN index for storing feature lists.
- **Migration**: `20251226120000_add_handles_to_edges.sql` - Added `source_handle` and `target_handle` columns to edges table for directional connection tracking.
- **Updated RLS Policy**: Recreated "Users can insert edges in their projects" policy to support new handle columns.

### Technical Improvements
- **Code Cleanup**: Removed unused `transformEdgeToReactFlow` function (lines 35-42 in ProjectDetail.tsx).
- **Debug Logging**: Added comprehensive debug logging for edge creation and rendering diagnostics.
- **Error Handling**: Improved error messages to include specific error details for better debugging.
- **Type Safety**: Updated TypeScript interfaces to include `connectionSide` prop for FeaturesNode.

---

## [2024-12-25] - Phase 1: Node System Foundation (Database Schema)

### Database Schema - PRD Builder Node System

#### Overview
Implemented complete database foundation for Phase 1 of the PRD Builder feature. Created three core tables (node_categories, nodes, edges) with comprehensive Row Level Security (RLS), validation constraints, and performance optimizations. This establishes the backend infrastructure for the node-based flowchart system that will power AI-assisted PRD generation.

#### Migration Files Created

1. **`20251225220134_create_node_categories.sql`**
   - Created extensible node type system
   - 7 system categories pre-seeded: root, feature, target_audience, tech_stack, competitor, database, integration
   - Read-only for authenticated users (admin-only modification in future)

2. **`20251225220538_create_nodes.sql`**
   - Created flowchart nodes table with ownership via projects
   - Supports hierarchical node structures (parent-child relationships)
   - Position tracking for infinite canvas (position_x, position_y)
   - Priority and status tracking

3. **`20251225221231_create_edges.sql`**
   - Created node-to-node connection system
   - 5 edge types: parent_child, depends_on, implements, related_to, conflicts_with
   - Self-loop prevention and duplicate edge prevention
   - Immutable design (no UPDATE policy)

#### Table: `node_categories`

**Purpose**: Store extensible node types for PRD builder flowcharts

**Schema**:
- `id` (UUID, PRIMARY KEY, auto-generated)
- `name` (TEXT, NOT NULL, UNIQUE, 1-50 characters)
- `color` (TEXT, NOT NULL, hex color format #RRGGBB)
- `icon` (TEXT, nullable, Lucide React icon name)
- `is_system` (BOOLEAN, NOT NULL, default false)
- `created_at` (TIMESTAMPTZ, NOT NULL, default now())

**Constraints**:
- Name length: 1-50 characters (trimmed)
- Color format: Must match regex `^#[0-9A-Fa-f]{6}$`
- Unique constraint on `name`

**RLS Policies**:
- SELECT: Authenticated users can view all categories
- INSERT/UPDATE/DELETE: Denied (admin-only in future)

**Seed Data** (7 system categories):
```
root           → #8b5cf6 (purple) → Folder icon
feature        → #3b82f6 (blue)   → Zap icon
target_audience→ #10b981 (green)  → Users icon
tech_stack     → #f59e0b (amber)  → Code icon
competitor     → #ef4444 (red)    → TrendingUp icon
database       → #ec4899 (pink)   → Database icon
integration    → #14b8a6 (teal)   → Link icon
```

**Indexes**:
- `idx_node_categories_name` on `name`
- `idx_node_categories_is_system` on `is_system`

---

#### Table: `nodes`

**Purpose**: Store flowchart nodes for PRD builder with ownership via projects

**Schema**:
- `id` (UUID, PRIMARY KEY, auto-generated)
- `project_id` (UUID, NOT NULL, FK → projects.id, CASCADE DELETE)
- `category_id` (UUID, NOT NULL, FK → node_categories.id)
- `parent_node_id` (UUID, nullable, FK → nodes.id, CASCADE DELETE)
- `title` (TEXT, NOT NULL, 1-200 characters)
- `priority` (TEXT, nullable, enum: core/important/nice_to_have/future)
- `status` (TEXT, NOT NULL, default 'draft', enum: draft/in_progress/completed/archived)
- `position_x` (FLOAT, NOT NULL)
- `position_y` (FLOAT, NOT NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, default now())
- `updated_at` (TIMESTAMPTZ, NOT NULL, default now())

**Constraints**:
- Title length: 1-200 characters (trimmed)
- Priority values: NULL or one of (core, important, nice_to_have, future)
- Status values: draft, in_progress, completed, archived
- Unique constraint: `(project_id, parent_node_id, title)` - no duplicate titles under same parent

**RLS Policies** (Ownership via Projects):
- SELECT: Users can view nodes in projects they own
- INSERT: Users can insert nodes only in their own projects
- UPDATE: Users can update nodes only in their own projects (USING + WITH CHECK)
- DELETE: Users can delete nodes only in their own projects

**Ownership Hierarchy**: `user_id → projects → nodes` (no direct user_id on nodes)

**Indexes**:
- `idx_nodes_project_id` on `project_id`
- `idx_nodes_parent_node_id` on `parent_node_id`
- `idx_nodes_category_id` on `category_id`
- `idx_nodes_project_status` on `(project_id, status)`
- `idx_nodes_project_priority` on `(project_id, priority)`
- `idx_nodes_updated_at` on `updated_at DESC`

**Triggers**:
- `update_nodes_updated_at` - Auto-updates `updated_at` timestamp before UPDATE

**CASCADE Behavior**:
- Delete project → cascades to all nodes in project
- Delete parent node → cascades to all child nodes
- Maintains referential integrity

---

#### Table: `edges`

**Purpose**: Store connections between nodes in PRD builder flowcharts

**Schema**:
- `id` (UUID, PRIMARY KEY, auto-generated)
- `project_id` (UUID, NOT NULL, FK → projects.id, CASCADE DELETE)
- `source_node_id` (UUID, NOT NULL, FK → nodes.id, CASCADE DELETE)
- `target_node_id` (UUID, NOT NULL, FK → nodes.id, CASCADE DELETE)
- `edge_type` (TEXT, NOT NULL, default 'parent_child')
- `label` (TEXT, nullable, max 100 characters)
- `created_at` (TIMESTAMPTZ, NOT NULL, default now())

**Constraints**:
- Edge type values: parent_child, depends_on, implements, related_to, conflicts_with
- Label length: NULL or max 100 characters
- No self-loops: `source_node_id != target_node_id`
- Unique constraint: `(source_node_id, target_node_id, edge_type)` - no duplicate edges

**RLS Policies**:
- SELECT: Users can view edges in projects they own
- INSERT: Users can insert edges in their own projects (with node validation)
  - Additional check: Both source and target nodes must belong to the project
- DELETE: Users can delete edges in their own projects
- UPDATE: **No policy** - edges are immutable (delete and recreate instead)

**Edge Types**:
- `parent_child` (default): Hierarchical relationship
- `depends_on`: Dependency relationship
- `implements`: Implementation relationship
- `related_to`: General association
- `conflicts_with`: Mutual exclusion

**Indexes**:
- `idx_edges_project_id` on `project_id`
- `idx_edges_source_node_id` on `source_node_id`
- `idx_edges_target_node_id` on `target_node_id`
- `idx_edges_edge_type` on `edge_type`
- `idx_edges_project_source` on `(project_id, source_node_id)` (composite)
- `idx_edges_project_target` on `(project_id, target_node_id)` (composite)

**CASCADE Behavior**:
- Delete project → cascades to all edges in project
- Delete node (source or target) → cascades to all connected edges
- Maintains graph integrity

---

#### TypeScript Types Updated

**File**: `src/integrations/supabase/types.ts`

**Auto-generated from Supabase schema** using Supabase CLI:
```bash
npx supabase gen types typescript --project-id zjmpfmwudykqhvjitdtq
```

Complete type definitions for all tables:
- `node_categories` (Row, Insert, Update, Relationships)
- `nodes` (Row, Insert, Update, Relationships with foreign key metadata)
- `edges` (Row, Insert, Update, Relationships with foreign key metadata)
- `profiles` (existing table with all fields)
- `projects` (existing table with all fields)

**Type Features**:
- ✅ Auto-generated from live database schema (source of truth)
- ✅ Full TypeScript inference support
- ✅ Nullable fields properly typed as `| null`
- ✅ Optional fields in Insert/Update types marked with `?`
- ✅ Foreign key relationships documented in Relationships array
- ✅ Matches Supabase client type inference patterns
- ✅ Verified with successful build (no type errors)

---

### Security Implementation

#### Defense in Depth Strategy
1. **RLS Policies**: Enabled on all three tables
2. **Ownership Verification**: All policies check project ownership via EXISTS subqueries
3. **Input Validation**: Database CHECK constraints + client-side Zod (future)
4. **Foreign Key Constraints**: Prevent dangling references
5. **CASCADE Delete**: Maintains data integrity automatically

#### RLS Policy Pattern (Nodes Example)
```sql
CREATE POLICY "Users can view nodes in their projects"
    ON public.nodes FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = nodes.project_id
              AND projects.user_id = auth.uid()
        )
    );
```

#### Security Guarantees
- ✅ Users cannot access nodes/edges in other users' projects
- ✅ Users cannot spoof project ownership (RLS enforced)
- ✅ No IDOR vulnerabilities (UUID + RLS protection)
- ✅ No enumeration attacks (generic error messages)
- ✅ No orphaned nodes/edges (foreign key constraints)
- ✅ No cross-user data leakage
- ✅ Edge INSERT validates both nodes belong to project

---

### Performance Optimizations

#### Indexing Strategy
- **Single column indexes**: Fast lookups by ID, status, priority, type
- **Composite indexes**: Optimized for common query patterns
  - `(project_id, status)` - Filter nodes by project and status
  - `(project_id, priority)` - Filter nodes by project and priority
  - `(project_id, source_node_id)` - Get all outgoing edges from a node
  - `(project_id, target_node_id)` - Get all incoming edges to a node
- **Descending indexes**: `updated_at DESC` for "recent nodes first" queries

#### Query Performance
- All indexes created explicitly (not relying on automatic FK indexes)
- RLS policies use EXISTS subqueries (efficient with indexes)
- Composite indexes cover common WHERE clause patterns
- No N+1 query issues (can join categories, projects in single query)

---

### Data Model Design Principles

1. **Normalized Structure**: No JSONB blobs for queryable data
2. **Extensibility**: Categories table allows new node types without code changes
3. **Hierarchical Support**: Self-referential parent_node_id for tree structures
4. **Graph Integrity**: Edges table with proper constraints and CASCADE behavior
5. **Immutability Where Appropriate**: Edges cannot be updated (delete + recreate)
6. **Temporal Tracking**: created_at and updated_at on all relevant tables
7. **Ownership Indirection**: Nodes owned via projects (normalized, not denormalized)

---

### Testing & Verification

#### Verification Queries Included
Each migration file includes 10+ test queries to verify:
- Table structure correctness
- Constraint enforcement (length, enum values, uniqueness)
- RLS policy behavior (positive and negative tests)
- CASCADE delete behavior
- Foreign key constraint enforcement
- Index creation

#### Manual Testing Completed
- ✅ node_categories migration executed successfully
- ✅ All 7 system categories seeded
- ✅ nodes migration executed successfully
- ✅ edges migration executed successfully
- ✅ TypeScript types compile without errors
- ✅ Build successful (vite build)

---

### Future-Ready Architecture

#### Phase 1 Completion Status (VISION.md)
- ✅ Database: Categories, Nodes, Edges tables with RLS
- ✅ TypeScript: Type definitions for all tables
- ⏳ API: CRUD operations with ownership verification (next)
- ⏳ UI: Root node auto-creation, manual Feature node creation (next)

#### Prepared For
- **Phase 2**: Node editing UI, multiple node types, search/filter
- **Phase 3**: Notes, to-do lists, moodboard (sub-features)
- **Phase 4**: LLM orchestrator with conversational node creation
- **Phase 5**: PRD generation from node graph

#### Graph Serialization Ready
- All node positions stored (position_x, position_y)
- Edge types support complex relationships
- Can serialize to JSON for LLM context injection
- React Flow integration straightforward (types compatible)

---

### Migration Execution Notes

**Environment**: Supabase SQL Editor (direct execution)
**Migration Files Location**: `supabase/migrations/`
**Execution Order**: CRITICAL - must run in chronological order
1. `20251225220134_create_node_categories.sql` (categories first - no dependencies)
2. `20251225220538_create_nodes.sql` (depends on categories and projects)
3. `20251225221231_create_edges.sql` (depends on nodes and projects)

**Rollback Strategy**: Each table has `IF NOT EXISTS` clause for idempotency

---

### Files Modified/Created

#### Created
- `supabase/migrations/20251225220134_create_node_categories.sql` (136 lines)
- `supabase/migrations/20251225220538_create_nodes.sql` (267 lines)
- `supabase/migrations/20251225221231_create_edges.sql` (279 lines)

#### Modified
- `src/integrations/supabase/types.ts` - Added types for 3 new tables (143 new lines)

---

### Dependencies
No new dependencies required - uses existing Supabase PostgreSQL features.

---

### Known Limitations / Future Work

**Current Phase 1 Limitations**:
- No frontend UI for node creation yet
- No API layer (direct Supabase client queries only)
- No real-time subscriptions configured
- No node content (notes, todos, moodboard) tables yet (Phase 3)
- No chat messages table yet (Phase 4)

**Phase 2 Enhancements Planned**:
- Node editing functionality
- Multiple node type rendering
- Node search and filtering
- Canvas state optimizations

**Phase 3 Additions**:
- `node_notes` table (rich text content)
- `node_todos` table (checklist items)
- `node_moodboard_images` table (file references)

**Phase 4 Additions**:
- `chat_messages` table (LLM conversation history)
- Anthropic API integration
- Prompt caching implementation

---

## [2024-12-25] - UI Enhancements and Infinite Canvas Implementation

### UI/UX Improvements

#### Text Updates
- Updated Index page subtitle from "Manage and organize your creative work" to "Manage and organize your projects"
- Updated NewProjectDialog placeholder from "My Awesome Project" to "My Project Name"

#### Project Deletion Feature
**Index Page** (`src/pages/Index.tsx`)
- Added delete functionality to project cards
- Features:
  - Hover-only X button (top-right corner of each card)
  - Uses Tailwind group/opacity patterns for clean UI
  - Click stops event propagation to prevent card navigation
  - Confirmation dialog before deletion (AlertDialog from shadcn/ui)
  - Loading state prevents double-clicks
  - Toast notifications for success/error states
- Security:
  - Verifies ownership with `.eq('user_id', user.id)` before deletion
  - RLS policies provide additional protection
  - Error handling with generic messages
- New imports:
  - `X` icon from lucide-react
  - `AlertDialog` components from shadcn/ui
- New state:
  - `deleteDialogOpen` - Controls confirmation dialog visibility
  - `projectToDelete` - Stores project ID pending deletion
  - `deleting` - Loading state during deletion

#### ProjectDetail Page Restructure
**Header Improvements** (`src/pages/ProjectDetail.tsx`)
- Fixed header positioning:
  - Removed `container`, `mx-auto`, and `max-w-7xl` constraints
  - Buttons now flush to left/right edges
  - Maintained sticky positioning with backdrop blur
- Added sign out functionality:
  - Sign out button positioned top-right corner
  - LogOut icon from lucide-react
  - Handles sign out with error handling
  - Redirects to auth page after successful sign out
  - Toast notifications for user feedback

### Infinite Canvas Implementation

#### New Dependencies
- **@xyflow/react@12.10.0** - Modern React Flow library for node-based UIs and infinite canvas

#### ProjectDetail Canvas Feature
**Complete Transformation** (`src/pages/ProjectDetail.tsx`)
- Removed project description display
- Removed placeholder "content coming soon" section
- Implemented infinite canvas with React Flow

**New Components Created**:

1. **ArrowKeyPanner Component**
   - Enables keyboard navigation with arrow keys
   - Pan step: 50px per keypress
   - Smooth animation: 200ms duration
   - Uses `useKeyPress` hook from React Flow
   - Updates viewport position via `setViewport`

2. **CustomControls Component**
   - Bottom-left floating control panel
   - Features:
     - Plus (+) button: Zoom in with 200ms animation
     - Minus (-) button: Zoom out with 200ms animation
     - Hand icon: Visual indicator for pan mode (disabled button)
   - Styling:
     - Dark theme compatible
     - Background with border and shadow
     - Uses shadcn/ui Button components
   - Uses React Flow's `Panel` component for positioning

3. **ProjectDetailCanvas Component**
   - Main canvas container with React Flow
   - Configuration:
     - Pan on drag: Enabled (click and drag to pan)
     - Zoom on scroll: Enabled (mouse wheel to zoom)
     - Zoom range: 0.1 (10%) to 4 (400%)
     - Default viewport: Centered at 1x zoom
     - Canvas-only mode: Nodes not draggable/connectable yet
   - Background:
     - Dot pattern grid (BackgroundVariant.Dots)
     - 20px spacing between dots
     - 1px dot radius
     - Color: `hsl(var(--border))` for dark theme compatibility
   - Integrated components:
     - ArrowKeyPanner for keyboard navigation
     - CustomControls for zoom/pan controls

**Layout Changes**:
- Canvas fills entire viewport below header
- Height calculation: `calc(100vh - 4rem)` (4rem = 64px header)
- Wrapped with ReactFlowProvider for context
- Full-width, no max-width constraints

**User Interactions**:
- **Pan**: Click and drag anywhere, or use arrow keys
- **Zoom**: Mouse wheel, or +/- buttons in control panel
- **Navigate**: Back button (top-left), Sign out (top-right)

**New Imports Added**:
- `ReactFlow`, `Background`, `BackgroundVariant`, `Panel`, `useReactFlow`, `ReactFlowProvider`, `useKeyPress` from @xyflow/react
- `@xyflow/react/dist/style.css` for base styles
- `Plus`, `Minus`, `Hand` icons from lucide-react

### Technical Implementation Details

#### State Management
- Empty nodes/edges arrays (ready for future flowchart elements)
- React Flow handles viewport state internally
- Custom controls use `zoomIn()` and `zoomOut()` methods

#### Performance Considerations
- React Flow optimized for large canvases
- Dot grid renders efficiently
- Smooth animations with 200ms duration
- Viewport updates batched by React Flow

#### Dark Theme Integration
- Dot grid uses theme border color: `hsl(var(--border))`
- Control panel uses theme background and border colors
- All components follow existing dark theme patterns
- React Flow canvas background: `bg-background` class

### Future-Ready Architecture

**Infinite Canvas Foundation**:
- Ready for flowchart node addition
- Supports custom node types (rectangles, diamonds, circles, etc.)
- Can implement node connections with edges
- Prepared for:
  - Drag-and-drop node creation
  - Node editing and deletion
  - Canvas state persistence to database
  - Collaborative features
  - Minimap for navigation
  - Undo/redo functionality

**React Flow Benefits**:
- Built specifically for node-based UIs
- Excellent performance with large graphs
- Extensive API for customization
- Active community and documentation
- TypeScript support out of the box

### Security Maintained
- All existing security measures remain in place
- Project ownership still verified on page load
- Authentication required for canvas access
- RLS policies protect all database operations

### Updated Files Summary
1. `package.json` - Added @xyflow/react dependency
2. `src/pages/Index.tsx` - Delete functionality, text updates
3. `src/components/NewProjectDialog.tsx` - Placeholder text update
4. `src/pages/ProjectDetail.tsx` - Complete restructure with infinite canvas

### Dependencies Added
- `@xyflow/react@12.10.0` - Infinite canvas and node-based UI library

### Testing Checklist
- ✅ Text changes visible on Index page
- ✅ Delete button appears on card hover
- ✅ Delete confirmation dialog works
- ✅ Project deletion successful with ownership verification
- ✅ Toast notifications show on delete success/error
- ✅ Header buttons flush to edges
- ✅ Sign out button works and redirects
- ✅ Infinite canvas renders with dot grid
- ✅ Click-drag panning works
- ✅ Arrow key panning works (50px steps)
- ✅ Mouse wheel zoom works (10%-400% range)
- ✅ +/- buttons in control panel work
- ✅ Canvas extends infinitely in all directions
- ✅ Dark theme colors consistent throughout

### Known Enhancements Completed
- ✅ Project deletion functionality (was: "No project deletion functionality yet")
- ✅ Project detail page content (was: "Project detail page is placeholder")

### Remaining Future Enhancements
- Project editing functionality
- Flowchart node creation on canvas
- Node connections and relationships
- Canvas state persistence to database
- Project tags/categories
- Project sharing/collaboration
- Server-side search enhancement
- Minimap for canvas navigation
- Undo/redo for canvas operations

---

## [2024-12-25] - Initial Projects Feature Implementation

### Database Schema

#### Created `projects` Table
- **Table**: `public.projects`
- **Purpose**: Store user projects with secure access control
- **Schema**:
  - `id` (UUID, PRIMARY KEY, auto-generated)
  - `user_id` (UUID, NOT NULL, FOREIGN KEY → auth.users.id, CASCADE DELETE)
  - `name` (TEXT, NOT NULL, 1-100 characters, trimmed)
  - `description` (TEXT, nullable, max 1000 characters)
  - `created_at` (TIMESTAMP WITH TIME ZONE, NOT NULL, default now())
  - `updated_at` (TIMESTAMP WITH TIME ZONE, NOT NULL, default now())
  - Unique constraint: `(user_id, name)` - prevents duplicate project names per user

#### Security Implementation
- **Row Level Security (RLS)**: Enabled immediately after table creation
- **RLS Policies**:
  - SELECT: Users can only view projects where `auth.uid() = user_id`
  - INSERT: Users can only insert projects with `auth.uid() = user_id` (prevents spoofing)
  - UPDATE: Users can only update their own projects (USING + WITH CHECK clauses)
  - DELETE: Users can only delete their own projects
- **Permissions**:
  - Revoked all access from `anon` and `public` roles
  - Granted SELECT, INSERT, UPDATE, DELETE to `authenticated` role only
- **Constraints**:
  - CHECK constraint on name length (1-100 characters)
  - CHECK constraint on description length (max 1000 characters)
  - Foreign key with CASCADE DELETE (projects deleted when user deleted)

#### Database Indexes
- `idx_projects_user_id` - Index on `user_id` for fast user-scoped queries
- `idx_projects_user_name` - Composite index on `(user_id, name)` for efficient search
- `idx_projects_created_at` - Index on `created_at DESC` for sorting

#### Database Functions & Triggers
- **Function**: `update_projects_updated_at()` - Auto-updates `updated_at` timestamp
- **Trigger**: `update_projects_updated_at` - Executes before UPDATE operations

### Frontend Implementation

#### New Components

**NewProjectDialog Component** (`src/components/NewProjectDialog.tsx`)
- Modal dialog for creating new projects
- Form validation using Zod schema:
  - Name: Required, 1-100 characters, trimmed
  - Description: Optional, max 1000 characters, trimmed
- Security: `user_id` automatically set from authenticated session (never from user input)
- Error handling:
  - Duplicate name detection (error code 23505)
  - Generic error messages (no information disclosure)
- Toast notifications for success/error states

#### Updated Pages

**Index Page** (`src/pages/Index.tsx`)
- Complete rewrite from welcome page to projects dashboard
- Features:
  - Header with "Your Projects" title and subtitle
  - Search bar with real-time filtering (client-side)
  - "+ New Project" button
  - Responsive project grid (1 column mobile, 2 columns tablet, 3 columns desktop)
  - Project cards displaying:
    - Code icon (Code2 from lucide-react)
    - Project name and description
    - "Updated X ago" timestamp using date-fns
    - Active status badge
  - Empty state with call-to-action
  - Clickable cards navigating to project detail page
- Security:
  - Authentication check before loading projects
  - All queries include `.eq('user_id', userId)` filter (defense in depth)
  - Session expiration handling with redirect to auth
  - Real-time auth state monitoring

**ProjectDetail Page** (`src/pages/ProjectDetail.tsx`)
- New page for viewing individual project details
- Features:
  - Back button to return to projects list
  - Ownership verification before displaying any data
  - Placeholder content for future features
- Security:
  - Verifies project ownership with explicit `user_id` filter
  - Generic "not found" messages (prevents enumeration attacks)
  - Redirects unauthorized users to home page

#### Routing Updates

**App Component** (`src/App.tsx`)
- Added route: `/project/:id` → ProjectDetail component
- Maintains existing routes: `/`, `/auth`, `*` (NotFound)

#### Type Definitions

**Supabase Types** (`src/integrations/supabase/types.ts`)
- Added `projects` table type definitions:
  - Row type (all fields)
  - Insert type (required/optional fields)
  - Update type (all optional fields)
  - Relationships array (empty for now)

### Security Measures Implemented

#### Database Layer
- ✅ RLS enabled on projects table
- ✅ SELECT policy restricts to user's own projects
- ✅ INSERT policy prevents user_id spoofing
- ✅ UPDATE policy with USING and WITH CHECK clauses
- ✅ DELETE policy restricts to user's own projects
- ✅ All public/anon access revoked
- ✅ Foreign key constraint with CASCADE delete
- ✅ Input validation at database level (CHECK constraints)
- ✅ Unique constraint prevents duplicate project names per user
- ✅ Indexes for performance (RLS still applies)

#### Application Layer
- ✅ All queries include `.eq('user_id', userId)` filter (defense in depth)
- ✅ Authentication check before any data operations
- ✅ User ID always from session, never from user input
- ✅ Input validation with Zod before database operations
- ✅ Generic error messages (no information disclosure)
- ✅ Ownership verification on project detail page
- ✅ Session expiration handling with redirect to auth
- ✅ No raw SQL queries (use Supabase query builder)

### Security Principles Applied
1. **Defense in Depth**: RLS + explicit user_id filters in queries
2. **Least Privilege**: Users can only access their own data
3. **Input Validation**: Client-side (Zod) + Server-side (CHECK constraints)
4. **Fail Secure**: Generic errors, no data leakage
5. **Authentication Required**: All operations require valid session
6. **No IDOR Vulnerabilities**: Ownership verified on every access
7. **No Enumeration Attacks**: Generic "not found" messages
8. **SQL Injection Prevention**: Parameterized queries via Supabase client

### Privacy Guarantees
- Users cannot see other users' projects (RLS enforced)
- Users cannot modify other users' projects (RLS enforced)
- Users cannot delete other users' projects (RLS enforced)
- Project IDs are UUIDs (not easily guessable, but RLS still protects)
- No cross-user data leakage possible
- Search is scoped to user's own projects only

### Dependencies Used
- `@supabase/supabase-js` - Database client and authentication
- `zod` - Schema validation
- `date-fns` - Date formatting (formatDistanceToNow)
- `lucide-react` - Icons (Search, Plus, Code2, ArrowLeft)
- `sonner` - Toast notifications
- `react-router-dom` - Routing

### Testing Status
- ✅ Database schema created and verified
- ✅ RLS policies verified
- ✅ Indexes verified
- ✅ Triggers verified
- ✅ TypeScript compilation successful
- ✅ Build successful
- ✅ Authentication flow working
- ✅ Project creation working
- ✅ Project listing working
- ✅ Search functionality working
- ✅ Project detail page working
- ✅ Navigation working

### Known Limitations / Future Enhancements
- Project detail page is placeholder (content coming soon)
- No project editing functionality yet
- No project deletion functionality yet
- No project tags/categories yet
- No project sharing/collaboration yet
- Search is client-side only (could be enhanced with server-side search)

---

## Notes
- All database changes were executed directly in Supabase SQL Editor
- TypeScript types were manually updated (can be regenerated with Supabase CLI if needed)
- All security measures follow industry best practices
- Code follows existing project patterns and conventions

