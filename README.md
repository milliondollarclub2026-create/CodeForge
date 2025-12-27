# FlowForge - AI-Powered PRD Builder

An intelligent Product Requirements Document (PRD) builder that uses AI to guide you through creating comprehensive, structured requirements for your software projects. Perfect for teams using AI coding tools like Cursor, Bolt, Lovable, and Claude Code.

## 🚀 Features

### AI-Powered Chat Assistant
- **Interactive Guidance**: Press `Ctrl+A` to open an AI chat assistant that guides you through PRD creation
- **Voice & Text Input**: Use voice commands or type your responses naturally
- **5-Step Workflow**: Structured approach to gather context → features → tech stack → database → user flows
- **Smart Auto-Creation**: AI automatically creates and populates context nodes as you describe your project
- **Powered by Claude Sonnet 4**: Advanced language model for intelligent conversations

### Visual Node-Based Canvas
- **Infinite Canvas**: React Flow-powered canvas for visualizing your project structure
- **4 Context Node Types**:
  - **Features Node** (singleton): Blue-themed node containing all project features
  - **Tech Stack Node** (singleton): Orange-themed node with technology choices
  - **Database Nodes** (multiple): Pink-themed nodes for each database entity
  - **User Flows Nodes** (multiple): Purple-themed nodes for user workflows
- **Smart Edge Routing**: Directional connections from root node to context nodes
- **Drag & Pan**: Intuitive navigation with mouse and keyboard shortcuts

### Comprehensive Data Management
- **Features**: Track title, description, and requirements for each feature
- **Tech Stack**: Document frontend/backend frameworks, services, tools, and APIs with version details
- **Database Entities**: Define data models with security settings and relationships
- **User Flows**: Map out step-by-step user journeys with start/end states

### Enterprise-Grade Security
- **Row Level Security (RLS)**: All data protected at the database level
- **Authentication**: Secure user authentication via Supabase Auth
- **Ownership Verification**: Users can only access their own projects
- **Privacy First**: No cross-user data leakage possible

## 🎯 Perfect For

- Product managers creating requirements for AI coding tools
- Development teams planning new features
- Startups documenting their MVP
- Anyone who wants structured, AI-assisted PRD generation

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **React Flow** for infinite canvas and node visualization
- **shadcn/ui** + **Tailwind CSS** for beautiful, accessible UI components
- **Lucide React** for icons

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + RLS)
- **Supabase Edge Functions** for serverless API endpoints

### AI Integration
- **Claude Sonnet 4** (Anthropic API) for intelligent PRD generation
- **OpenAI Whisper** for speech-to-text transcription
- **Structured Prompts** with guided workflow for consistent results

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)
- Anthropic API key (for Claude)
- OpenAI API key (for Whisper)

### Setup

1. **Clone the repository**
```sh
git clone https://github.com/milliondollarclub2026-create/CodeForge.git
cd CodeForge
```

2. **Install dependencies**
```sh
npm install
```

3. **Set up environment variables**

Create a `.env.local` file (use `.env.local.example` as template):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

4. **Run database migrations**

Navigate to your Supabase project and run the SQL migrations in `supabase/migrations/` in order.

5. **Deploy Edge Functions** (optional for local development)
```sh
npx supabase functions deploy chat-text
npx supabase functions deploy chat-voice
```

6. **Start the development server**
```sh
npm run dev
```

The app will be available at `http://localhost:8080`

## 🎮 Usage

### Creating Your First PRD

1. **Sign up** and create a new project
2. **Open AI Chat** by pressing `Ctrl+A` or clicking the "AI Assistant" button
3. **Describe your project** when prompted by the AI
4. **Follow the 5-step workflow**:
   - **Step 0**: Provide project context
   - **Step 1**: Select core features from AI suggestions
   - **Step 2**: Choose technical requirements
   - **Step 3**: Define database entities
   - **Step 4**: Map out user flows
5. **Review the canvas** - All nodes are auto-created and populated with your selections
6. **Refine nodes** - Click any node to edit, add details, or delete

### Keyboard Shortcuts

- `Ctrl+A` - Open/close AI chat assistant
- **Arrow Keys** - Pan the canvas
- **Mouse Wheel** - Zoom in/out
- **Click + Drag** - Pan the canvas

### Voice Commands

1. Click the microphone button in the chat
2. Speak your response clearly
3. AI will transcribe and process your input

## 🏗️ Architecture

### Database Schema

- **projects** - User projects with name and description
- **node_categories** - Extensible node types (features, tech_stack, database, user_flows)
- **nodes** - Canvas nodes with position, title, status, and metadata (JSONB)
- **edges** - Connections between nodes with directional handles

### Edge Routing System

Each context node type connects to the root node from a specific direction:
- **Features**: Root RIGHT → Child LEFT
- **Tech Stack**: Root BOTTOM → Child TOP
- **Database**: Root LEFT → Child RIGHT
- **User Flows**: Root TOP → Child BOTTOM

### AI Chat Workflow

1. User input → Frontend chat component
2. Message sent to Edge Function (chat-text or chat-voice)
3. Edge Function calls Claude Sonnet 4 with structured prompt
4. AI response parsed for OPTIONS and SUGGESTIONS
5. SUGGESTIONS trigger auto-node creation via `autoCreateNode.ts`
6. Canvas updates in real-time

## 📄 Project Structure

```
FlowForge/
├── src/
│   ├── components/
│   │   ├── ChatSidebar.tsx          # AI chat interface
│   │   ├── ChatMessage.tsx          # Message display
│   │   ├── VoiceInput.tsx           # Voice recording
│   │   ├── nodes/
│   │   │   ├── CustomNode.tsx       # Database & User Flow nodes
│   │   │   ├── FeaturesNode.tsx     # Features node
│   │   │   └── TechStackNode.tsx    # Tech stack node
│   │   └── modals/
│   │       ├── AddFeatureModal.tsx
│   │       ├── AddTechStackModal.tsx
│   │       ├── AddDatabaseEntityModal.tsx
│   │       └── AddUserFlowModal.tsx
│   ├── hooks/
│   │   ├── useChatAssistant.ts      # Chat state management
│   │   └── useKeyboardShortcuts.ts  # Global shortcuts
│   ├── lib/
│   │   ├── autoCreateNode.ts        # Auto-node creation logic
│   │   ├── chatApi.ts               # Claude & Whisper API calls
│   │   └── chatStorage.ts           # localStorage persistence
│   ├── pages/
│   │   ├── Index.tsx                # Projects dashboard
│   │   └── ProjectDetail.tsx        # Canvas view
│   └── types/
│       └── chat.ts                  # TypeScript types
├── supabase/
│   ├── migrations/                  # Database schema
│   └── functions/                   # Edge Functions
│       ├── chat-text/
│       └── chat-voice/
└── .env.local.example               # Environment template
```

## 🔒 Security

### Database Level
- Row Level Security (RLS) enabled on all tables
- Users can only access their own projects and nodes
- Foreign key constraints with CASCADE delete
- Input validation with CHECK constraints

### Application Level
- Authentication required for all operations
- User ID always from session, never from client input
- Generic error messages (no information disclosure)
- Ownership verification on every data access

### API Keys
- API keys stored in environment variables
- Edge Functions keep keys server-side
- `dangerouslyAllowBrowser: true` only for development

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.com/claude-code)
- Powered by [Anthropic's Claude](https://www.anthropic.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Canvas powered by [React Flow](https://reactflow.dev/)

## 📧 Contact

- GitHub: [@milliondollarclub2026-create](https://github.com/milliondollarclub2026-create)
- Repository: [CodeForge](https://github.com/milliondollarclub2026-create/CodeForge)

---

**Made with ❤️ by the FlowForge team**
