# VisualMind — Full Implementation Blueprint

> **AI Chatbot SaaS with Live UI Component Generation, Knowledge Base Grounding, and Component Registry**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Database Schema & Migrations](#database-schema--migrations)
6. [LLM Response Contract](#llm-response-contract)
7. [System Prompt](#system-prompt)
8. [Backend Implementation](#backend-implementation)
   - [RAG Chain](#rag-chain)
   - [Component Registry Logic](#component-registry-logic)
   - [Worker Routes](#worker-routes)
   - [Clerk Auth Middleware](#clerk-auth-middleware)
9. [Frontend Implementation](#frontend-implementation)
   - [Renderer Library](#renderer-library)
   - [Core Components](#core-components)
   - [Hooks](#hooks)
   - [Pages](#pages)
10. [Security Guidelines](#security-guidelines)
11. [Deployment Guide](#deployment-guide)
12. [Development Workflow](#development-workflow)

---

## Project Overview

**VisualMind** is a full-stack AI chatbot SaaS application where every AI response can render live, interactive UI components (charts, tables, forms, dashboards) directly inside the chat alongside text answers. Key differentiators:

- **Knowledge Base System**: Users upload documents; AI answers are grounded in that knowledge via RAG
- **Component Registry**: Previously generated UI components are stored and reused instead of regenerated on repeat queries
- **Sandboxed Live Rendering**: UI components render in isolated iframes with `sandbox="allow-scripts"`
- **Streaming Responses**: Text appears incrementally while visual components render on completion

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Cloudflare Workers over Vercel/Node | Edge execution, zero cold starts, native D1/Vectorize/R2 integration, lower cost at scale |
| iframe srcdoc rendering over component compilation | No server-side JSX compilation needed, complete isolation, supports both static HTML and interactive React |
| Component registry before code generation | Reduces LLM costs, ensures consistency, faster responses for common patterns |
| D1 for relational data, Vectorize for embeddings, R2 for files/code | Each storage layer optimized for its workload |
| Clerk for auth | Zero-auth-maintenance, webhook sync to D1, JWT verification at edge |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Auth | Clerk (React SDK) |
| Backend runtime | Cloudflare Workers (TypeScript) |
| LLM orchestration | LangChain.js |
| Vector store | Cloudflare Vectorize |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 |
| Streaming | Cloudflare Workers streaming fetch |
| Live UI rendering | Sandboxed iframe — HTML srcdoc for static, Babel+React CDN for interactive |
| Component registry | D1 table storing component metadata + R2 storing JSX/HTML code |
| Deployment | Cloudflare Pages (frontend) + Cloudflare Workers (backend) |

---

## Project Structure

```
visualmind/
├── frontend/                        # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── VisualPanel.tsx       # iframe renderer
│   │   │   │   ├── InputBar.tsx
│   │   │   │   └── ChatSidebar.tsx
│   │   │   ├── kb/
│   │   │   │   ├── UploadZone.tsx
│   │   │   │   ├── DocumentTable.tsx
│   │   │   │   └── ChunkPreview.tsx
│   │   │   ├── artifacts/
│   │   │   │   ├── ArtifactGrid.tsx
│   │   │   │   └── ArtifactCard.tsx
│   │   │   ├── registry/
│   │   │   │   └── ComponentRegistry.tsx
│   │   │   └── shared/
│   │   │       ├── Sidebar.tsx
│   │   │       ├── TopBar.tsx
│   │   │       └── StatusBadge.tsx
│   │   ├── pages/
│   │   │   ├── Chat.tsx
│   │   │   ├── KnowledgeBase.tsx
│   │   │   ├── Artifacts.tsx
│   │   │   ├── Registry.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   │   ├── useStream.ts            # handles streaming response
│   │   │   ├── useRegistry.ts          # fetch/save components
│   │   │   └── useKnowledgeBase.ts
│   │   ├── lib/
│   │   │   ├── renderer.ts             # iframe injection logic
│   │   │   └── api.ts                  # worker API calls
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
├── worker/                            # Cloudflare Worker (TypeScript)
│   ├── src/
│   │   ├── index.ts                   # main router
│   │   ├── routes/
│   │   │   ├── chat.ts                # streaming chat endpoint
│   │   │   ├── kb.ts                  # knowledge base CRUD
│   │   │   ├── artifacts.ts           # artifact CRUD
│   │   │   └── registry.ts            # component registry CRUD
│   │   ├── lib/
│   │   │   ├── rag.ts                 # LangChain RAG chain
│   │   │   ├── vectorize.ts           # Cloudflare Vectorize wrapper
│   │   │   ├── embeddings.ts          # embedding logic
│   │   │   ├── prompt.ts              # system prompt builder
│   │   │   └── registry.ts            # component lookup logic
│   │   ├── middleware/
│   │   │   └── clerk.ts               # Clerk JWT verification
│   │   └── types.ts
│   ├── migrations/
│   │   └── 001_initial.sql
│   └── wrangler.toml
│
└── shared/
    └── types.ts                       # shared response types
```

---

## Database Schema & Migrations

### Migration File: `worker/migrations/001_initial.sql`

```sql
-- Users synced from Clerk webhooks
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Individual messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id),
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  text TEXT NOT NULL,
  render_type TEXT CHECK(render_type IN ('none', 'html', 'react')),
  component_name TEXT,
  component_props TEXT,
  code TEXT,
  created_at INTEGER NOT NULL
);

-- Knowledge base documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK(status IN ('processing', 'indexed', 'failed')),
  created_at INTEGER NOT NULL
);

-- Component registry
CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  render_type TEXT NOT NULL CHECK(render_type IN ('html', 'react')),
  r2_key TEXT NOT NULL,
  props_schema TEXT,
  use_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Artifacts (saved visual outputs)
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  chat_id TEXT REFERENCES chats(id),
  message_id TEXT REFERENCES messages(id),
  title TEXT NOT NULL,
  render_type TEXT NOT NULL,
  code TEXT NOT NULL,
  thumbnail_r2_key TEXT,
  created_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_components_user ON components(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_user ON artifacts(user_id);
```

### Applying Migrations

```bash
wrangler d1 execute visualmind --file=worker/migrations/001_initial.sql
```

---

## LLM Response Contract

**File**: `shared/types.ts`

```typescript
export type LLMResponse = {
  text: string;                          // always present — the text answer
  renderType: 'none' | 'html' | 'react'; // none = text only
  componentName?: string;                // if found in registry, use this
  props?: Record<string, unknown>;       // data to inject into registry component
  code?: string;                         // if not in registry, full HTML or JSX string
  saveAsComponent?: {                    // instruct frontend to save this to registry
    name: string;
    description: string;
    propsSchema: Record<string, string>;
  };
  saveAsArtifact?: boolean;             // user can pin this to artifacts
  sources?: Array<{                     // RAG citations
    documentName: string;
    chunk: string;
  }>;
}

// Database entity types
export interface User {
  id: string;
  email: string;
  created_at: number;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  text: string;
  render_type: 'none' | 'html' | 'react' | null;
  component_name: string | null;
  component_props: string | null; // JSON string
  code: string | null;
  created_at: number;
}

export interface Document {
  id: string;
  user_id: string;
  name: string;
  type: string;
  size: number;
  r2_key: string;
  chunk_count: number;
  status: 'processing' | 'indexed' | 'failed';
  created_at: number;
}

export interface Component {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  render_type: 'html' | 'react';
  r2_key: string;
  props_schema: string | null; // JSON string
  use_count: number;
  created_at: number;
  updated_at: number;
}

export interface Artifact {
  id: string;
  user_id: string;
  chat_id: string | null;
  message_id: string | null;
  title: string;
  render_type: string;
  code: string;
  thumbnail_r2_key: string | null;
  created_at: number;
}
```

---

## System Prompt

**File**: `worker/src/lib/prompt.ts`

```typescript
export const SYSTEM_PROMPT = `
You are VisualMind, an AI assistant that answers questions using the provided knowledge base context and always responds in valid JSON.

RESPONSE FORMAT — always respond with this exact JSON structure, no markdown, no preamble:
{
  "text": "your explanation here",
  "renderType": "none" | "html" | "react",
  "componentName": "ExistingComponentName or null",
  "props": {},
  "code": "full HTML string or JSX App function string",
  "saveAsComponent": null or { "name": "...", "description": "...", "propsSchema": {} },
  "saveAsArtifact": false,
  "sources": []
}

RULES FOR renderType:
- "none" — text answer only, no visual needed
- "html" — static content: tables, metric cards, simple charts using Chart.js via CDN
- "react" — interactive content: forms, sliders, stateful dashboards, dynamic filters

RULES FOR code when renderType is "html":
- Complete self-contained HTML string
- Include <script src="https://cdn.tailwindcss.com"> in the head
- Include Chart.js from CDN if needed: https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js
- No external fonts or resources beyond these two CDNs

RULES FOR code when renderType is "react":
- Export a single function named App, no imports
- React and ReactDOM available as globals
- React.useState and React.useEffect available
- Tailwind classes only for styling
- Chart.js available as global Chart if needed
- Example: function App() { const [x, React.useState(0)] = ...; return <div className="p-4">...</div> }

RULES FOR componentName:
- If the available component registry contains a component that fits the query, set componentName to its name and fill props with the data
- Only generate new code if no registry component fits
- When generating new reusable code, set saveAsComponent with a name and description

Always ground answers in the provided context chunks. Cite sources in the sources array.
`;

export const REACT_INSTRUCTIONS = `
REACT REASONING LOOP:

You have access to tools. Use the following format for each step:

Thought: [your reasoning about what to do next]
Action: [tool name from: rag_search, web_search, registry_lookup, generate_component]
Action Input: [input to the tool]

Wait for the tool result (Observation), then continue:

Thought: [your reasoning based on the observation]
Action: [next tool or Final Answer]

When you have enough information, provide your Final Answer in the required JSON format:

Thought: I now have enough information to answer the question.
Final Answer: {the JSON response matching the SYSTEM_PROMPT schema}

TOOL USAGE STRATEGY:
1. First check the component registry — reuse existing components when possible
2. Search the knowledge base if the query relates to the user's documents
3. Search the web if the query needs current or external information
4. Generate a new component only if nothing in the registry fits
5. Limit tool calls to 3-5 maximum — be efficient

Be concise in your thoughts. Each tool call should have a clear purpose.
`;
```

---

## Backend Implementation

### ReAct Reasoning Agent

**File**: `worker/src/lib/agent.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { SYSTEM_PROMPT, REACT_INSTRUCTIONS } from './prompt';
import { RAGTool } from './tools/ragTool';
import { WebSearchTool } from './tools/webSearchTool';
import { RegistryLookupTool } from './tools/registryLookupTool';
import { ComponentGenTool } from './tools/componentGenTool';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ReActStep {
  thought: string;       // What the agent is thinking
  action: string;        // Which tool it chose
  actionInput: string;   // Input to the tool
  observation: string;   // Tool output
}

export interface AgentResult {
  steps: ReActStep[];        // Reasoning chain — send to frontend as thinking steps
  finalResponse: string;     // The complete LLMResponse JSON
}

export async function reactAgent(
  userMessage: string,
  chatHistory: ChatMessage[],
  userId: string,
  env: Env
): Promise<AgentResult> {

  // 1. Initialize tools
  const ragTool = new RAGTool(env.VECTORIZE, env.LLM_API_KEY, userId);
  const webSearchTool = new WebSearchTool(env.SEARCH_API_KEY);
  const registryTool = new RegistryLookupTool(env.DB, env.R2, userId);
  const componentGenTool = new ComponentGenTool(env.DB, env.R2, userId);

  const tools = [ragTool, webSearchTool, registryTool, componentGenTool];

  // 2. Initialize LLM (no streaming during ReAct — need full tool calls)
  const llm = new ChatOpenAI({
    openAIApiKey: env.LLM_API_KEY,
    configuration: { baseURL: env.LLM_BASE_URL },
    temperature: 0.3,
    modelName: 'gpt-4o'  // Use stronger model for reasoning
  });

  // 3. Build system message
  const systemMsg = new SystemMessage(
    SYSTEM_PROMPT + '\n\n' + REACT_INSTRUCTIONS + '\n\n' +
    `USER ID: ${userId}\n` +
    `AVAILABLE TOOLS: ${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`
  );

  // 4. Build conversation history
  const messages = [
    systemMsg,
    ...chatHistory.slice(-10).map(msg =>
      msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    ),
    new HumanMessage(userMessage)
  ];

  // 5. ReAct loop
  const steps: ReActStep[] = [];
  const maxIterations = 8;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    // Call LLM to decide next action
    const response = await llm.invoke(messages);
    const content = response.content as string;

    // Check if LLM gave final answer or tool call
    const toolCall = parseToolCall(content);

    if (!toolCall) {
      // Final answer — no more tool calls
      return {
        steps,
        finalResponse: content
      };
    }

    // 6. Execute tool
    const tool = tools.find(t => t.name === toolCall.name);
    if (!tool) {
      messages.push(new AIMessage(`Error: Tool "${toolCall.name}" not found.`));
      continue;
    }

    const observation = await tool.call(toolCall.input);

    // Record step for frontend
    steps.push({
      thought: extractThought(content),
      action: toolCall.name,
      actionInput: toolCall.input,
      observation: observation.slice(0, 500) // Truncate for frontend display
    });

    // Add tool call + result to conversation
    messages.push(new AIMessage(content));
    messages.push(new ToolMessage(observation, { tool_call_id: toolCall.id || '' }));
  }

  // Max iterations reached — force final answer
  messages.push(new HumanMessage('You have used many tools. Now provide your final response in the required JSON format.'));
  const finalResponse = await llm.invoke(messages);

  return {
    steps,
    finalResponse: finalResponse.content as string
  };
}

function parseToolCall(content: string): { name: string; input: string; id?: string } | null {
  const match = content.match(/Action:\s*(\w+)\s*Action Input:\s*(.*)/s);
  if (!match) return null;
  return {
    name: match[1].trim(),
    input: match[2].trim()
  };
}

function extractThought(content: string): string {
  const match = content.match(/Thought:\s*(.*?)(?=Action:|$)/s);
  return match ? match[1].trim().slice(0, 200) : 'Thinking...';
}
```

### Agent Tools

#### RAG Tool

**File**: `worker/src/lib/tools/ragTool.ts`

```typescript
export class RAGTool {
  name = 'rag_search';
  description = 'Search the user\'s knowledge base for relevant document chunks. Use this when the user asks about their documents, policies, or internal information.';

  constructor(
    private vectorize: VectorizeIndex,
    private apiKey: string,
    private userId: string
  ) {}

  async call(query: string): Promise<string> {
    const embedding = await this.generateEmbedding(query);
    const results = await this.vectorize.query(embedding, {
      topK: 5,
      filter: { userId: this.userId }
    });

    if (!results.matches.length) return 'No relevant documents found.';

    return results.matches.map((m, i) =>
      `[Doc: ${m.metadata.docName || 'unknown'}]\n${m.metadata.chunk}`
    ).join('\n\n---\n\n');
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: text, model: 'text-embedding-ada-002' })
    });
    const data = await response.json();
    return data.data[0].embedding;
  }
}
```

#### Web Search Tool

**File**: `worker/src/lib/tools/webSearchTool.ts`

```typescript
export class WebSearchTool {
  name = 'web_search';
  description = 'Search the web for current information. Use this when the user asks about current events, recent data, or information not in the knowledge base.';

  constructor(private apiKey: string) {}

  async call(query: string): Promise<string> {
    // Using Tavily, SerpAPI, or similar
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, max_results: 5 })
    });
    const data = await response.json();

    return data.results.map((r: any) =>
      `[${r.title}](${r.url})\n${r.content.slice(0, 300)}`
    ).join('\n\n---\n\n');
  }
}
```

#### Registry Lookup Tool

**File**: `worker/src/lib/tools/registryLookupTool.ts`

```typescript
export class RegistryLookupTool {
  name = 'registry_lookup';
  description = 'Search the component registry for existing UI components. Use this to find reusable components before generating new ones. Input should be a component type like "chart", "table", "dashboard".';

  constructor(
    private db: D1Database,
    private r2: R2Bucket,
    private userId: string
  ) {}

  async call(query: string): Promise<string> {
    const components = await this.db.prepare(
      'SELECT name, description, render_type, props_schema FROM components WHERE user_id = ? AND (name LIKE ? OR description LIKE ?) ORDER BY use_count DESC LIMIT 5'
    ).bind(this.userId, `%${query}%`, `%${query}%`).all();

    if (!components.results.length) {
      return 'No matching components found. You will need to generate new code.';
    }

    return components.results.map((c: any) =>
      `Component: ${c.name}\nType: ${c.render_type}\nDescription: ${c.description}\nProps Schema: ${c.props_schema}`
    ).join('\n\n---\n\n');
  }

  async getComponentCode(componentName: string): Promise<string | null> {
    const component = await this.db.prepare(
      'SELECT r2_key FROM components WHERE user_id = ? AND name = ?'
    ).bind(this.userId, componentName).first();

    if (!component) return null;
    const obj = await this.r2.get((component as any).r2_key);
    return obj?.text() ?? null;
  }
}
```

#### Component Generation Tool

**File**: `worker/src/lib/tools/componentGenTool.ts`

```typescript
export class ComponentGenTool {
  name = 'generate_component';
  description = 'Generate a new UI component when no existing component in the registry matches the need. Input should describe the component type, data, and interactivity.';

  constructor(
    private db: D1Database,
    private r2: R2Bucket,
    private userId: string
  ) {}

  async call(query: string): Promise<string> {
    // This tool validates the generated component code
    // The actual code generation happens in the LLM response
    // This tool just confirms and optionally stores the component
    return `Component generation requested for: "${query}". The LLM will generate HTML or React code based on the system prompt rules.`;
  }

  async saveComponent(name: string, code: string, renderType: string, propsSchema: object): Promise<string> {
    const id = crypto.randomUUID();
    const r2Key = `components/${this.userId}/${id}.txt`;
    await this.r2.put(r2Key, code);

    await this.db.prepare(
      'INSERT INTO components (id, user_id, name, description, render_type, r2_key, props_schema, use_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, this.userId, name, '', renderType, r2Key, JSON.stringify(propsSchema), 0, Date.now(), Date.now()).run();

    return id;
  }
}
```

### ReAct + Streaming Hybrid

**File**: `worker/src/lib/rag.ts`

For streaming, we use a two-phase approach:
1. Stream ReAct thinking steps as they happen
2. Stream the final response text

```typescript
import { reactAgent, ReActStep } from './agent';
import type { ChatMessage } from './agent';

export async function streamReActResponse(
  userMessage: string,
  chatHistory: ChatMessage[],
  userId: string,
  env: Env
): Promise<ReadableStream> {
  return new ReadableStream({
    async start(controller) {
      try {
        // Phase 1: Run ReAct agent (non-streaming)
        const result = await reactAgent(userMessage, chatHistory, userId, env);

        // Stream thinking steps
        for (const step of result.steps) {
          controller.enqueue(new TextEncoder().encode(
            JSON.stringify({ type: 'thought', step }) + '\n'
          ));
        }

        // Stream final response
        controller.enqueue(new TextEncoder().encode(
          JSON.stringify({ type: 'response', content: result.finalResponse }) + '\n'
        ));

        controller.close();
      } catch (error) {
        controller.enqueue(new TextEncoder().encode(
          JSON.stringify({ type: 'error', message: (error as Error).message }) + '\n'
        ));
        controller.close();
      }
    }
  });
}
```

### Component Registry Logic

**File**: `worker/src/lib/registry.ts`

```typescript
export async function getRegistryContext(userId: string, db: D1Database): Promise<string> {
  const components = await db.prepare(
    'SELECT name, description, props_schema FROM components WHERE user_id = ? ORDER BY use_count DESC LIMIT 20'
  ).bind(userId).all();

  if (!components.results.length) return 'No components in registry yet.';

  return components.results.map((c: any) =>
    `- ${c.name}: ${c.description} | props: ${c.props_schema}`
  ).join('\n');
}

export async function saveComponent(
  userId: string,
  name: string,
  description: string,
  renderType: string,
  code: string,
  propsSchema: object,
  db: D1Database,
  r2: R2Bucket
): Promise<void> {
  const id = crypto.randomUUID();
  const r2Key = `components/${userId}/${id}.txt`;
  await r2.put(r2Key, code);
  await db.prepare(
    'INSERT INTO components (id, user_id, name, description, render_type, r2_key, props_schema, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, name, description, renderType, r2Key, JSON.stringify(propsSchema), Date.now(), Date.now()).run();
}

export async function getComponentCode(
  db: D1Database,
  r2: R2Bucket,
  userId: string,
  componentName: string
): Promise<{ code: string | null; renderType: string | null }> {
  const component = await db.prepare(
    'SELECT r2_key, render_type FROM components WHERE user_id = ? AND name = ?'
  ).bind(userId, componentName).first();

  if (!component) return { code: null, renderType: null };

  const obj = await r2.get((component as any).r2_key);
  return { code: await obj?.text() ?? null, renderType: (component as any).render_type };
}

export async function incrementComponentUseCount(
  userId: string,
  componentName: string,
  db: D1Database
): Promise<void> {
  await db.prepare(
    'UPDATE components SET use_count = use_count + 1, updated_at = ? WHERE user_id = ? AND name = ?'
  ).bind(Date.now(), userId, componentName).run();
}

export async function deleteComponent(
  userId: string,
  componentName: string,
  db: D1Database,
  r2: R2Bucket
): Promise<boolean> {
  const component = await db.prepare(
    'SELECT r2_key FROM components WHERE user_id = ? AND name = ?'
  ).bind(userId, componentName).first();

  if (!component) return false;

  await r2.delete((component as any).r2_key);
  await db.prepare(
    'DELETE FROM components WHERE user_id = ? AND name = ?'
  ).bind(userId, componentName).run();

  return true;
}
```

### Clerk Auth Middleware

**File**: `worker/src/middleware/clerk.ts`

```typescript
import { verifyToken } from '@clerk/backend';
import type { Context, Next } from 'hono';

export async function clerkMiddleware(c: Context<{ Bindings: Env }, '*', {}>, next: Next) {
  // Skip auth for OPTIONS preflight
  if (c.req.method === 'OPTIONS') return next();

  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY
    });

    c.set('userId', payload.sub);
    c.set('userEmail', payload.email || '');
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
```

### Worker Routes

#### Main Router: `worker/src/index.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { clerkMiddleware } from './middleware/clerk';
import { chatRoutes } from './routes/chat';
import { kbRoutes } from './routes/kb';
import { artifactRoutes } from './routes/artifacts';
import { registryRoutes } from './routes/registry';

const app = new Hono<{ Bindings: Env }>();

// CORS for frontend
app.use('*', cors({
  origin: (env) => env.FRONTEND_URL,
  credentials: true
}));

// Clerk auth middleware on all API routes
app.use('/api/*', clerkMiddleware);

// Register route handlers
chatRoutes(app);
kbRoutes(app);
artifactRoutes(app);
registryRoutes(app);

export default app;
```

#### Chat Streaming: `worker/src/routes/chat.ts`

```typescript
import { Hono } from 'hono';
import { ragChain } from '../lib/rag';
import { getRegistryContext, saveComponent, incrementComponentUseCount, getComponentCode } from '../lib/registry';
import { getRetriever } from '../lib/vectorize';
import type { LLMResponse } from '../../../shared/types';

export function chatRoutes(app: Hono<{ Bindings: Env }>) {
  const router = new Hono<{ Bindings: Env }>();

  // POST /api/chat/stream — streaming chat endpoint
  router.post('/stream', async (c) => {
    const userId = c.get('userId') as string;
    const { chatId, message, history } = await c.req.json();

    // Stream ReAct response (thinking steps + final response)
    const stream = await streamReActResponse(message, history, userId, c.env);

    return c.newResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  });

  // POST /api/chat/save-component
  router.post('/save-component', async (c) => {
    const userId = c.get('userId') as string;
    const body = await c.req.json();

    await saveComponent(
      userId,
      body.name,
      body.description,
      body.renderType,
      body.code,
      body.propsSchema,
      c.env.DB,
      c.env.R2
    );

    return c.json({ success: true });
  });

  // POST /api/chat/new — create new chat session
  router.post('/new', async (c) => {
    const userId = c.get('userId') as string;
    const { title } = await c.req.json();

    const id = crypto.randomUUID();
    const now = Date.now();

    await c.env.DB.prepare(
      'INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, userId, title || 'New Chat', now, now).run();

    return c.json({ id });
  });

  // GET /api/chat/list — list user chats
  router.get('/list', async (c) => {
    const userId = c.get('userId') as string;
    const chats = await c.env.DB.prepare(
      'SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(userId).all();

    return c.json(chats.results);
  });

  // POST /api/chat/save-message
  router.post('/save-message', async (c) => {
    const userId = c.get('userId') as string;
    const body = await c.req.json();

    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO messages (id, chat_id, role, text, render_type, component_name, component_props, code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      body.chatId,
      body.role,
      body.text,
      body.renderType,
      body.componentName,
      body.componentProps ? JSON.stringify(body.componentProps) : null,
      body.code,
      Date.now()
    ).run();

    // Update chat timestamp
    await c.env.DB.prepare(
      'UPDATE chats SET updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(Date.now(), body.chatId, userId).run();

    return c.json({ id });
  });

  // GET /api/chat/:id/messages — get messages for a chat
  router.get('/:id/messages', async (c) => {
    const userId = c.get('userId') as string;
    const chatId = c.req.param('id');

    // Verify chat belongs to user
    const chat = await c.env.DB.prepare(
      'SELECT id FROM chats WHERE id = ? AND user_id = ?'
    ).bind(chatId, userId).first();

    if (!chat) return c.json({ error: 'Not found' }, 404);

    const messages = await c.env.DB.prepare(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC'
    ).bind(chatId).all();

    return c.json(messages.results);
  });

  app.route('/api/chat', router);
}
```

#### Knowledge Base Routes: `worker/src/routes/kb.ts`

```typescript
import { Hono } from 'hono';

export function kbRoutes(app: Hono<{ Bindings: Env }>) {
  const router = new Hono<{ Bindings: Env }>();

  // POST /api/kb/upload — upload document
  router.post('/upload', async (c) => {
    const userId = c.get('userId') as string;
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) return c.json({ error: 'No file provided' }, 400);

    const id = crypto.randomUUID();
    const r2Key = `documents/${userId}/${id}`;

    // Upload to R2
    await c.env.R2.put(r2Key, file);

    // Save document metadata to D1
    await c.env.DB.prepare(
      'INSERT INTO documents (id, user_id, name, type, size, r2_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, file.name, file.type, file.size, r2Key, Date.now()).run();

    // Process document: chunk, embed, upsert to Vectorize
    try {
      await processDocument(id, r2Key, userId, c.env);
    } catch (err) {
      await c.env.DB.prepare(
        'UPDATE documents SET status = ? WHERE id = ?'
      ).bind('failed', id).run();
      return c.json({ error: 'Processing failed', id, status: 'failed' }, 500);
    }

    return c.json({ id, status: 'indexed' });
  });

  // GET /api/kb/documents — list user documents
  router.get('/documents', async (c) => {
    const userId = c.get('userId') as string;
    const docs = await c.env.DB.prepare(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    return c.json(docs.results);
  });

  // DELETE /api/kb/documents/:id — delete document
  router.delete('/documents/:id', async (c) => {
    const userId = c.get('userId') as string;
    const docId = c.req.param('id');

    // Get document
    const doc = await c.env.DB.prepare(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?'
    ).bind(docId, userId).first();

    if (!doc) return c.json({ error: 'Not found' }, 404);

    // Delete from R2
    await c.env.R2.delete((doc as any).r2_key);

    // Delete from D1
    await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(docId).run();

    // Note: Vectorize doesn't support delete by metadata yet
    // In production, track vector IDs and delete individually if supported

    return c.json({ success: true });
  });

  app.route('/api/kb', router);
}

async function processDocument(docId: string, r2Key: string, userId: string, env: Env) {
  // 1. Fetch file from R2
  const file = await env.R2.get(r2Key);
  const content = await file?.text();
  if (!content) throw new Error('File content empty');

  // 2. Chunk content (512 tokens, 50 overlap)
  const chunks = chunkText(content, 512, 50);

  // 3. Generate embeddings and upsert to Vectorize
  const embeddings = await generateEmbeddings(chunks, env);
  const vectors = embeddings.map((vec, i) => ({
    id: `${docId}-${i}`,
    values: vec,
    metadata: { userId, docId, chunk: chunks[i] }
  }));

  await env.VECTORIZE.upsert(vectors);

  // 4. Update document status
  await env.DB.prepare(
    'UPDATE documents SET status = ?, chunk_count = ? WHERE id = ?'
  ).bind('indexed', chunks.length, docId).run();
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  // Simple character-based chunking
  // In production, use token-based chunking (tiktoken)
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize * 4)); // ~4 chars per token
    start += (chunkSize - overlap) * 4;
  }
  return chunks;
}

async function generateEmbeddings(chunks: string[], env: Env): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.LLM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: chunks,
      model: 'text-embedding-ada-002'
    })
  });
  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}
```

#### Artifact Routes: `worker/src/routes/artifacts.ts`

```typescript
import { Hono } from 'hono';

export function artifactRoutes(app: Hono<{ Bindings: Env }>) {
  const router = new Hono<{ Bindings: Env }>();

  // POST /api/artifacts — save artifact
  router.post('/', async (c) => {
    const userId = c.get('userId') as string;
    const { chatId, messageId, title, renderType, code } = await c.req.json();

    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO artifacts (id, user_id, chat_id, message_id, title, render_type, code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, chatId || null, messageId || null, title, renderType, code, Date.now()).run();

    return c.json({ id, success: true });
  });

  // GET /api/artifacts — list user artifacts
  router.get('/', async (c) => {
    const userId = c.get('userId') as string;
    const artifacts = await c.env.DB.prepare(
      'SELECT * FROM artifacts WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    return c.json(artifacts.results);
  });

  // GET /api/artifacts/:id — get single artifact
  router.get('/:id', async (c) => {
    const userId = c.get('userId') as string;
    const id = c.req.param('id');

    const artifact = await c.env.DB.prepare(
      'SELECT * FROM artifacts WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!artifact) return c.json({ error: 'Not found' }, 404);
    return c.json(artifact);
  });

  // DELETE /api/artifacts/:id
  router.delete('/:id', async (c) => {
    const userId = c.get('userId') as string;
    const id = c.req.param('id');

    await c.env.DB.prepare(
      'DELETE FROM artifacts WHERE id = ? AND user_id = ?'
    ).bind(id, userId).run();

    return c.json({ success: true });
  });

  app.route('/api/artifacts', router);
}
```

#### Registry Routes: `worker/src/routes/registry.ts`

```typescript
import { Hono } from 'hono';
import { getRegistryContext, deleteComponent } from '../lib/registry';

export function registryRoutes(app: Hono<{ Bindings: Env }>) {
  const router = new Hono<{ Bindings: Env }>();

  // GET /api/registry — list user components
  router.get('/', async (c) => {
    const userId = c.get('userId') as string;
    const components = await c.env.DB.prepare(
      'SELECT id, name, description, render_type, props_schema, use_count, created_at, updated_at FROM components WHERE user_id = ? ORDER BY use_count DESC'
    ).bind(userId).all();

    return c.json(components.results);
  });

  // GET /api/registry/:name/code — get component code
  router.get('/:name/code', async (c) => {
    const userId = c.get('userId') as string;
    const name = c.req.param('name');

    const component = await c.env.DB.prepare(
      'SELECT r2_key, render_type FROM components WHERE user_id = ? AND name = ?'
    ).bind(userId, name).first();

    if (!component) return c.json({ error: 'Not found' }, 404);

    const obj = await c.env.R2.get((component as any).r2_key);
    const code = await obj?.text();

    return c.json({ code, renderType: (component as any).render_type });
  });

  // DELETE /api/registry/:name
  router.delete('/:name', async (c) => {
    const userId = c.get('userId') as string;
    const name = c.req.param('name');

    const deleted = await deleteComponent(userId, name, c.env.DB, c.env.R2);

    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  });

  // POST /api/registry/context — get registry context for RAG
  router.post('/context', async (c) => {
    const userId = c.get('userId') as string;
    const context = await getRegistryContext(userId, c.env.DB);
    return c.json({ context });
  });

  app.route('/api/registry', router);
}
```

---

## Frontend Implementation

### Renderer Library

**File**: `frontend/src/lib/renderer.ts`

```typescript
export function buildIframeHTML(code: string, renderType: 'html' | 'react'): string {
  if (renderType === 'html') {
    return code; // already complete HTML
  }

  // React mode — wrap JSX in full page with Babel transpiler
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"><\/script>
  <style>body{margin:0;padding:16px;background:transparent;}</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${code}
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  <\/script>
</body>
</html>`;
}

export function renderToIframe(iframe: HTMLIFrameElement, code: string, renderType: 'html' | 'react') {
  iframe.srcdoc = buildIframeHTML(code, renderType);
}
```

### Core Components

#### VisualPanel

**File**: `frontend/src/components/chat/VisualPanel.tsx`

```tsx
import { useEffect, useRef, useState } from 'react';
import { renderToIframe } from '../../lib/renderer';

type Props = {
  code: string;
  renderType: 'html' | 'react';
  componentName?: string;
  onSaveArtifact?: () => void;
};

export function VisualPanel({ code, renderType, componentName, onSaveArtifact }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (iframeRef.current) {
      renderToIframe(iframeRef.current, code, renderType);
    }
  }, [code, renderType]);

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 bg-neutral-50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">
            {componentName || (renderType === 'react' ? 'Interactive' : 'Visual')}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSaveArtifact}
            className="text-xs text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded hover:bg-neutral-100 transition-colors"
          >
            Save artifact
          </button>
        </div>
      </div>
      {isExpanded && (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          className="w-full border-0"
          style={{ minHeight: '300px', height: 'auto' }}
          onLoad={(e) => {
            const el = e.currentTarget;
            try {
              el.style.height = el.contentDocument?.body.scrollHeight + 'px';
            } catch {}
          }}
        />
      )}
    </div>
  );
}
```

#### MessageBubble

**File**: `frontend/src/components/chat/MessageBubble.tsx`

```tsx
import { VisualPanel } from './VisualPanel';
import { ThinkingSteps } from './ThinkingSteps';
import type { LLMResponse } from '../../../../shared/types';

type ReActStep = {
  thought: string;
  action: string;
  actionInput: string;
  observation: string;
};

type Props = {
  role: 'user' | 'assistant';
  text: string;
  visualData?: LLMResponse;
  thinkingSteps?: ReActStep[];
  onSaveArtifact?: () => void;
  timestamp: Date;
};

export function MessageBubble({ role, text, visualData, thinkingSteps, onSaveArtifact, timestamp }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-3xl ${isUser ? 'bg-blue-600 text-white' : 'bg-white text-neutral-900'} rounded-2xl px-5 py-3 shadow-sm`}>
        {/* ReAct Thinking Steps */}
        {!isUser && thinkingSteps && thinkingSteps.length > 0 && (
          <ThinkingSteps steps={thinkingSteps} />
        )}

        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>

        {visualData && visualData.renderType !== 'none' && visualData.code && (
          <VisualPanel
            code={visualData.code}
            renderType={visualData.renderType}
            componentName={visualData.componentName}
            onSaveArtifact={onSaveArtifact}
          />
        )}

        <div className={`mt-2 text-xs ${isUser ? 'text-blue-200' : 'text-neutral-400'}`}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
```

#### ChatWindow

**File**: `frontend/src/components/chat/ChatWindow.tsx`

```tsx
import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import type { LLMResponse } from '../../../../shared/types';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  visualData?: LLMResponse;
  thinkingSteps?: ReActStep[];
  timestamp: Date;
};

type Props = {
  messages: Message[];
  onSaveArtifact?: (messageId: string) => void;
};

export function ChatWindow({ messages, onSaveArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-6 bg-neutral-50"
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          role={msg.role}
          text={msg.text}
          visualData={msg.visualData}
          thinkingSteps={msg.thinkingSteps}
          onSaveArtifact={() => onSaveArtifact?.(msg.id)}
          timestamp={msg.timestamp}
        />
      ))}
    </div>
  );
}
```

#### InputBar

**File**: `frontend/src/components/chat/InputBar.tsx`

```tsx
import { useState, KeyboardEvent } from 'react';

type Props = {
  onSend: (message: string) => void;
  isLoading: boolean;
};

export function InputBar({ onSend, isLoading }: Props) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-neutral-200 bg-white p-4">
      <div className="flex gap-3 max-w-4xl mx-auto">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          className="flex-1 resize-none border border-neutral-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={1}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

#### ChatSidebar

**File**: `frontend/src/components/chat/ChatSidebar.tsx`

```tsx
type Chat = {
  id: string;
  title: string;
  updatedAt: Date;
};

type Props = {
  chats: Chat[];
  activeChat: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
};

export function ChatSidebar({ chats, activeChat, onSelectChat, onNewChat }: Props) {
  return (
    <div className="w-64 border-r border-neutral-200 bg-white flex flex-col">
      <div className="p-4 border-b border-neutral-100">
        <button
          onClick={onNewChat}
          className="w-full py-2 px-4 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full text-left px-4 py-3 hover:bg-neutral-100 transition-colors ${
              activeChat === chat.id ? 'bg-neutral-100' : ''
            }`}
          >
            <p className="truncate text-sm font-medium">{chat.title}</p>
            <p className="text-xs text-neutral-400 mt-1">
              {chat.updatedAt.toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

#### UploadZone

**File**: `frontend/src/components/kb/UploadZone.tsx`

```tsx
import { useCallback, useState } from 'react';

type Props = {
  onUpload: (file: File) => void;
  isUploading: boolean;
};

export function UploadZone({ onUpload, isUploading }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }, [onUpload]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-neutral-300 hover:border-neutral-400'
      } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
        accept=".pdf,.txt,.md,.doc,.docx"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <p className="text-lg font-medium text-neutral-700">
          {isUploading ? 'Processing...' : 'Drag & drop or click to upload'}
        </p>
        <p className="text-sm text-neutral-400 mt-1">PDF, TXT, MD, DOC</p>
      </label>
    </div>
  );
}
```

#### DocumentTable

**File**: `frontend/src/components/kb/DocumentTable.tsx`

```tsx
type Document = {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'processing' | 'indexed' | 'failed';
  chunk_count: number;
  created_at: number;
};

type Props = {
  documents: Document[];
  isLoading: boolean;
  onDelete: (id: string) => void;
};

export function DocumentTable({ documents, isLoading, onDelete }: Props) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'indexed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-neutral-600';
    }
  };

  return (
    <div className="mt-6">
      {isLoading ? (
        <p className="text-center text-neutral-400 py-8">Loading...</p>
      ) : documents.length === 0 ? (
        <p className="text-center text-neutral-400 py-8">No documents uploaded yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200">
            <tr>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Size</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Chunks</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Uploaded</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="py-3 px-4 font-medium">{doc.name}</td>
                <td className="py-3 px-4 text-neutral-500">{formatSize(doc.size)}</td>
                <td className="py-3 px-4 text-neutral-500">{doc.chunk_count}</td>
                <td className={`py-3 px-4 capitalize ${statusColor(doc.status)}`}>{doc.status}</td>
                <td className="py-3 px-4 text-neutral-500">
                  {new Date(doc.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

#### ChunkPreview

**File**: `frontend/src/components/kb/ChunkPreview.tsx`

```tsx
type Props = {
  chunks: string[];
};

export function ChunkPreview({ chunks }: Props) {
  return (
    <div className="mt-4 max-h-64 overflow-y-auto">
      {chunks.map((chunk, i) => (
        <div key={i} className="mb-2 p-3 bg-neutral-50 rounded-lg text-xs text-neutral-600">
          <span className="font-medium text-neutral-400">Chunk {i + 1}</span>
          <p className="mt-1">{chunk.slice(0, 200)}...</p>
        </div>
      ))}
    </div>
  );
}
```

#### ArtifactGrid

**File**: `frontend/src/components/artifacts/ArtifactGrid.tsx`

```tsx
import { ArtifactCard } from './ArtifactCard';

type Artifact = {
  id: string;
  title: string;
  render_type: string;
  code: string;
  created_at: number;
};

type Props = {
  artifacts: Artifact[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onRerender: (artifact: Artifact) => void;
};

export function ArtifactGrid({ artifacts, isLoading, onDelete, onRerender }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {artifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          onDelete={() => onDelete(artifact.id)}
          onRerender={() => onRerender(artifact)}
        />
      ))}
      {artifacts.length === 0 && !isLoading && (
        <div className="col-span-full text-center text-neutral-400 py-12">
          No artifacts saved yet. Chat with VisualMind to generate visual responses.
        </div>
      )}
    </div>
  );
}
```

#### ArtifactCard

**File**: `frontend/src/components/artifacts/ArtifactCard.tsx`

```tsx
import { VisualPanel } from '../chat/VisualPanel';

type Artifact = {
  id: string;
  title: string;
  render_type: string;
  code: string;
  created_at: number;
};

type Props = {
  artifact: Artifact;
  onDelete: () => void;
  onRerender: () => void;
};

export function ArtifactCard({ artifact, onDelete, onRerender }: Props) {
  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <h3 className="font-medium text-sm truncate">{artifact.title}</h3>
        <div className="flex gap-2">
          <button onClick={onRerender} className="text-xs text-blue-600 hover:text-blue-800">
            Re-render
          </button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
            Delete
          </button>
        </div>
      </div>
      <VisualPanel
        code={artifact.code}
        renderType={artifact.render_type as 'html' | 'react'}
      />
    </div>
  );
}
```

#### ComponentRegistry

**File**: `frontend/src/components/registry/ComponentRegistry.tsx`

```tsx
type Component = {
  id: string;
  name: string;
  description: string;
  render_type: 'html' | 'react';
  use_count: number;
  created_at: number;
};

type Props = {
  components: Component[];
  isLoading: boolean;
  onDelete: (name: string) => void;
  onTest: (component: Component) => void;
};

export function ComponentRegistry({ components, isLoading, onDelete, onTest }: Props) {
  return (
    <div>
      {isLoading ? (
        <p className="text-center text-neutral-400 py-8">Loading...</p>
      ) : components.length === 0 ? (
        <p className="text-center text-neutral-400 py-8">
          No components in registry yet. Components are saved when VisualMind generates new UI patterns.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200">
            <tr>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Description</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Type</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Uses</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {components.map((comp) => (
              <tr key={comp.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="py-3 px-4 font-medium">{comp.name}</td>
                <td className="py-3 px-4 text-neutral-500 truncate max-w-xs">{comp.description}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    comp.render_type === 'react' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {comp.render_type}
                  </span>
                </td>
                <td className="py-3 px-4 text-neutral-500">{comp.use_count}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => onTest(comp)} className="text-xs text-blue-600 hover:text-blue-800">
                      Test
                    </button>
                    <button onClick={() => onDelete(comp.name)} className="text-xs text-red-500 hover:text-red-700">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

#### Shared Components

#### ThinkingSteps

**File**: `frontend/src/components/chat/ThinkingSteps.tsx`

```tsx
import { useState } from 'react';

type ReActStep = {
  thought: string;
  action: string;
  actionInput: string;
  observation: string;
};

type Props = {
  steps: ReActStep[];
};

const actionIcons: Record<string, string> = {
  rag_search: '📚',
  web_search: '🌐',
  registry_lookup: '🧩',
  generate_component: '🎨',
};

export function ThinkingSteps({ steps }: Props) {
  if (!steps.length) return null;

  return (
    <div className="mb-4 border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50">
      <div className="px-4 py-2 border-b border-neutral-100 bg-white">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Thinking · {steps.length} step{steps.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {steps.map((step, i) => (
          <StepItem key={i} step={step} index={i} />
        ))}
      </div>
    </div>
  );
}

function StepItem({ step, index }: { step: ReActStep; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="px-4 py-2 hover:bg-neutral-100 cursor-pointer transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs text-neutral-300 mt-0.5 w-4">{index + 1}</span>
        <span className="text-sm">{actionIcons[step.action] || '🔧'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-700 truncate">{step.thought}</p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {step.action.replace('_', ' ')}
          </p>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 ml-6 p-2 bg-white rounded border border-neutral-200 text-xs text-neutral-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
          {step.observation}
        </div>
      )}
    </div>
  );
}
```

**Sidebar**

**File**: `frontend/src/components/shared/Sidebar.tsx`

```tsx
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/chat', label: 'Chat' },
  { path: '/kb', label: 'Knowledge Base' },
  { path: '/artifacts', label: 'Artifacts' },
  { path: '/registry', label: 'Registry' },
  { path: '/settings', label: 'Settings' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-56 bg-neutral-900 text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-neutral-800">
        <h1 className="text-lg font-bold">VisualMind</h1>
      </div>
      <nav className="flex-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${
              location.pathname === item.path
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
```

**TopBar**

**File**: `frontend/src/components/shared/TopBar.tsx`

```tsx
import { UserButton } from '@clerk/clerk-react';

export function TopBar() {
  return (
    <div className="h-14 border-b border-neutral-200 bg-white px-6 flex items-center justify-between">
      <div></div>
      <UserButton afterSignOutUrl="/sign-in" />
    </div>
  );
}
```

**StatusBadge**

**File**: `frontend/src/components/shared/StatusBadge.tsx`

```tsx
type Props = {
  status: 'idle' | 'streaming' | 'indexed' | 'error';
  label?: string;
};

export function StatusBadge({ status, label }: Props) {
  const colors = {
    idle: 'bg-neutral-200 text-neutral-600',
    streaming: 'bg-blue-100 text-blue-700 animate-pulse',
    indexed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {label || status}
    </span>
  );
}
```

### Hooks

#### useStream

**File**: `frontend/src/hooks/useStream.ts`

```typescript
import { useState, useCallback } from 'react';
import type { LLMResponse } from '../../../shared/types';

export type ReActStep = {
  thought: string;
  action: string;
  actionInput: string;
  observation: string;
};

export function useStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [thinkingSteps, setThinkingSteps] = useState<ReActStep[]>([]);
  const [completeResponse, setCompleteResponse] = useState<LLMResponse | null>(null);

  const startStream = useCallback(async (
    message: string,
    chatId: string,
    history: Array<{ role: string; content: string }>,
    token: string
  ) => {
    setIsStreaming(true);
    setCurrentText('');
    setThinkingSteps([]);
    setCompleteResponse(null);

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ chatId, message, history })
    });

    if (!response.ok || !response.body) {
      setIsStreaming(false);
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);

          if (parsed.type === 'thought') {
            // ReAct thinking step — update UI
            setThinkingSteps(prev => [...prev, parsed.step]);
          }

          if (parsed.type === 'response') {
            // Final response — parse as LLMResponse
            try {
              const llmResponse: LLMResponse = JSON.parse(parsed.content);
              setCurrentText(llmResponse.text);
              setCompleteResponse(llmResponse);
            } catch {
              // Fallback: extract text from JSON
              const textMatch = parsed.content.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
              const text = textMatch ? textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
              setCurrentText(text);
              setCompleteResponse({ text, renderType: 'none' });
            }
          }

          if (parsed.type === 'error') {
            setCurrentText(`Error: ${parsed.message}`);
            setCompleteResponse({ text: `Error: ${parsed.message}`, renderType: 'none' });
          }
        } catch {
          // Line not valid JSON yet — skip
        }
      }
    }

    setIsStreaming(false);
    return completeResponse;
  }, [completeResponse]);

  const reset = useCallback(() => {
    setIsStreaming(false);
    setCurrentText('');
    setThinkingSteps([]);
    setCompleteResponse(null);
  }, []);

  return { isStreaming, currentText, thinkingSteps, completeResponse, startStream, reset };
}
```

#### useRegistry

**File**: `frontend/src/hooks/useRegistry.ts`

```typescript
import { useState, useCallback } from 'react';

export function useRegistry() {
  const [components, setComponents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchComponents = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/registry', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComponents(data);
      }
    } catch (err) {
      console.error('Failed to fetch components:', err);
    }
    setIsLoading(false);
  }, []);

  const saveComponent = useCallback(async (data: any, token: string) => {
    await fetch('/api/chat/save-component', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  }, []);

  const deleteComponent = useCallback(async (name: string, token: string) => {
    await fetch(`/api/registry/${name}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }, []);

  return { components, isLoading, fetchComponents, saveComponent, deleteComponent };
}
```

#### useKnowledgeBase

**File**: `frontend/src/hooks/useKnowledgeBase.ts`

```typescript
import { useState, useCallback } from 'react';

export function useKnowledgeBase() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocuments = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/kb/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
    setIsLoading(false);
  }, []);

  const uploadDocument = useCallback(async (file: File, token: string) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch('/api/kb/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setIsUploading(false);
  }, []);

  const deleteDocument = useCallback(async (id: string, token: string) => {
    await fetch(`/api/kb/documents/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }, []);

  return { documents, isUploading, isLoading, fetchDocuments, uploadDocument, deleteDocument };
}
```

### Pages

#### Chat Page

**File**: `frontend/src/pages/Chat.tsx`

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ChatWindow } from '../components/chat/ChatWindow';
import { InputBar } from '../components/chat/InputBar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { useStream } from '../hooks/useStream';

export function ChatPage() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const { isStreaming, currentText, thinkingSteps, completeResponse, startStream, reset } = useStream();

  const handleSend = async (message: string) => {
    const token = await getToken();
    if (!token) return;

    // Add user message
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      text: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Start streaming
    const response = await startStream(message, activeChat || '', []);

    // Add assistant message with thinking steps
    if (response) {
      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        text: response.text,
        visualData: response,
        thinkingSteps: [...thinkingSteps], // Capture final thinking steps
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
    }
  };

  const handleNewChat = () => {
    setActiveChat(null);
    setMessages([]);
    reset();
  };

  return (
    <div className="flex h-screen">
      <ChatSidebar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col">
        <ChatWindow messages={messages} />
        <InputBar onSend={handleSend} isLoading={isStreaming} />
      </div>
    </div>
  );
}
```

#### KnowledgeBase Page

**File**: `frontend/src/pages/KnowledgeBase.tsx`

```tsx
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { UploadZone } from '../components/kb/UploadZone';
import { DocumentTable } from '../components/kb/DocumentTable';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';

export function KnowledgeBasePage() {
  const { getToken } = useAuth();
  const { documents, isUploading, isLoading, fetchDocuments, uploadDocument, deleteDocument } = useKnowledgeBase();

  useEffect(() => {
    getToken().then(token => token && fetchDocuments(token));
  }, []);

  const handleUpload = async (file: File) => {
    const token = await getToken();
    if (token) uploadDocument(file, token);
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    if (token) deleteDocument(id, token);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Knowledge Base</h1>
      <UploadZone onUpload={handleUpload} isUploading={isUploading} />
      <DocumentTable documents={documents} isLoading={isLoading} onDelete={handleDelete} />
    </div>
  );
}
```

#### Artifacts Page

**File**: `frontend/src/pages/Artifacts.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ArtifactGrid } from '../components/artifacts/ArtifactGrid';

export function ArtifactsPage() {
  const { getToken } = useAuth();
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadArtifacts();
  }, []);

  const loadArtifacts = async () => {
    const token = await getToken();
    if (!token) return;
    setIsLoading(true);
    const res = await fetch('/api/artifacts', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setArtifacts(await res.json());
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    await fetch(`/api/artifacts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    loadArtifacts();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Artifacts</h1>
      <ArtifactGrid artifacts={artifacts} isLoading={isLoading} onDelete={handleDelete} onRerender={() => {}} />
    </div>
  );
}
```

#### Registry Page

**File**: `frontend/src/pages/Registry.tsx`

```tsx
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ComponentRegistry } from '../components/registry/ComponentRegistry';
import { useRegistry } from '../hooks/useRegistry';

export function RegistryPage() {
  const { getToken } = useAuth();
  const { components, isLoading, fetchComponents, deleteComponent } = useRegistry();

  useEffect(() => {
    getToken().then(token => token && fetchComponents(token));
  }, []);

  const handleDelete = async (name: string) => {
    const token = await getToken();
    if (token) deleteComponent(name, token);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Component Registry</h1>
      <ComponentRegistry
        components={components}
        isLoading={isLoading}
        onDelete={handleDelete}
        onTest={() => {}}
      />
    </div>
  );
}
```

#### Settings Page

**File**: `frontend/src/pages/Settings.tsx`

```tsx
import { useState } from 'react';

export function SettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [topK, setTopK] = useState(5);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Retrieval Top-K
          </label>
          <input
            type="number"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="w-24 border border-neutral-300 rounded-lg px-3 py-2"
            min={1}
            max={20}
          />
          <p className="text-xs text-neutral-400 mt-1">Number of document chunks to retrieve per query</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full h-64 border border-neutral-300 rounded-lg px-3 py-2 font-mono text-sm"
            placeholder="Customize the system prompt..."
          />
          <p className="text-xs text-neutral-400 mt-1">
            Override the default system prompt. Use {`{context}`} and {`{registry}`} as placeholders.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Security Guidelines

| Rule | Implementation |
|---|---|
| **iframe sandbox** | Always `sandbox="allow-scripts"`, never `allow-same-origin` |
| **Clerk JWT validation** | Verify on every worker request with `@clerk/backend` |
| **User scoping** | All D1 queries scoped to authenticated user ID — no cross-user data leakage |
| **R2 key namespacing** | All keys prefixed with userId: `documents/{userId}/{docId}` |
| **Component code validation** | Validate before saving to registry, sanitize if needed |
| **Rate limiting** | Use Cloudflare Workers AI Gateway or implement token bucket |
| **CORS** | Strict origin matching, no wildcards |

---

## Deployment Guide

### 1. Set up Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create visualmind

# Create Vectorize index
wrangler vectorize create visualmind-kb --dimensions=1536 --metric=cosine

# Create R2 bucket
wrangler r2 bucket create visualmind-storage
```

### 2. Configure wrangler.toml

**File**: `worker/wrangler.toml`

```toml
name = "visualmind-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "visualmind"
database_id = "YOUR_D1_ID"

[[vectorize]]
binding = "VECTORIZE"
index_name = "visualmind-kb"

[[r2_buckets]]
binding = "R2"
bucket_name = "visualmind-storage"

[vars]
CLERK_SECRET_KEY = ""
LLM_API_KEY = ""
LLM_BASE_URL = "https://api.openai.com/v1"
FRONTEND_URL = "https://visualmind.pages.dev"
```

### 3. Deploy

```bash
# Apply migrations
wrangler d1 execute visualmind --file=worker/migrations/001_initial.sql

# Deploy worker
wrangler deploy

# Deploy frontend
cd frontend
npm run build
wrangler pages deploy dist --project-name=visualmind
```

---

## Development Workflow

```bash
# Start worker in dev mode
cd worker
wrangler dev

# Start frontend in dev mode (separate terminal)
cd frontend
npm run dev
```

Both hot-reload on changes. Use `wrangler tail` to inspect worker logs.

---

## Build Order (Recommended)

1. Set up Clerk project + Cloudflare resources (D1, Vectorize, R2)
2. Run database migrations
3. Implement shared types
4. Implement worker: middleware → lib → routes
5. Implement frontend: lib → hooks → shared components → page components
6. Test locally
7. Deploy

---

> Built with Cloudflare Edge, LangChain RAG, and Sandboxed Live UI Rendering
