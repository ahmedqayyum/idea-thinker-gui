import { create } from 'zustand';
import type { ChatMessage } from '../api/types';

export interface ChatTab {
  id: string;
  label: string;
  messages: ChatMessage[];
  stageId?: string;
}

interface ChatState {
  tabs: ChatTab[];
  activeTabId: string;
  loading: boolean;
  addTab: (tab: ChatTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setLoading: (v: boolean) => void;
  addMessage: (tabId: string, msg: ChatMessage) => void;
  appendToLastAssistant: (tabId: string, text: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  tabs: [{ id: 'main', label: 'Chat', messages: [] }],
  activeTabId: 'main',
  loading: false,
  setLoading: (v) => set({ loading: v }),
  addTab: (tab) =>
    set((s) => ({
      tabs: s.tabs.some((t) => t.id === tab.id) ? s.tabs : [...s.tabs, tab],
      activeTabId: tab.id,
    })),
  removeTab: (id) =>
    set((s) => ({
      tabs: s.tabs.filter((t) => t.id !== id),
      activeTabId: s.activeTabId === id ? 'main' : s.activeTabId,
    })),
  setActiveTab: (id) => set({ activeTabId: id }),
  addMessage: (tabId, msg) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId ? { ...t, messages: [...t.messages, msg] } : t
      ),
    })),
  appendToLastAssistant: (tabId, text) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId) return t;
        const msgs = [...t.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          msgs[msgs.length - 1] = { ...last, content: last.content + text };
        } else {
          msgs.push({ role: 'assistant', content: text });
        }
        return { ...t, messages: msgs };
      }),
    })),
}));
