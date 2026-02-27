import type { StageConfig } from '../api/types';

export const STAGES: StageConfig[] = [
  { id: 'idea',              label: 'Research Idea',       icon: '💡', optional: false },
  { id: 'resource_finder',   label: 'Resource Finder',     icon: '🔍', optional: false },
  { id: 'human_review',      label: 'Human Review',        icon: '👤', optional: true },
  { id: 'experiment_runner',  label: 'Experiment Runner',   icon: '🧪', optional: false },
  { id: 'paper_writer',      label: 'Paper Writer',        icon: '📝', optional: true },
  { id: 'paper_revision',    label: 'Paper Revision',      icon: '🔎', optional: true },
  { id: 'quality_evaluation', label: 'Quality Evaluation',  icon: '📊', optional: false },
];

export const DEFAULT_STAGES = STAGES.filter(s => !s.optional);

export function getStatusColor(status: string): string {
  switch (status) {
    case 'in_progress': return '#F5A623';
    case 'completed':   return '#7ED321';
    case 'failed':      return '#D0021B';
    default:            return '#9B9B9B';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'in_progress': return 'Running';
    case 'completed':   return 'Done';
    case 'failed':      return 'Failed';
    default:            return 'Pending';
  }
}
