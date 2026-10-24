// Pure parsers for the ecosystem's own documents. Used by the live connector.

export interface Stage { n: number; title: string; date: string | null }
export interface OpenQuestion { id: string; raised: string | null; status: string; title: string }

export function parseStages(stageLog: string): Stage[] {
  return [...stageLog.matchAll(/^## Stage (\d+) — (.+)$/gm)].map((m) => {
    const d = m[2].match(/^(.*?)\s·\s(\d{4}-\d{2}-\d{2})$/);
    return { n: Number(m[1]), title: (d ? d[1] : m[2]).trim(), date: d ? d[2] : null };
  });
}

export function parseOpenQuestions(text: string): OpenQuestion[] {
  const map = new Map<string, OpenQuestion>();
  for (const m of text.matchAll(/^\|\s*(OQ-\d+)\s*\|\s*([\d-]+)\s*\|\s*([^|]*)\|\s*([^|]*?)\s*\|\s*(.+?)\s*\|\s*$/gm))
    map.set(m[1], { id: m[1], raised: m[2], status: m[4].trim(), title: m[5].replace(/\*\*/g, '').slice(0, 160) });
  for (const m of text.matchAll(/^### (OQ-\d+)(?: \(partial\))? — (.+?)(?: · (resolved )?(\d{4}-\d{2}-\d{2}))?$/gm))
    if (!map.has(m[1])) map.set(m[1], { id: m[1], raised: m[4] ?? null, status: m[3] ? 'RESOLVED' : 'OPEN', title: m[2].slice(0, 160) });
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}
export const isOpen = (q: OpenQuestion) => !/^RESOLVED/i.test(q.status);
