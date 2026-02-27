import { create } from 'zustand';
import type { ArtifactInfo } from '../api/types';

interface WorkspaceState {
  files: ArtifactInfo[];
  expandedDirs: Set<string>;
  loading: boolean;
  setFiles: (files: ArtifactInfo[]) => void;
  setLoading: (v: boolean) => void;
  toggleDir: (path: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  files: [],
  expandedDirs: new Set<string>(),
  loading: false,
  setFiles: (files) => set({ files }),
  setLoading: (loading) => set({ loading }),
  toggleDir: (path) =>
    set((s) => {
      const next = new Set(s.expandedDirs);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { expandedDirs: next };
    }),
}));
