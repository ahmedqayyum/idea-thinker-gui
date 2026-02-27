import { useEffect, useCallback, useState } from 'react';
import { theme } from '../../theme';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAppStore } from '../../stores/appStore';
import { useDetailTabStore } from '../../stores/detailTabStore';
import { listArtifacts } from '../../api/client';
import type { ArtifactInfo } from '../../api/types';
import '../../styles/shimmer.css';

function fileIcon(name: string, isDir: boolean, expanded?: boolean): string {
  if (isDir) return expanded ? '📂' : '📁';
  if (name.endsWith('.md')) return '📄';
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return '📋';
  if (name.endsWith('.json')) return '{}';
  if (name.endsWith('.tex')) return '📝';
  if (name.endsWith('.pdf')) return '📕';
  if (name.endsWith('.ipynb')) return '📓';
  return '📄';
}

interface DirChildrenCache {
  [dirPath: string]: ArtifactInfo[];
}

function FileItem({
  file,
  depth,
  ideaId,
  childrenCache,
  onLoadDir,
}: {
  file: ArtifactInfo;
  depth: number;
  ideaId: string;
  childrenCache: DirChildrenCache;
  onLoadDir: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const openTab = useDetailTabStore((s) => s.openTab);

  const handleClick = useCallback(() => {
    if (file.is_dir) {
      const next = !expanded;
      setExpanded(next);
      if (next && !childrenCache[file.path]) {
        onLoadDir(file.path);
      }
    } else {
      openTab({
        id: `file-${file.path}`,
        stageId: 'file',
        label: file.name,
        ideaId,
        filePath: file.path,
      });
    }
  }, [file, expanded, childrenCache, onLoadDir, openTab, ideaId]);

  const children = expanded ? (childrenCache[file.path] ?? []) : [];
  const loading = expanded && !childrenCache[file.path];

  return (
    <>
      <button
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          padding: `4px 8px 4px ${8 + depth * 14}px`,
          border: 'none',
          background: 'transparent',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: theme.fonts.body,
          fontSize: 12,
          color: theme.colors.text,
          borderRadius: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.shimmerBase)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title={file.path}
      >
        {file.is_dir && (
          <span style={{
            flexShrink: 0, fontSize: 9, color: theme.colors.textSecondary,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
            display: 'inline-block',
            width: 10,
          }}>
            ▶
          </span>
        )}
        <span style={{ flexShrink: 0, fontSize: 13 }}>{fileIcon(file.name, file.is_dir, expanded)}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
        {!file.is_dir && file.size != null && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: theme.colors.textSecondary, flexShrink: 0 }}>
            {file.size < 1024 ? `${file.size}B` : `${(file.size / 1024).toFixed(1)}K`}
          </span>
        )}
      </button>
      {loading && (
        <div style={{ padding: `2px 8px 2px ${22 + depth * 14}px`, fontSize: 11, color: theme.colors.textSecondary }}>
          Loading…
        </div>
      )}
      {children.map((child) => (
        <FileItem
          key={child.path}
          file={child}
          depth={depth + 1}
          ideaId={ideaId}
          childrenCache={childrenCache}
          onLoadDir={onLoadDir}
        />
      ))}
    </>
  );
}

function SkeletonFiles() {
  return (
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[70, 55, 80, 45, 65, 50].map((w, i) => (
        <div key={i} className="skeleton-line" style={{ height: 14, width: `${w}%` }} />
      ))}
    </div>
  );
}

export function WorkspaceSidebar() {
  const { files, loading, setFiles, setLoading } = useWorkspaceStore();
  const activeIdeaId = useAppStore((s) => s.activeIdeaId);
  const isCreatingIdea = useAppStore((s) => s.isCreatingIdea);
  const [childrenCache, setChildrenCache] = useState<DirChildrenCache>({});

  useEffect(() => {
    if (!activeIdeaId) return;
    setLoading(true);
    setChildrenCache({});
    listArtifacts(activeIdeaId)
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [activeIdeaId, setFiles, setLoading]);

  const handleLoadDir = useCallback((dirPath: string) => {
    if (!activeIdeaId) return;
    listArtifacts(activeIdeaId, dirPath).then((items) => {
      setChildrenCache((prev) => ({ ...prev, [dirPath]: items }));
    }).catch(() => {
      setChildrenCache((prev) => ({ ...prev, [dirPath]: [] }));
    });
  }, [activeIdeaId]);

  const showSkeleton = loading || isCreatingIdea;
  const showEmptyCreated = !showSkeleton && files.length === 0 && activeIdeaId;
  const showFiles = !showSkeleton && files.length > 0;

  return (
    <div style={{
      width: 220,
      minWidth: 180,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: theme.colors.card,
      borderRight: `1px solid ${theme.colors.border}`,
      fontFamily: theme.fonts.body,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 12px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        color: theme.colors.textSecondary,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        Workspace
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {showSkeleton && <SkeletonFiles />}
        {showEmptyCreated && (
          <div style={{
            padding: 16,
            fontSize: 12,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            lineHeight: '1.5',
          }}>
            No workspace files yet.<br />
            Run the pipeline to generate artifacts.
          </div>
        )}
        {showFiles && files.map((f) => (
          <FileItem
            key={f.path}
            file={f}
            depth={0}
            ideaId={activeIdeaId!}
            childrenCache={childrenCache}
            onLoadDir={handleLoadDir}
          />
        ))}
      </div>

      <div style={{
        padding: '8px 12px',
        fontSize: 11,
        color: theme.colors.textSecondary,
        borderTop: `1px solid ${theme.colors.border}`,
        opacity: 0.7,
      }}>
        Use <span style={{ fontFamily: 'monospace', background: theme.colors.shimmerBase, padding: '1px 4px', borderRadius: 3 }}>@filename</span> in chat
      </div>
    </div>
  );
}
