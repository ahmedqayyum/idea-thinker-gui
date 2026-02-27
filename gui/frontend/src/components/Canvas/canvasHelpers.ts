import type { Node, Edge } from '@xyflow/react';
import type { PipelineState, IdeaDetail, ArtifactInfo } from '../../api/types';
import { SKELETON_POSITIONS, SKELETON_EDGES } from '../../utils/skeletonLayout';
import { DEFAULT_STAGES, getStatusColor } from '../../utils/stageConfig';

export function buildSkeletonCanvas(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = SKELETON_POSITIONS.map((pos) => ({
    id: `skeleton-${pos.id}`,
    type: 'skeletonCard',
    position: { x: pos.x, y: pos.y },
    data: { stageId: pos.id },
  }));
  const edges: Edge[] = SKELETON_EDGES.map((e) => ({
    id: `skeleton-edge-${e.source}-${e.target}`,
    source: `skeleton-${e.source}`,
    target: `skeleton-${e.target}`,
    type: 'skeletonEdge',
    animated: true,
  }));
  return { nodes, edges };
}

export interface CanvasCallbacks {
  onExpand?: (stageId: string, label: string) => void;
  onFork?: (stageId: string, label: string) => void;
}

const STAGE_KEY_FILES: Record<string, string[]> = {
  resource_finder: ['paper_search_results', 'resources.md', 'literature_review.md', 'papers'],
  experiment_runner: ['REPORT.md', 'planning.md', 'results', 'src', 'figures'],
  quality_evaluation: ['quality_report.md'],
};

function buildStagePreview(
  stageId: string,
  idea: IdeaDetail | null,
  stageOutputs: Record<string, unknown> | undefined,
  files: ArtifactInfo[],
): string[] {
  const lines: string[] = [];

  if (stageId === 'idea') {
    if (idea?.hypothesis) {
      const h = idea.hypothesis.length > 80 ? idea.hypothesis.slice(0, 80) + '…' : idea.hypothesis;
      lines.push(h);
    }
    return lines;
  }

  const keyFiles = STAGE_KEY_FILES[stageId] ?? [];
  for (const key of keyFiles) {
    const match = files.find((f) => f.name === key);
    if (match) {
      if (match.is_dir) {
        lines.push(`📁 ${key}/`);
      } else {
        const sizeKb = match.size ? `${Math.round(match.size / 1024)}kb` : '';
        lines.push(`📄 ${key}${sizeKb ? ` (${sizeKb})` : ''}`);
      }
    }
  }

  if (stageOutputs) {
    if (stageOutputs.skipped) lines.push('Skipped (pre-existing)');
  }

  return lines.slice(0, 3);
}

export function buildCanvasFromPipeline(
  state: PipelineState,
  idea: IdeaDetail | null,
  callbacks?: CanvasCallbacks,
  files?: ArtifactInfo[],
): { nodes: Node[]; edges: Edge[] } {
  const stages = DEFAULT_STAGES;
  const allFiles = files ?? [];
  const nodes: Node[] = stages.map((stage, i) => {
    const stageState = state.stages?.[stage.id];
    const status = stageState?.status ?? 'pending';
    const preview = buildStagePreview(stage.id, idea, stageState?.outputs, allFiles);
    return {
      id: stage.id,
      type: 'stageCard',
      position: { x: 80 + i * 350, y: 200 },
      data: {
        stageId: stage.id,
        label: stage.label,
        icon: stage.icon,
        status,
        statusColor: getStatusColor(status),
        success: stageState?.success,
        title: stage.id === 'idea' ? (idea?.title ?? '') : undefined,
        domain: stage.id === 'idea' ? (idea?.domain ?? '') : undefined,
        preview,
        completedAt: stageState?.completed_at,
        onExpand: callbacks?.onExpand ? () => callbacks.onExpand!(stage.id, stage.label) : undefined,
        onFork: callbacks?.onFork ? () => callbacks.onFork!(stage.id, stage.label) : undefined,
      },
    };
  });

  const edges: Edge[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const sourceStatus = state.stages?.[stages[i].id]?.status;
    edges.push({
      id: `edge-${stages[i].id}-${stages[i + 1].id}`,
      source: stages[i].id,
      target: stages[i + 1].id,
      type: 'stageEdge',
      animated: sourceStatus === 'in_progress',
      data: { active: sourceStatus === 'in_progress' || sourceStatus === 'completed' },
    });
  }
  return { nodes, edges };
}
