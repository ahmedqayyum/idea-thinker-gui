import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { theme } from '../../theme';

interface Props {
  content: string;
  filename: string;
}

const LATEX_EXTENSIONS = ['.tex', '.sty', '.cls', '.bst'];
const BIB_EXTENSIONS = ['.bib', '.bbl'];

function isLatex(name: string) {
  return LATEX_EXTENSIONS.some((e) => name.endsWith(e));
}
function isBib(name: string) {
  return BIB_EXTENSIONS.some((e) => name.endsWith(e));
}

const colors = {
  command: '#569cd6',
  comment: '#6a9955',
  brace: '#da70d6',
  math: '#ce9178',
  envName: '#4ec9b0',
  text: '#d4d4d4',
  lineNum: '#858585',
};

function highlightLatexLine(line: string, lineKey: number): React.ReactNode {
  if (line.trimStart().startsWith('%')) {
    return <span style={{ color: colors.comment }}>{line}</span>;
  }

  const parts: React.ReactNode[] = [];
  const re = /(\\(?:begin|end))\{([^}]*)\}|\\[a-zA-Z@]+\*?|%.*$|\$\$?|\{|\}|\[|\]/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      parts.push(<span key={`${lineKey}-t${last}`} style={{ color: colors.text }}>{line.slice(last, m.index)}</span>);
    }
    const tok = m[0];
    if (m[1]) {
      parts.push(
        <React.Fragment key={`${lineKey}-e${m.index}`}>
          <span style={{ color: colors.command }}>{m[1]}</span>
          <span style={{ color: colors.brace }}>{'{'}</span>
          <span style={{ color: colors.envName }}>{m[2]}</span>
          <span style={{ color: colors.brace }}>{'}'}</span>
        </React.Fragment>
      );
    } else if (tok.startsWith('%')) {
      parts.push(<span key={`${lineKey}-c${m.index}`} style={{ color: colors.comment }}>{tok}</span>);
    } else if (tok.startsWith('\\')) {
      parts.push(<span key={`${lineKey}-cmd${m.index}`} style={{ color: colors.command }}>{tok}</span>);
    } else if (tok === '{' || tok === '}') {
      parts.push(<span key={`${lineKey}-b${m.index}`} style={{ color: colors.brace }}>{tok}</span>);
    } else if (tok === '$' || tok === '$$') {
      parts.push(<span key={`${lineKey}-m${m.index}`} style={{ color: colors.math }}>{tok}</span>);
    } else {
      parts.push(<span key={`${lineKey}-o${m.index}`} style={{ color: colors.text }}>{tok}</span>);
    }
    last = re.lastIndex;
  }

  if (last < line.length) {
    parts.push(<span key={`${lineKey}-end`} style={{ color: colors.text }}>{line.slice(last)}</span>);
  }

  return <>{parts}</>;
}

function LatexViewer({ content }: { content: string }) {
  const lines = useMemo(() => content.split('\n'), [content]);

  const gutterWidth = String(lines.length).length;

  return (
    <pre style={{
      margin: 0,
      padding: 0,
      background: '#1e1e1e',
      color: colors.text,
      fontSize: 13,
      lineHeight: '1.55',
      fontFamily: "'Menlo', 'Consolas', 'Courier New', monospace",
      overflow: 'auto',
      display: 'flex',
    }}>
      <code style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 0',
        width: '100%',
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', minHeight: '1.55em' }}>
            <span style={{
              display: 'inline-block',
              width: `${gutterWidth + 2}ch`,
              textAlign: 'right',
              paddingRight: '1.5ch',
              color: colors.lineNum,
              userSelect: 'none',
              flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, paddingRight: 12 }}>
              {highlightLatexLine(line, i)}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
}

export function ArtifactViewer({ content, filename }: Props) {
  const isMarkdown = filename.endsWith('.md');
  const isLatexFile = isLatex(filename) || isBib(filename);

  return (
    <div style={{
      padding: isLatexFile ? 0 : 20,
      fontFamily: theme.fonts.body,
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: '1.6',
      overflowY: 'auto',
      height: '100%',
    }}>
      {isMarkdown ? (
        <ReactMarkdown>{content}</ReactMarkdown>
      ) : isLatexFile ? (
        <LatexViewer content={content} />
      ) : (
        <pre style={{
          background: theme.colors.shimmerBase,
          padding: 16,
          borderRadius: theme.radii.button,
          overflow: 'auto',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {content}
        </pre>
      )}
    </div>
  );
}
