import { useState, useEffect } from 'react';
import { theme } from '../../theme';
import { ArtifactViewer } from './ArtifactViewer';
import { listArtifacts, readArtifact } from '../../api/client';
import type { ArtifactInfo } from '../../api/types';

interface Props {
  ideaId: string;
  stageId: string;
  label: string;
}

export function CardDetailTab({ ideaId, stageId, label }: Props) {
  const [artifacts, setArtifacts] = useState<ArtifactInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    listArtifacts(ideaId).then(setArtifacts).catch(() => {});
  }, [ideaId]);

  useEffect(() => {
    if (selectedFile) {
      readArtifact(ideaId, selectedFile).then((res) => setContent(res.content)).catch(() => {});
    }
  }, [ideaId, selectedFile]);

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      fontFamily: theme.fonts.body,
    }}>
      {/* File list sidebar */}
      <div style={{
        width: 200,
        borderRight: `1px solid ${theme.colors.border}`,
        overflowY: 'auto',
        padding: 8,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, padding: '8px 8px', color: theme.colors.textSecondary }}>
          {label} Files
        </div>
        {artifacts.filter((a) => !a.is_dir).map((a) => (
          <button
            key={a.path}
            onClick={() => setSelectedFile(a.path)}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 8px',
              border: 'none',
              background: selectedFile === a.path ? theme.colors.shimmerBase : 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: theme.fonts.body,
              fontSize: 12,
              color: theme.colors.text,
              borderRadius: 4,
              marginBottom: 2,
            }}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ flex: 1 }}>
        {selectedFile ? (
          <ArtifactViewer content={content} filename={selectedFile} />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: theme.colors.textSecondary,
            fontSize: 14,
          }}>
            Select a file to view
          </div>
        )}
      </div>
    </div>
  );
}
