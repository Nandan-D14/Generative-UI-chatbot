export interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  CLERK_SECRET_KEY: string;
  LLM_API_KEY: string;
  LLM_BASE_URL: string;
  LLM_MODEL: string;
  FRONTEND_URL: string;
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
