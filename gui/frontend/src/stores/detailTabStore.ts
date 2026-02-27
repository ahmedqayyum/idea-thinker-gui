import { create } from 'zustand';

export interface DetailTab {
  id: string;
  stageId: string;
  label: string;
  ideaId: string;
  filePath?: string;
}

interface DetailTabState {
  tabs: DetailTab[];
  activeTabId: string | null;
  openTab: (tab: DetailTab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
}

export const useDetailTabStore = create<DetailTabState>((set) => ({
  tabs: [],
  activeTabId: null,
  openTab: (tab) =>
    set((s) => ({
      tabs: s.tabs.some((t) => t.id === tab.id) ? s.tabs : [...s.tabs, tab],
      activeTabId: tab.id,
    })),
  closeTab: (id) =>
    set((s) => ({
      tabs: s.tabs.filter((t) => t.id !== id),
      activeTabId: s.activeTabId === id ? null : s.activeTabId,
    })),
  setActiveTab: (id) => set({ activeTabId: id }),
}));
