import { create } from 'zustand';
import { applyNodeChanges } from '@xyflow/react';
import type { Node, Edge, NodeChange } from '@xyflow/react';

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  isSkeletonMode: boolean;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  setSkeletonMode: (v: boolean) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  nodes: [],
  edges: [],
  isSkeletonMode: true,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
  setSkeletonMode: (v) => set({ isSkeletonMode: v }),
  updateNodeData: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })),
}));
