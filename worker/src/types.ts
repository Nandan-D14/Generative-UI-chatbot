export interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  R2: R2Bucket;
  CLERK_SECRET_KEY: string;
  CLERK_WEBHOOK_SECRET?: string;
  LLM_API_KEY: string;
  LLM_BASE_URL: string;
  LLM_CHAT_MODEL: string;
  LLM_EMBED_MODEL: string;
  LLM_EMBED_DIMENSIONS: number;
  FRONTEND_URL: string;
  SEARCH_API_KEY?: string;
}

export interface AppVariables {
  userId: string;
  userEmail: string;
}

export interface AppEnv {
  Bindings: Env;
  Variables: AppVariables;
}

export interface ReActStep {
  thought: string;
  action: string;
  actionInput: string;
  observation: string;
}

export interface AgentResult {
  steps: ReActStep[];
  finalResponse: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}
