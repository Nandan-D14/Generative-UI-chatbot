export interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  R2: R2Bucket;
  CLERK_SECRET_KEY: string;
  LLM_API_KEY: string;
  LLM_BASE_URL: string;
  FRONTEND_URL: string;
  SEARCH_API_KEY: string;
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
