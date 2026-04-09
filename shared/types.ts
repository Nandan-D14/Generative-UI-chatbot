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
  thumbnail_r2_key: string | null;
  created_at: number;
}
