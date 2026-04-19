export type LLMResponse = {
  text: string;
  renderType: 'none' | 'html' | 'react';
  componentName?: string;
  props?: Record<string, unknown>;
  code?: string;
  saveAsComponent?: {
    name: string;
    description: string;
    propsSchema: Record<string, string>;
  };
  saveAsArtifact?: boolean;
  sources?: Array<{
    documentName: string;
    chunk: string;
  }>;
}

export type ReActStep = {
  id: string;
  thought: string;
  action: string;
  actionInput: string;
  observation?: string;
  status: 'running' | 'completed' | 'error';
};

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
  component_props: string | null;
  code: string | null;
  thinking_steps: string | null;
  created_at: number;
}

export interface Document {
  id: string;
  user_id: string;
  name: string;
  type: string;
  size: number;
  content: string | null;
  chunk_count: number;
  status: 'processing' | 'indexed' | 'failed';
  error_message: string | null;
  created_at: number;
}

export interface Component {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  render_type: 'html' | 'react';
  code: string | null;
  props_schema: string | null;
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
  created_at: number;
}
