# 📊 PromptDeck  
_AI-Powered Presentation Generator with Automated Code Execution_

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)

## 🚀 Overview

**PromptDeck** is a production-ready full-stack application that transforms natural language prompts into beautiful, interactive HTML presentations. Leveraging AI code generation, sandboxed execution, and intelligent persistence, it eliminates the tedium of manual slide creation.

**Problem:** Manual presentation creation is slow, repetitive, and creatively limiting.  
**Solution:** Natural language → AI generation → Validated HTML → Production-ready slides with Impress.js transitions.

---

## 🏗️ System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Client Layer"]
        UI[Next.js Frontend<br/>React 19 + App Router]
    end
    
    subgraph API["⚡ API Layer"]
        TRPC[tRPC Router<br/>Type-Safe API]
        ZOD[Zod Validation]
    end
    
    subgraph Business["🧠 Business Logic"]
        PROC[Server Procedures]
        USAGE[Usage Manager<br/>Credits & Rate Limiting]
    end
    
    subgraph Async["🔄 Async Processing"]
        INNGEST[Inngest Event Queue]
        WORKER[Background Workers]
    end
    
    subgraph External["🌐 External Services"]
        AI[Gemini 3.0 Pro / OpenAI]
        SANDBOX[E2B Sandbox<br/>Isolated Execution]
        AUTH[Clerk Auth]
    end
    
    subgraph Data["💾 Data Layer"]
        PRISMA[Prisma ORM]
        DB[(PostgreSQL)]
    end
    
    UI -->|tRPC Client| TRPC
    TRPC --> ZOD
    ZOD --> PROC
    PROC --> USAGE
    PROC --> INNGEST
    PROC --> PRISMA
    INNGEST --> WORKER
    WORKER --> AI
    WORKER --> SANDBOX
    WORKER --> PRISMA
    PRISMA --> DB
    UI -.->|Auth| AUTH
    PROC -.->|Verify| AUTH
    
    style Client fill:#e1f5ff
    style API fill:#fff4e6
    style Business fill:#f3e5f5
    style Async fill:#e8f5e9
    style External fill:#fce4ec
    style Data fill:#f1f8e9
```

### Request Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                            │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │ UI Layer   │ -> │ tRPC Client  │ -> │ React Query  │         │
│  └────────────┘    └──────────────┘    └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  tRPC API Layer (/api/trpc/[trpc])                         │ │
│  │  • Input Validation (Zod)                                  │ │
│  │  • Type Safety Enforcement                                 │ │
│  │  • Request Context (Auth, Session)                         │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Server Procedures Layer                                  │  │
│  │  ┌──────────────┐   ┌──────────────┐  ┌─────────────────┐ │  │
│  │  │   Projects   │   │   Messages   │  │  Usage/Quotas   │ │  │
│  │  │  Procedures  │   │  Procedures  │  │   Procedures    │ │  │
│  │  └──────┬───────┘   └──────┬───────┘  └────────┬────────┘ │  │
│  └─────────┼──────────────────┼───────────────────┼──────────┘  │
└────────────┼──────────────────┼───────────────────┼─────────────┘
             │                  │                   │
             ▼                  ▼                   ▼
    ┌────────────────┐  ┌──────────────────┐  ┌──────────────┐
    │  Inngest Event │  │   Prisma ORM     │  │ Rate Limiter │
    │     Queue      │  │   (PostgreSQL)   │  │              │
    └────────┬───────┘  └──────────────────┘  └──────────────┘
             │
             ▼
    ┌──────────────────────────────────────────────────────────┐
    │           INNGEST WORKER (Async)                         │
    │  ┌─────────────────────────────────────────────────────┐ │
    │  │  1. Fetch conversation context (last 5 messages)    │ │
    │  │  2. Call AI API (Gemini/OpenAI) with system prompt  │ │
    │  │  3. Validate generated code                         │ │
    │  │  4. Create E2B sandbox instance                     │ │
    │  │  5. Execute code in isolated environment            │ │
    │  │  6. Persist results (Fragment + Files)              │ │
    │  │  7. Update message status                           │ │
    │  └─────────────────────────────────────────────────────┘ │
    └──────────────────────────────────────────────────────────┘
             │                    │
             ▼                    ▼
    ┌─────────────┐      ┌──────────────────┐
    │  AI Models  │      │   E2B Sandbox    │
    │  Gemini 3.0 │      │  (Code Executor) │
    │  OpenAI API │      │                  │
    └─────────────┘      └──────────────────┘
```

### Design Patterns & Principles

| Pattern | Implementation | Benefit |
|---------|---------------|---------|
| **Feature-Based Modules** | Each feature (projects, messages, usage) is self-contained | Easier scaling, reduced coupling |
| **Type-Safe API** | tRPC with full TypeScript inference | Catch errors at compile-time |
| **Event-Driven Processing** | Inngest for async operations | Non-blocking requests, better UX |
| **Repository Pattern** | Prisma ORM abstracts data access | Database agnostic, easier testing |
| **Command Query Separation** | Mutations vs. queries in procedures | Clear intent, optimized operations |
| **Dependency Injection** | Context passed to all procedures | Testable, flexible |

---

## 📁 Project Structure

```
prompt-deck/
│
├── 📱 src/app/                    # Next.js App Router (Pages & API Routes)
│   ├── (home)/                    # Home route group
│   │   ├── page.tsx               # Landing page
│   │   ├── sign-in/[[...sign-in]]/
│   │   ├── sign-up/[[...sign-up]]/
│   │   └── pricing/page.tsx
│   ├── projects/[projectId]/      # Dynamic project detail route
│   │   └── page.tsx
│   ├── api/
│   │   ├── trpc/[trpc]/route.ts   # tRPC HTTP handler
│   │   └── inngest/route.ts       # Inngest webhook endpoint
│   ├── layout.tsx
│   ├── globals.css
│   └── error.tsx
│
├── 🧩 src/modules/                # Feature-Based Architecture
│   ├── home/
│   │   └── ui/components/
│   │       ├── navbar.tsx
│   │       ├── project-form.tsx   # Create presentation form
│   │       └── projects-list.tsx
│   ├── projects/
│   │   ├── server/
│   │   │   └── procedures.ts      # CRUD operations for projects
│   │   └── ui/components/
│   │       ├── fragment-web.tsx   # Iframe presentation viewer
│   │       ├── message-card.tsx
│   │       ├── message-form.tsx
│   │       └── project-header.tsx
│   ├── messages/
│   │   └── server/
│   │       └── procedures.ts      # Message operations
│   └── usage/
│       └── server/
│           └── procedures.ts      # Credit management
│
├── 🔌 src/trpc/                   # Type-Safe API Layer
│   ├── routers/
│   │   └── _app.ts                # Root router composition
│   ├── client.tsx                 # React tRPC client
│   ├── init.ts                    # Server initialization
│   ├── query-client.ts            # React Query configuration
│   └── server.tsx
│
├── ⚙️ src/inngest/                # Background Job System
│   ├── client.ts                  # Inngest client instance
│   ├── functions.ts               # Job definitions (code-agent/run)
│   ├── types.ts                   # Type definitions
│   └── utils.ts
│
├── 🎨 src/components/             # Shared UI Components
│   ├── ui/                        # Shadcn components (Button, Card, etc.)
│   ├── code-view/                 # Syntax-highlighted code viewer
│   ├── file-explorer.tsx
│   ├── tree-view.tsx
│   └── user-control.tsx
│
├── 🪝 src/hooks/                  # Custom React Hooks
│   ├── use-current-theme.ts
│   ├── use-mobile.ts
│   └── use-scroll.ts
│
├── 🛠️ src/lib/                    # Utility Functions & Config
│   ├── db.ts                      # Prisma singleton
│   ├── usage.ts                   # Credit/quota logic
│   └── utils.ts                   # Helpers (cn, formatters, etc.)
│
├── 📝 src/prompt.ts               # AI system prompts
├── 🔒 src/middleware.ts           # Auth middleware
│
├── 💾 prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Version-controlled migrations
│
├── 📦 package.json
├── ⚙️ next.config.ts
├── 🎨 tailwind.config.ts
└── 📘 tsconfig.json
```

---

## 🗄️ Database Schema

```mermaid
erDiagram
    User ||--o{ Project : creates
    Project ||--o{ Message : contains
    Message ||--o| Fragment : generates
    User ||--o{ Usage : tracks

    User {
        string id PK "From Clerk"
        string email
        datetime createdAt
    }

    Project {
        uuid id PK
        string name
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    Message {
        uuid id PK
        uuid projectId FK
        text content
        enum role "USER | ASSISTANT"
        enum type "RESULT | ERROR"
        datetime createdAt
        datetime updatedAt
    }

    Fragment {
        uuid id PK
        uuid messageId FK "UNIQUE"
        string sandboxUrl
        string title
        json files
        datetime createdAt
        datetime updatedAt
    }

    Usage {
        string key PK "userId-timestamp"
        int points
        datetime expire
    }
```

### Schema Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **User Management** | External (Clerk) | Offload auth complexity, social login out-of-the-box |
| **Cascade Deletes** | Project → Message → Fragment | Data integrity, automatic cleanup |
| **Message Types** | Enum (USER/ASSISTANT) | Type-safe message distinction |
| **Fragment Storage** | JSON for files | Flexible schema, no separate file table needed |
| **Usage Tracking** | Composite key (userId-timestamp) | Efficient lookups, time-based quotas |

---

## 🔧 Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js | 15 | React framework with App Router |
| **UI Library** | React | 19 | Component-based UI |
| **Type Safety** | TypeScript | 5.0 | Static typing |
| **API** | tRPC | Latest | End-to-end type-safe API |
| **Validation** | Zod | Latest | Runtime schema validation |
| **Styling** | TailwindCSS | v4 | Utility-first CSS |
| **Components** | Shadcn UI | Latest | Accessible component library |
| **Database** | PostgreSQL | 14+ | Relational database |
| **ORM** | Prisma | Latest | Type-safe database client |
| **Background Jobs** | Inngest | Latest | Reliable async processing |
| **AI Models** | Gemini 3.0 Pro, OpenAI | Latest | Code generation |
| **Code Execution** | E2B | Latest | Sandboxed environment |
| **Auth** | Clerk | Latest | User authentication |
| **Rate Limiting** | rate-limiter-flexible | Latest | Abuse prevention |

---

## ✨ Core Features

### 🎯 1. AI-Powered Generation
- **Smart Context Awareness**: Uses last 5 messages for iterative improvements
- **Multi-Model Support**: Gemini 3.0 Pro primary, OpenAI fallback
- **Accessibility Validation**: Ensures proper contrast ratios and semantic HTML
- **Custom Transitions**: Generates Impress.js presentations with 3D effects

### 🗂️ 2. Project Management
- **Multi-Project Support**: Organize presentations by topic/client
- **Auto-Naming**: Random slug generation for quick starts
- **Version History**: Full message history for each project
- **Collaborative Ready**: Architecture supports future multi-user features

### 💬 3. Conversational Interface
- **Context Retention**: AI remembers previous interactions
- **Refinement Support**: "Make it more colorful", "Add a graph on slide 3"
- **Error Handling**: Graceful fallbacks with helpful error messages
- **Real-Time Feedback**: Loading states and progress indicators

### 🔒 4. Sandboxed Execution
- **Security First**: No arbitrary code runs on main server
- **Persistent URLs**: Each generation gets a unique sandbox endpoint
- **Resource Isolation**: Memory and CPU limits per sandbox
- **Automatic Cleanup**: Sandboxes expire after inactivity

### 💳 5. Usage & Billing
- **Credit System**: Each generation costs credits
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Auto-Reset**: Daily/monthly quota replenishment
- **Usage Analytics**: Track consumption patterns

---

## 🔄 Data Flow Diagrams

### Creating a Presentation

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant T as tRPC API
    participant DB as PostgreSQL
    participant I as Inngest
    participant W as Worker
    participant AI as Gemini API
    participant E as E2B Sandbox

    U->>F: Submit prompt
    F->>T: projects.create({ value: prompt })
    T->>T: Validate with Zod
    T->>DB: Check credits
    DB-->>T: Credits available
    T->>DB: Create Project + Message
    T->>I: Emit event (code-agent/run)
    T-->>F: Return Project ID
    F->>F: Show loading state
    
    I->>W: Trigger background job
    W->>DB: Fetch last 5 messages
    W->>AI: Generate code with context
    AI-->>W: HTML + CSS + JS
    W->>W: Validate output
    W->>E: Create sandbox + deploy code
    E-->>W: Sandbox URL
    W->>DB: Create Fragment with files
    W->>DB: Update Message status
    
    F->>T: Poll for updates
    T->>DB: Fetch latest messages
    DB-->>T: Message + Fragment
    T-->>F: Return data
    F->>U: Display presentation
```

### Viewing a Presentation

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant T as tRPC API
    participant DB as PostgreSQL
    participant E as E2B Sandbox

    U->>F: Navigate to /projects/:id
    F->>T: projects.getOne({ id })
    T->>DB: SELECT Project + Messages + Fragments
    DB-->>T: Complete project data
    T-->>F: Return project
    F->>F: Render message history
    F->>E: Load fragment in iframe
    E-->>U: Display presentation
    U->>F: Send new message
    Note over U,E: Flow repeats from "Creating a Presentation"
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Package Manager**: npm, yarn, or pnpm

### Required API Keys

| Service | Purpose | Free Tier | Sign Up |
|---------|---------|-----------|---------|
| **Clerk** | Authentication | Yes (10k MAUs) | [clerk.com](https://clerk.com) |
| **Inngest** | Background jobs | Yes | [inngest.com](https://www.inngest.com) |
| **E2B** | Code sandboxes | Yes | [e2b.dev](https://e2b.dev) |
| **Google AI** | Gemini 3.0 Pro | Yes | [ai.google.dev](https://ai.google.dev) |
| **OpenAI** | Fallback LLM | Trial credits | [platform.openai.com](https://platform.openai.com) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/prompt-deck.git
cd prompt-deck

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Configure your .env.local file (see below)

# 5. Set up database
npx prisma migrate dev
npx prisma generate

# 6. Seed initial data (optional)
npm run seed
```

### Environment Configuration

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/prompt_deck?schema=public"

# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxxxxxxxxx"
CLERK_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Inngest (Background Jobs)
INNGEST_EVENT_KEY="evt_xxxxxxxxxxxxxxxxxxxx"
INNGEST_SIGNING_KEY="signkey_xxxxxxxxxxxxxxxxxxxx"

# AI APIs
GOOGLE_API_KEY="AIzaSyxxxxxxxxxxxxxxxxxx"  # For Gemini
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxx"  # Fallback

# E2B (Code Sandbox)
E2B_API_KEY="e2b_xxxxxxxxxxxxxxxxxxxxxxxx"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Running the Application

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Inngest dev server (required for code generation)
npx inngest-cli@latest dev

# Terminal 3 (Optional): Prisma Studio for database management
npx prisma studio

# Open http://localhost:3000
```

> **Important**: All three terminals must be running for full functionality. The Inngest CLI is essential for presentation generation.

### Development Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Database operations
npx prisma migrate dev --name your_migration_name
npx prisma migrate reset  # Careful! Deletes all data
npx prisma studio  # Visual database browser

# Generate Prisma Client
npx prisma generate

# View generated SQL
npx prisma migrate diff
```

---

## 📝 API Reference

### tRPC Procedures

#### Projects

```typescript
// Create a new project and trigger AI generation
projects.create({
  value: string  // User's prompt
})
// Returns: { id: string, name: string, userId: string, createdAt: Date }

// Get single project with messages and fragments
projects.getOne({
  id: string  // Project UUID
})
// Returns: Project & { messages: Message[] }

// Get all user's projects
projects.getMany()
// Returns: Project[]
```

#### Messages

```typescript
// Add message to project (manual refinement)
messages.create({
  projectId: string,
  content: string
})
// Returns: Message

// List all messages for a project
messages.list({
  projectId: string
})
// Returns: Message[] & { fragment?: Fragment }
```

#### Usage

```typescript
// Check credit balance and consume credits
usage.checkAndConsume()
// Returns: { success: boolean, remaining: number }

// Get current credit balance
usage.getRemaining()
// Returns: { points: number, resetDate: Date }
```

---

## 🎨 UI Component Library

Built on **Shadcn UI** with **TailwindCSS v4**:

### Core Components
- `Button`, `Card`, `Dialog`, `Dropdown`
- `Form`, `Input`, `Select`, `Textarea`
- `Tabs`, `Toast`, `Tooltip`

### Custom Components
- **CodeView**: Syntax-highlighted code display
- **FileExplorer**: Interactive file tree
- **FragmentWeb**: Sandboxed presentation viewer
- **MessageCard**: Chat-style message display
- **ProjectForm**: Multi-step creation wizard

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-optimized interactions

---

## 🔐 Security

| Threat | Mitigation | Implementation |
|--------|-----------|----------------|
| **Code Injection** | Sandboxed execution | E2B isolated environments |
| **SQL Injection** | Parameterized queries | Prisma ORM |
| **XSS** | Content sanitization | React auto-escaping + DOMPurify |
| **CSRF** | Token validation | Clerk built-in protection |
| **Rate Limiting** | Request throttling | rate-limiter-flexible |
| **Auth Bypass** | Middleware checks | Clerk + Next.js middleware |
| **Data Leakage** | Row-level security | userId filtering in all queries |

---

## 🎬 Demo

Check out the live demo and example presentations:

📺 **[View Demo Files & Examples](https://drive.google.com/drive/folders/10P6aIct3U4KCdgj2skqxrAuo-mprMwEF?usp=drive_link)**

---

## 🚀 Possible Future Enhancements

### Collaboration & Sharing
- Real-time collaborative editing (WebSockets/Yjs)
- Share presentations with view-only links
- Team workspaces with role-based permissions
- Comment and review system for slides
- Version history and rollback functionality

### Export & Integration
- Export presentations to PDF format
- Export to PowerPoint (.pptx) format
- Embed presentations in external websites
- Integration with Google Slides/Keynote
- Markdown export for documentation

### Advanced AI Features
- Voice-to-slide generation (speech recognition)
- Image upload and AI-powered analysis
- Automatic speaker notes generation
- Smart content suggestions based on topic
- Multi-language presentation generation
- AI-powered design recommendations

### Templates & Customization
- Pre-built presentation templates library
- Custom theme builder with brand colors
- Drag-and-drop slide editor (WYSIWYG)
- Component library for slides (charts, diagrams, icons)
- Animation timeline editor
- Custom transition effects creator

### Analytics & Insights
- Presentation view analytics
- Time spent per slide tracking
- Audience engagement metrics
- A/B testing for different versions
- Export analytics reports

### Enterprise Features
- Single Sign-On (SSO) integration
- Custom domain support
- Advanced security controls
- Audit logs and compliance reporting
- White-label options
- API for programmatic access
- Webhook integrations

### Performance & Quality
- Progressive Web App (PWA) support
- Offline presentation mode
- Lazy loading for large presentations
- CDN integration for faster delivery
- Accessibility improvements (WCAG 2.1 AA)
- SEO optimization for public presentations

---

## 🙏 Acknowledgments

- [Impress.js](https://github.com/impress/impress.js) for presentation framework
- [Shadcn UI](https://ui.shadcn.com/) for component library
- [E2B](https://e2b.dev) for secure code execution
- [Clerk](https://clerk.com) for authentication
- [Code With Antonio](https://www.youtube.com/@codewithantonio) for inspiration and excellent tutorials

