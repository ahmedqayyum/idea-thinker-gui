import { useState, useEffect } from 'react';
import { theme } from '../../theme';
import { PromptInput } from './PromptInput';
import { SuggestionChips } from './SuggestionChips';
import { AttachmentBar } from './AttachmentBar';
import { useIdeas } from '../../hooks/useIdeas';
import { listIdeas } from '../../api/client';
import type { IdeaSummary } from '../../api/types';

export function LandingPage() {
  const [completedWorkspaces, setCompletedWorkspaces] = useState<IdeaSummary[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const { submitPrompt, openWorkspace } = useIdeas();

  useEffect(() => {
    listIdeas({ pipelineCompleted: true })
      .then((ideas: IdeaSummary[]) => setCompletedWorkspaces(ideas.slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoadingWorkspaces(false));
  }, []);

  const handleSubmit = (prompt: string) => {
    submitPrompt(prompt);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: theme.colors.background,
      padding: 24,
      fontFamily: theme.fonts.body,
    }}>
      <h1 style={{
        fontSize: 32,
        fontWeight: 600,
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
      }}>
        What would you like to explore?
      </h1>
      <p style={{
        fontSize: 15,
        color: theme.colors.textSecondary,
        marginBottom: 32,
        textAlign: 'center',
      }}>
        Describe a research idea and we'll set up the full pipeline for you.
      </p>

      <PromptInput onSubmit={handleSubmit} />

      <AttachmentBar
        onYamlUpload={(content) => handleSubmit(content)}
        onUrlPaste={(url) => handleSubmit(url)}
      />

      <SuggestionChips
        workspaces={completedWorkspaces}
        loading={loadingWorkspaces}
        onOpen={openWorkspace}
      />
    </div>
  );
}
