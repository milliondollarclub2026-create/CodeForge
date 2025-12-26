# PRD Builder - Project Vision & Scope

## Core Problem
Users struggle to create effective PRDs for AI coding tools (Cursor, Bolt, Lovable, Claude Code). 
Single-prompt approach fails. These tools need structured, detailed requirements to produce 
quality outputs.

## Solution
AI-assisted PRD generation tool using interactive node-based flowcharts. Users describe their 
app in natural language; system guides them through structured requirement gathering via 
conversational AI, then generates comprehensive PRDs.

## Primary User Flow
1. User creates project, gets empty canvas with root node
2. User clicks root node → Opens chat interface (orchestrator LLM)
3. User describes app idea in plain language
4. Orchestrator asks targeted questions:
   - "Who is your target audience?" → Creates Target Audience nodes
   - "What features do you need?" → Creates Feature nodes
   - "What's your tech stack?" → Creates Tech Stack nodes
5. For each feature, user can add:
   - **Notes**: Detailed descriptions in rich text
   - **To-do List**: Implementation checklist
   - **Moodboard**: UI/UX reference images
   - **PRD**: Auto-generated frontend/backend/database PRDs
6. Final output: Comprehensive PRD ready for Cursor/Bolt/Claude Code

## Technical Architecture (End State)

### Frontend
- React + TypeScript + Vite
- React Flow for infinite canvas + node visualization
- Supabase client for real-time data sync
- Anthropic API for LLM orchestration (Claude Sonnet 4.5)
- TailwindCSS + shadcn/ui for components

### Backend
- Supabase (PostgreSQL + Auth + Storage + RLS)
- Database tables:
  - projects (already exists)
  - node_categories (extensible node types)
  - nodes (flowchart nodes with position, title, status, priority)
  - edges (node connections with types)
  - node_notes (rich text content, Phase 3)
  - node_todos (checklist items, Phase 3)
  - node_moodboard_images (file references, Phase 3)
  - chat_messages (LLM conversation history, Phase 4)

### Security Model
- Row-Level Security (RLS) on ALL tables
- Ownership verification: user_id → projects → nodes → sub-features
- Defense in depth: RLS + explicit user_id filters in queries
- No IDOR vulnerabilities, no enumeration attacks
- All inputs validated (client: Zod, database: CHECK constraints)

### LLM Integration (Phase 4)
- Claude API with prompt caching (90% cost reduction)
- Stateless calls with full context injection
- Flowchart serialized to JSON, sent as cached context
- LLM responses parsed for: node creation, content updates, PRD generation
- Conversation history maintained per project

## Current Implementation Status
✅ Authentication (Supabase Auth)
✅ Projects CRUD with RLS
✅ React Flow infinite canvas with zoom/pan
✅ Dark theme UI
✅ Routing and navigation

🚧 In Progress: Node system foundation

## Phased Rollout

**Phase 1: Node Foundation (Current)**
- Database: Categories, Nodes, Edges tables with RLS
- API: CRUD operations with ownership verification
- UI: Root node auto-creation, manual Feature node creation
- No LLM yet (manual workflow only)

**Phase 2: Node Enhancement**
- Edit node titles, priority, status
- Multiple node types (Target Audience, Tech Stack, Competitor)
- Node search/filter
- Canvas state optimizations

**Phase 3: Sub-Features**
- Notes (rich text editor)
- To-do lists (checkboxes + text)
- Moodboard (image upload to Supabase Storage)
- Per-feature state management

**Phase 4: LLM Orchestrator**
- Chat interface sidebar
- Anthropic API integration with caching
- Conversational node creation
- Context-aware suggestions

**Phase 5: PRD Generation**
- Template system (frontend/backend/database PRDs)
- LLM-powered PRD writing using full project context
- Export to Markdown/PDF
- Copy-paste optimization for AI coding tools

## Key Design Principles
1. **Database as source of truth** - React Flow is view layer only
2. **Normalized data model** - No JSONB blobs for queryable data
3. **Extensibility over rigidity** - Categories table, not hardcoded enums
4. **Security first** - RLS on every table, explicit ownership checks
5. **Incremental development** - Each phase independently functional
6. **LLM-friendly structure** - Easily serializable to JSON for context

## Success Metrics (Post-Launch)
- Users generate 3x more detailed PRDs vs manual writing
- 80%+ of users successfully integrate with AI coding tools
- Average PRD generation time: <15 minutes
- Cost per PRD generation: <$0.50 (via prompt caching)

