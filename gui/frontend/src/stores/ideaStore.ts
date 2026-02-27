import { create } from 'zustand';
import type { IdeaSummary, IdeaDetail } from '../api/types';

interface IdeaState {
  ideas: IdeaSummary[];
  currentIdea: IdeaDetail | null;
  setIdeas: (ideas: IdeaSummary[]) => void;
  setCurrentIdea: (idea: IdeaDetail) => void;
}

export const useIdeaStore = create<IdeaState>((set) => ({
  ideas: [],
  currentIdea: null,
  setIdeas: (ideas) => set({ ideas }),
  setCurrentIdea: (idea) => set({ currentIdea: idea }),
}));
