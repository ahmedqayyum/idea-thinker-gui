import { useCallback, useEffect } from 'react';
import { useIdeaStore } from '../stores/ideaStore';
import { useAppStore } from '../stores/appStore';
import { useCanvasStore } from '../stores/canvasStore';
import { usePipelineStatusStore } from '../stores/pipelineStatusStore';
import { buildSkeletonCanvas } from '../components/Canvas/canvasHelpers';
import * as api from '../api/client';

export function useIdeas() {
  const { setIdeas, setCurrentIdea } = useIdeaStore();
  const { setActiveIdea, submittingPrompt, beginSubmit } = useAppStore();
  const { setNodes, setEdges, setSkeletonMode } = useCanvasStore();
  const setStageStatus = usePipelineStatusStore((s) => s.setStageStatus);

  useEffect(() => {
    if (!submittingPrompt) return;
    const prompt = submittingPrompt;

    const { nodes, edges } = buildSkeletonCanvas();
    setNodes(nodes);
    setEdges(edges);
    setSkeletonMode(true);

    setStageStatus('idea', 'in_progress', false);

    api.createIdea(prompt)
      .then(async (result) => {
        setActiveIdea(result.idea_id);
        useAppStore.getState().finishSubmit();
        setStageStatus('idea', 'completed', false);

        // Auto-start the pipeline
        try {
          await api.runPipeline(result.idea_id, 'claude');
          setStageStatus('resource_finder', 'in_progress', false);
        } catch (err) {
          console.error('Failed to start pipeline:', err);
        }
      })
      .catch((err) => {
        console.error('Failed to submit:', err);
        setStageStatus(null, null, false);
        useAppStore.setState({ submittingPrompt: null, isCreatingIdea: false, view: 'landing' });
      });
  }, [submittingPrompt]);

  const loadIdeas = useCallback(async () => {
    const ideas = await api.listIdeas();
    setIdeas(ideas);
  }, [setIdeas]);

  const loadIdea = useCallback(async (id: string) => {
    const idea = await api.getIdea(id);
    setCurrentIdea(idea);
  }, [setCurrentIdea]);

  const submitPrompt = useCallback((prompt: string) => {
    beginSubmit(prompt);
  }, [beginSubmit]);

  const openWorkspace = useCallback(async (ideaId: string) => {
    setActiveIdea(ideaId);
    useAppStore.setState({ view: 'canvas' });
    try {
      const idea = await api.getIdea(ideaId);
      setCurrentIdea(idea);
    } catch (err) {
      console.error('Failed to load workspace:', err);
    }
  }, [setActiveIdea, setCurrentIdea]);

  return { loadIdeas, loadIdea, submitPrompt, openWorkspace };
}
