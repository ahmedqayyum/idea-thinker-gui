import { theme } from '../../theme';

interface Props {
  onYamlUpload: (content: string) => void;
  onUrlPaste: (url: string) => void;
}

export function AttachmentBar({ onYamlUpload, onUrlPaste }: Props) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onYamlUpload(reader.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      marginTop: 8,
      justifyContent: 'center',
      opacity: 0.6,
      fontSize: 13,
      fontFamily: theme.fonts.body,
    }}>
      <label style={{
        cursor: 'pointer',
        color: theme.colors.textSecondary,
        textDecoration: 'underline',
      }}>
        Attach YAML
        <input
          type="file"
          accept=".yaml,.yml"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
      </label>
      <span style={{ color: theme.colors.border }}>|</span>
      <button
        onClick={() => {
          const url = prompt('Paste IdeaHub URL:');
          if (url) onUrlPaste(url);
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme.colors.textSecondary,
          textDecoration: 'underline',
          fontFamily: theme.fonts.body,
          fontSize: 13,
          padding: 0,
        }}
      >
        Paste IdeaHub URL
      </button>
    </div>
  );
}
