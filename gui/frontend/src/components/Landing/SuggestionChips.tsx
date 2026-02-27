import { useState } from 'react';
import { theme } from '../../theme';
import type { IdeaSummary } from '../../api/types';
import '../../styles/shimmer.css';

interface Props {
  workspaces: IdeaSummary[];
  loading?: boolean;
  onOpen: (ideaId: string) => void;
}

function SkeletonCard() {
  return (
    <div style={{
      width: 260,
      padding: 14,
      borderRadius: theme.radii.card,
      background: theme.colors.card,
      boxShadow: theme.shadows.card,
      border: `1px solid ${theme.colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div className="skeleton-line" style={{ height: 12, width: '35%' }} />
      <div className="skeleton-line" style={{ height: 16, width: '80%' }} />
    </div>
  );
}

function domainColor(domain: string): string {
  const map: Record<string, string> = {
    artificial_intelligence: '#6366F1',
    machine_learning: '#8B5CF6',
    data_science: '#EC4899',
    nlp: '#3B82F6',
    computer_vision: '#10B981',
    reinforcement_learning: '#F59E0B',
    mathematics: '#EF4444',
    scientific_computing: '#14B8A6',
    systems: '#64748B',
    theory: '#A855F7',
  };
  return map[domain] ?? theme.colors.accent;
}

function WorkspaceCard({ idea, onOpen }: { idea: IdeaSummary; onOpen: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onOpen(idea.idea_id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 260,
        padding: 14,
        borderRadius: theme.radii.card,
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.card,
        boxShadow: hovered ? theme.shadows.cardHover : theme.shadows.card,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: theme.fonts.body,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        transition: 'box-shadow 200ms, transform 200ms',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        overflow: 'hidden',
      }}
    >
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: domainColor(idea.domain),
      }}>
        {idea.domain.replace(/_/g, ' ')}
      </span>
      <span style={{
        fontSize: 14,
        fontWeight: 600,
        color: theme.colors.text,
        lineHeight: '1.3',
      }}>
        {idea.title}
      </span>
    </button>
  );
}

export function SuggestionChips({ workspaces, loading, onOpen }: Props) {
  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 260px)',
        gap: 12,
        justifyContent: 'center',
        marginTop: 24,
      }}>
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (workspaces.length === 0) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 260px)',
      gap: 12,
      justifyContent: 'center',
      marginTop: 24,
    }}>
      {workspaces.map((ws) => (
        <WorkspaceCard key={ws.idea_id} idea={ws} onOpen={onOpen} />
      ))}
    </div>
  );
}
