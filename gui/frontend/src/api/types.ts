export interface ExampleIdea {
  filename: string;
  title: string;
  domain: string;
  hypothesis: string;
}

export interface IdeaSummary {
  idea_id: string;
  title: string;
  domain: string;
  status: string;
  created_at: string;
}

export interface IdeaDetail {
  idea_id: string;
  title: string;
  domain: string;
  hypothesis: string;
  status: string;
  created_at: string;
  pipeline_state: PipelineState | null;
  metadata: Record<string, unknown> | null;
}

export interface StageStatus {
  status: string;
  started_at?: string;
  completed_at?: string;
  success?: boolean;
  outputs?: Record<string, unknown>;
}

export interface PipelineState {
  created_at?: string;
  stages: Record<string, StageStatus>;
  current_stage: string | null;
  completed: boolean;
}

export interface ArtifactInfo {
  path: string;
  name: string;
  is_dir: boolean;
  size: number | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export type ViewState = 'landing' | 'canvas';

export interface StageConfig {
  id: string;
  label: string;
  icon: string;
  optional: boolean;
}
