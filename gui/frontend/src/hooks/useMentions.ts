import { useMemo } from 'react';
import { STAGES } from '../utils/stageConfig';
import { useWorkspaceStore } from '../stores/workspaceStore';

export interface MentionOption {
  id: string;
  label: string;
  type: 'stage' | 'artifact' | 'idea';
}

export function useMentions(): MentionOption[] {
  const files = useWorkspaceStore((s) => s.files);

  return useMemo(() => {
    const stageOptions: MentionOption[] = STAGES.map((s) => ({
      id: s.id,
      label: `${s.icon} ${s.label}`,
      type: 'stage',
    }));

    const fileOptions: MentionOption[] = files
      .filter((f) => !f.is_dir)
      .map((f) => ({
        id: f.name,
        label: `📄 ${f.name}`,
        type: 'artifact' as const,
      }));

    // Deduplicate by id
    const seen = new Set<string>();
    const all = [...stageOptions, ...fileOptions].filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    return all;
  }, [files]);
}
