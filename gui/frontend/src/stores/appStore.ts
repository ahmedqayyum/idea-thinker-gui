import { create } from 'zustand';
import type { ViewState } from '../api/types';

interface AppState {
  view: ViewState;
  activeIdeaId: string | null;
  submittingPrompt: string | null;
  /** True from the moment user clicks submit until the idea API returns */
  isCreatingIdea: boolean;
  setView: (v: ViewState) => void;
  setActiveIdea: (id: string) => void;
  beginSubmit: (prompt: string) => void;
  finishSubmit: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'landing',
  activeIdeaId: null,
  submittingPrompt: null,
  isCreatingIdea: false,
  setView: (view) => set({ view }),
  setActiveIdea: (id) => set({ activeIdeaId: id }),
  beginSubmit: (prompt) => set({ view: 'canvas', submittingPrompt: prompt, isCreatingIdea: true }),
  finishSubmit: () => set({ submittingPrompt: null, isCreatingIdea: false }),
}));
