import { useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useIdeaStore } from '../stores/ideaStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { readArtifact } from '../api/client';
import { parseMentions } from '../utils/mentionParser';
import type { ChatMessage as ChatMsg, ArtifactInfo } from '../api/types';

export function useChat() {
  const { addMessage, appendToLastAssistant, setLoading, activeTabId } =
    useChatStore();

  const sendMessage = useCallback(
    async (content: string, provider?: string) => {
      addMessage(activeTabId, { role: 'user', content });
      setLoading(true);

      const tab = useChatStore.getState().tabs.find((t) => t.id === activeTabId);
      const baseMessages: ChatMsg[] = [
        ...(tab?.messages ?? []),
        { role: 'user' as const, content },
      ];

      // Build context messages for any @mentions of workspace files
      const idea = useIdeaStore.getState().currentIdea;
      const files = useWorkspaceStore.getState().files;
      const mentions = parseMentions(content);
      let contextMessages: ChatMsg[] = [];

      if (idea && mentions.length > 0 && files.length > 0) {
        const byName = new Map<string, ArtifactInfo>();
        for (const m of mentions) {
          const file = files.find(
            (f) => !f.is_dir && f.name === m.name && !byName.has(f.name),
          );
          if (file) {
            byName.set(file.name, file);
          }
        }

        if (byName.size > 0) {
          try {
            const ideaId = idea.idea_id;
            const results = await Promise.all(
              Array.from(byName.values()).map(async (file) => {
                try {
                  const res = await readArtifact(ideaId, file.path);
                  if (!res?.content || typeof res.content !== 'string') {
                    return null;
                  }
                  return { file, content: res.content as string };
                } catch {
                  return null;
                }
              }),
            );

            const maxChars = 4000;
            contextMessages = results
              .filter(
                (
                  r,
                ): r is { file: ArtifactInfo; content: string } => r !== null,
              )
              .map((r) => {
                const truncated =
                  r.content.length > maxChars
                    ? `${r.content.slice(0, maxChars)}\n\n...[truncated]...`
                    : r.content;
                return {
                  role: 'system' as const,
                  content: `Context from file ${r.file.name} (${r.file.path}):\n${truncated}`,
                };
              });
          } catch {
            // If context fetching fails, still send the original chat
            contextMessages = [];
          }
        }
      }

      const messages: ChatMsg[] = [...contextMessages, ...baseMessages];

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages,
              provider,
              idea_id: idea?.idea_id,
            }),
          }
        );

        if (!response.ok) {
          addMessage(activeTabId, {
            role: 'assistant',
            content: `Error: Server returned ${response.status} ${response.statusText}`,
          });
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split('\n')) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.error) {
                addMessage(activeTabId, {
                  role: 'assistant',
                  content: `Error: ${parsed.error}`,
                });
              } else if (parsed.content) {
                appendToLastAssistant(activeTabId, parsed.content);
              }
            } catch { /* skip malformed */ }
          }
        }
      } catch (err) {
        addMessage(activeTabId, {
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      } finally {
        setLoading(false);
      }
    },
    [activeTabId, addMessage, appendToLastAssistant, setLoading]
  );

  return { sendMessage };
}
