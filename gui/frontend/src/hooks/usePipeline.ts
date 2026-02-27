import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useIdeaStore } from '../stores/ideaStore';
import { useDetailTabStore } from '../stores/detailTabStore';
import { useForkStore } from '../stores/forkStore';
import { usePipelineStatusStore } from '../stores/pipelineStatusStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { createPipelineWs, getPipelineStatus, listArtifacts } from '../api/client';
import type { PipelineState } from '../api/types';
import { buildCanvasFromPipeline, type CanvasCallbacks } from '../components/Canvas/canvasHelpers';

function extractCurrentStage(state: PipelineState): { stage: string | null; status: string | null } {
  const stages = state.stages ?? {};
  let activeStage: string | null = null;
  let activeStatus: string | null = null;

  // Find the currently running stage, or the last completed one
  for (const [id, info] of Object.entries(stages)) {
    if (info.status === 'in_progress') {
      return { stage: id, status: 'in_progress' };
    }
    if (info.status === 'failed') {
      return { stage: id, status: 'failed' };
    }
    if (info.status === 'completed') {
      activeStage = id;
      activeStatus = 'completed';
    }
  }
  return { stage: activeStage, status: activeStatus };
}

export function usePipeline(ideaId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const { setNodes, setEdges, setSkeletonMode } = useCanvasStore();
  const { currentIdea } = useIdeaStore();
  const openTab = useDetailTabStore((s) => s.openTab);
  const openForkDialog = useForkStore((s) => s.openForkDialog);
  const setStageStatus = usePipelineStatusStore((s) => s.setStageStatus);
  const setWorkspaceFiles = useWorkspaceStore((s) => s.setFiles);

  const callbacks: CanvasCallbacks = {
    onExpand: (stageId, label) => {
      if (!ideaId) return;
      openTab({ id: `${ideaId}-${stageId}`, stageId, label, ideaId });
    },
    onFork: (stageId, label) => {
      openForkDialog(stageId, label);
    },
  };

  const applyState = useCallback(
    (state: PipelineState) => {
      const currentFiles = useWorkspaceStore.getState().files;
      const existingNodes = useCanvasStore.getState().nodes;
      const posMap = new Map(existingNodes.map((n) => [n.id, n.position]));

      const { nodes, edges } = buildCanvasFromPipeline(state, currentIdea, callbacks, currentFiles);
      const merged = nodes.map((n) => posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n);
      setNodes(merged);
      setEdges(edges);
      setSkeletonMode(false);

      const { stage, status } = extractCurrentStage(state);
      setStageStatus(stage, status, state.completed ?? false);

      if (ideaId) {
        listArtifacts(ideaId).then((files) => {
          setWorkspaceFiles(files);
          const latest = useCanvasStore.getState().nodes;
          const latestPosMap = new Map(latest.map((n) => [n.id, n.position]));
          const { nodes: n, edges: e } = buildCanvasFromPipeline(state, currentIdea, callbacks, files);
          const mergedN = n.map((nd) => latestPosMap.has(nd.id) ? { ...nd, position: latestPosMap.get(nd.id)! } : nd);
          setNodes(mergedN);
          setEdges(e);
        }).catch(() => {});
      }
    },
    [setNodes, setEdges, setSkeletonMode, currentIdea, ideaId, setStageStatus, setWorkspaceFiles]
  );

  useEffect(() => {
    if (!ideaId) return;

    getPipelineStatus(ideaId)
      .then(applyState)
      .catch(() => {});

    const ws = createPipelineWs(ideaId);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const state = JSON.parse(ev.data) as PipelineState;
        applyState(state);
      } catch { /* ignore parse errors */ }
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [ideaId, applyState]);

  return null;
}
