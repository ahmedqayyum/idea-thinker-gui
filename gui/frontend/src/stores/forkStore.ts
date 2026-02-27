import { create } from 'zustand';

interface ForkState {
  showDialog: boolean;
  stageId: string | null;
  stageLabel: string | null;
  openForkDialog: (stageId: string, stageLabel: string) => void;
  closeForkDialog: () => void;
}

export const useForkStore = create<ForkState>((set) => ({
  showDialog: false,
  stageId: null,
  stageLabel: null,
  openForkDialog: (stageId, stageLabel) =>
    set({ showDialog: true, stageId, stageLabel }),
  closeForkDialog: () =>
    set({ showDialog: false, stageId: null, stageLabel: null }),
}));
