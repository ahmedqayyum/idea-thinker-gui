import { theme } from '../../theme';
import { usePipelineStatusStore } from '../../stores/pipelineStatusStore';
import { useAppStore } from '../../stores/appStore';
import { getStatusLabel } from '../../utils/stageConfig';
import { STAGES } from '../../utils/stageConfig';
import '../../styles/shimmer.css';

function stageLabel(stageId: string): string {
  return STAGES.find((s) => s.id === stageId)?.label ?? stageId;
}

export function StatusBar() {
  const { currentStage, currentStatus, completed } = usePipelineStatusStore();
  const view = useAppStore((s) => s.view);
  const isCreatingIdea = useAppStore((s) => s.isCreatingIdea);

  if (view !== 'canvas') return null;

  const isActive = currentStatus === 'in_progress' || isCreatingIdea;
  const isDone = completed;
  const isFailed = currentStatus === 'failed';

  const dotColor = isFailed
    ? theme.colors.statusFailed
    : isDone
      ? theme.colors.statusDone
      : isActive
        ? theme.colors.statusDone
        : theme.colors.statusPending;

  let statusText: string;
  if (isCreatingIdea) {
    statusText = 'Creating research idea...';
  } else if (isDone) {
    statusText = 'Pipeline complete';
  } else if (isFailed) {
    statusText = `Failed at ${stageLabel(currentStage!)}`;
  } else if (currentStage) {
    statusText = `${stageLabel(currentStage)} — ${getStatusLabel(currentStatus ?? 'pending')}`;
  } else {
    statusText = 'Idea submitted — Ready';
  }

  const defaultStages = STAGES.filter((s) => !s.optional);

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      background: theme.colors.card,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: theme.fonts.body,
      minWidth: 260,
    }}>
      <span style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: dotColor,
        display: 'inline-block',
        flexShrink: 0,
        animation: isActive ? 'statusPulse 1.4s infinite ease-in-out' : 'none',
        boxShadow: isActive ? `0 0 8px ${dotColor}` : 'none',
      }} />

      <span style={{
        fontSize: 13,
        fontWeight: 500,
        color: theme.colors.text,
        whiteSpace: 'nowrap',
      }}>
        {statusText}
      </span>

      {/* Mini stage progress */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
        {defaultStages.map((s) => {
          const isCurrent = s.id === currentStage;
          const isPast = (() => {
            if (!currentStage) return false;
            const curIdx = defaultStages.findIndex((ds) => ds.id === currentStage);
            const thisIdx = defaultStages.findIndex((ds) => ds.id === s.id);
            return thisIdx < curIdx;
          })();
          return (
            <span
              key={s.id}
              title={s.label}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isCurrent
                  ? theme.colors.accent
                  : isPast
                    ? theme.colors.statusDone
                    : theme.colors.border,
                transition: 'background 300ms',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
