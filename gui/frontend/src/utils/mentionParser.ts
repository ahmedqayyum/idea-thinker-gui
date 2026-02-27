/** Parse @mentions from chat input text. */
const MENTION_RE = /@([\w\-.:]+)/g;

export interface Mention {
  raw: string;   // full match including @
  name: string;  // the captured name
  start: number;
  end: number;
}

export function parseMentions(text: string): Mention[] {
  const matches: Mention[] = [];
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(text)) !== null) {
    matches.push({
      raw: m[0],
      name: m[1],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return matches;
}
