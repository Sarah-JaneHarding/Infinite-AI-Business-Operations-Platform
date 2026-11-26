/**
 * Saves the ecosystem repository's documents (the copy in docs/ecosystem) into the warehouse as `documents`
 * records with the original file as `document_chunks`. Ids are deterministic (`eco_<slug of file name>`), so a second
 * run writes nothing and a person's later edit is never overwritten. Every file goes through the same input gate as an
 * upload: a file with learner identifiers or prompt injection is refused and reported, never stored.
 */
import { importFile, kindOf, saveRecord, UploadRefused, type DocRecord, type Store } from '../core/documents';

export const ECOSYSTEM_DIR = 'docs/ecosystem';

/** The files copied from the ecosystem repository (docs/ecosystem/SOURCE.md). A test holds this equal to the folder. */
export const ECOSYSTEM_FILES: readonly string[] = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'AWS_MIGRATION_AUDIT.md',
  'BRAND_KIT.md',
  'COST_MODEL.md',
  'DEPENDENCIES.md',
  'DEV_SETUP.md',
  'FEATURE_MATRIX.md',
  'FREE_LOCAL_TESTING.md',
  'HOW_TO_ADD_AN_AGENT.md',
  'INCIDENT_PROCESS.md',
  'INFINITE-AI-PRODUCTION-READINESS-AUDIT.html',
  'INFINITE-AI-VERIFIED-PILOT-AUDIT-V3.html',
  'ONBOARDING_GUIDE.md',
  'OPEN_QUESTIONS.md',
  'OPERATOR_MANUAL.md',
  'PEDAGOGY.md',
  'PILOT_PROTOCOL.md',
  'PILOT_PROTOCOL_ONE_SCHOOL_DRAFT.md',
  'POPIA.md',
  'PROMPTS.md',
  'PROVISIONING_DESIGN.md',
  'REPOSITORY_AUDIT_2026-09-25.md',
  'RETENTION_SCHEDULE_TEMPLATE.md',
  'SANDBOX.md',
  'SECURITY.md',
  'SOURCE_DOCUMENTS.md',
  'STAGE_LOG.md',
  'TOOLBOX_CATALOGUE.md',
  'WIDGET_REGISTRY_DESIGN.md',
  'WIDGET_STUDIO_AND_BOARD.md',
  'aws-cost-estimate.html',
  'brand-identity.html',
  'financial-model.html',
  'infinite-ai-business-planning.html',
];

export interface EcosystemResult { written: string[]; skipped: string[]; refused: { name: string; reason: string }[] }

export const ecosystemId = (name: string): string => `eco_${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;

export const REFUSALS = 'document_refusals';
export interface Refusal { id: string; name: string; reason: string; source: 'ecosystem'; at: string; resolved?: boolean }

const latestRefusal = (store: Store, id: string): Refusal | undefined => store.latest<Refusal>(REFUSALS).find((r) => r.id === id);

/** Files the input gate refused and that nobody has since loaded: the latest record for each id is not resolved. */
export const refusedFiles = (store: Store): { name: string; reason: string }[] => store.latest<Refusal>(REFUSALS).filter((r) => !r.resolved).map((r) => ({ name: r.name, reason: r.reason })).sort((a, b) => a.name.localeCompare(b.name));

const TOO_LARGE = 'Too large to edit here; stored as supplied';

export async function seedEcosystem(store: Store, files: { name: string; bytes: Uint8Array }[], by = 'ecosystem-seed', at = new Date().toISOString()): Promise<EcosystemResult> {
  const out: EcosystemResult = { written: [], skipped: [], refused: [] };
  const have = new Set(store.latest<DocRecord>('documents').map((d) => d.id));
  for (const f of files) {
    const id = ecosystemId(f.name);
    const earlier = latestRefusal(store, id);
    const clear = async () => { if (earlier && !earlier.resolved) await store.put(REFUSALS, { ...earlier, resolved: true, at }); };
    if (have.has(id)) { await clear(); out.skipped.push(id); continue; }
    const mime = kindOf(f.name) === 'html' ? 'text/html' : 'text/markdown';
    let imp;
    try {
      imp = await importFile(f.name, mime, f.bytes);
    } catch (e) {
      if (e instanceof UploadRefused) {
        out.refused.push({ name: f.name, reason: e.message });
        // One record per file, and a new one only when the reason changed or an earlier refusal was resolved.
        if (!earlier || earlier.resolved || earlier.reason !== e.message) await store.put(REFUSALS, { id, name: f.name, reason: e.message, source: 'ecosystem', at } satisfies Refusal);
        continue;
      }
      throw e;
    }
    const notes = imp.notes.map((n) => (n.startsWith('Too large to edit here') ? TOO_LARGE : n));
    const rec: DocRecord = { id, title: imp.doc?.title ?? f.name.replace(/\.[^.]+$/, ''), origin: 'uploaded', name: f.name, mime, kind: imp.kind, doc: imp.doc, scan: { scanned: Boolean(imp.doc), notes }, dept: 'ecosystem', by, at };
    await saveRecord(store, rec, f.bytes);
    await clear();
    out.written.push(id);
  }
  return out;
}
