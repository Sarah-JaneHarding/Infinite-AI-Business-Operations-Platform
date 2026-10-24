import raw from '../generated/ecosystem-snapshot.json';

export interface EcoSnapshot {
  schema: string;
  repo: { head: string | null; headDate: string | null; headSubject: string | null; visibleCommits: number | null; shallow: boolean };
  code: { totals: { srcFiles: number; srcLoc: number; testFiles: number; testLoc: number }; units: { kind: string; name: string; srcFiles: number; srcLoc: number; testFiles: number; testLoc: number }[] };
  stages: { count: number; latest: { n: number; title: string; date: string | null }[]; stageLogLines: number };
  openQuestions: { total: number; open: number; openList: { id: string; raised: string | null; stage: string; status: string; title: string }[] };
  agents: { contractFiles: number; byModule: Record<string, number>; rosterClaimInAgentsMd: string | null };
  docs: { files: string[]; runbooks: string[]; ciWorkflows: string[] };
}

export const snapshot = raw as unknown as EcoSnapshot;

const WORDS: Record<string, number> = { forty: 40, fifty: 50, 'fifty-five': 55, 'fifty-six': 56, 'forty-six': 46 };

/** Flat, sourced facts: key → value. These are the only repo numbers a draft may contain. */
export function snapshotFacts(s: EcoSnapshot = snapshot): Record<string, string | number> {
  return {
    'eco.head': s.repo.head ?? 'unknown',
    'eco.headDate': s.repo.headDate ?? 'unknown',
    'eco.units': s.code.units.length,
    'eco.srcFiles': s.code.totals.srcFiles,
    'eco.srcLoc': s.code.totals.srcLoc,
    'eco.testFiles': s.code.totals.testFiles,
    'eco.testLoc': s.code.totals.testLoc,
    'eco.stages': s.stages.count,
    'eco.latestStage': s.stages.latest.at(-1)?.n ?? 0,
    'eco.oq.total': s.openQuestions.total,
    'eco.oq.open': s.openQuestions.open,
    'eco.agents.contracts': s.agents.contractFiles,
    'eco.agents.documented': s.agents.rosterClaimInAgentsMd ? (WORDS[s.agents.rosterClaimInAgentsMd.toLowerCase()] ?? s.agents.rosterClaimInAgentsMd) : 'unknown',
    ...Object.fromEntries(Object.entries(s.agents.byModule).map(([m, n]) => [`eco.agents.${m}`, n])),
    'eco.runbooks': s.docs.runbooks.length,
    'eco.ciWorkflows': s.docs.ciWorkflows.length,
    'eco.docs': s.docs.files.length,
  };
}
