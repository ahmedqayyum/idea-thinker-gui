import { useState, useEffect } from 'react';
import { theme } from '../../theme';
import { ResearchCanvas } from '../Canvas/ResearchCanvas';
import { ChatPanel } from '../Chat/ChatPanel';
import { CardDetailTab } from '../CardDetail/CardDetailTab';
import { ArtifactViewer } from '../CardDetail/ArtifactViewer';
import { ForkDialog } from '../CardDetail/ForkDialog';
import { WorkspaceSidebar } from '../Sidebar/WorkspaceSidebar';
import { StatusBar } from './StatusBar';
import { TabBar } from './TabBar';
import { useDetailTabStore } from '../../stores/detailTabStore';
import { useForkStore } from '../../stores/forkStore';
import { useAppStore } from '../../stores/appStore';
import { forkFromStage, readArtifact, rawArtifactUrl } from '../../api/client';

function PdfViewer({ ideaId, filePath }: { ideaId: string; filePath: string }) {
  const url = rawArtifactUrl(ideaId, filePath);
  return (
    <iframe
      src={url}
      style={{ width: '100%', height: '100%', border: 'none' }}
      title={filePath}
    />
  );
}

function ImageViewer({ ideaId, filePath }: { ideaId: string; filePath: string }) {
  const url = rawArtifactUrl(ideaId, filePath);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: 20, overflow: 'auto',
      background: theme.colors.shimmerBase,
    }}>
      <img src={url} alt={filePath} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
    </div>
  );
}

function TextFileViewer({ ideaId, filePath }: { ideaId: string; filePath: string }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    readArtifact(ideaId, filePath)
      .then((res) => setContent(res.content ?? ''))
      .catch(() => setContent('Failed to load file.'))
      .finally(() => setLoading(false));
  }, [ideaId, filePath]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: theme.colors.textSecondary, fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  return <ArtifactViewer content={content} filename={filePath} />;
}

function FileViewer({ ideaId, filePath }: { ideaId: string; filePath: string }) {
  const lower = filePath.toLowerCase();

  if (lower.endsWith('.pdf')) {
    return <PdfViewer ideaId={ideaId} filePath={filePath} />;
  }

  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].some((ext) => lower.endsWith(ext))) {
    return <ImageViewer ideaId={ideaId} filePath={filePath} />;
  }

  return <TextFileViewer ideaId={ideaId} filePath={filePath} />;
}

export function AppShell() {
  const { tabs, activeTabId, closeTab, setActiveTab } = useDetailTabStore();
  const { showDialog, stageId, stageLabel, closeForkDialog } = useForkStore();
  const activeIdeaId = useAppStore((s) => s.activeIdeaId);

  const activeDetail = tabs.find((t) => t.id === activeTabId);

  const handleFork = async (provider: string) => {
    if (!activeIdeaId || !stageId) return;
    try {
      await forkFromStage(activeIdeaId, stageId, provider);
      closeForkDialog();
    } catch (err) {
      console.error('Fork failed:', err);
    }
  };

  const renderCenter = () => {
    if (!activeDetail) {
      return (
        <div style={{ flex: 1, position: 'relative' }}>
          <ResearchCanvas />
        </div>
      );
    }

    if (activeDetail.filePath) {
      return (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <FileViewer ideaId={activeDetail.ideaId} filePath={activeDetail.filePath} />
        </div>
      );
    }

    return (
      <div style={{ flex: 1 }}>
        <CardDetailTab
          ideaId={activeDetail.ideaId}
          stageId={activeDetail.stageId}
          label={activeDetail.label}
        />
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: theme.colors.background,
      overflow: 'hidden',
    }}>
      {tabs.length > 0 && (
        <TabBar
          tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
          activeTabId={activeTabId ?? ''}
          onSelect={(id) => setActiveTab(id)}
          onClose={(id) => closeTab(id)}
        />
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <WorkspaceSidebar />
        {renderCenter()}
        <ChatPanel />
      </div>

      <StatusBar />

      {showDialog && stageId && stageLabel && (
        <ForkDialog
          stageId={stageId}
          stageLabel={stageLabel}
          onConfirm={handleFork}
          onCancel={closeForkDialog}
        />
      )}
    </div>
  );
}
