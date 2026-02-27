import { create } from 'zustand';

interface PipelineStatusState {
  currentStage: string | null;
  currentStatus: string | null;
  completed: boolean;
  setStageStatus: (stage: string | null, status: string | null, completed: boolean) => void;
}

export const usePipelineStatusStore = create<PipelineStatusState>((set) => ({
  currentStage: null,
  currentStatus: null,
  completed: false,
  setStageStatus: (stage, status, completed) =>
    set({ currentStage: stage, currentStatus: status, completed }),
}));
