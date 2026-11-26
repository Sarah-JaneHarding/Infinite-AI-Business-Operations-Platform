import type { DocRecord } from '../core/documents';
import { PACKAGE_FILES } from './seedPackage';

export type DocSource = 'library' | 'business-plan' | 'ecosystem' | 'other';

const PACKAGE_IDS = new Set(PACKAGE_FILES.map((f) => f.id));

/** Which document set a record came from. Pure, so the Library chips and their counts can be tested. */
export function sourceOf(rec: Pick<DocRecord, 'id'>): DocSource {
  if (rec.id.startsWith('lib-')) return 'library';
  if (rec.id.startsWith('eco_')) return 'ecosystem';
  if (PACKAGE_IDS.has(rec.id)) return 'business-plan';
  return 'other';
}
