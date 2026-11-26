/**
 * Loads every business-operations and ecosystem document into the warehouse: the 120 library documents, the business
 * plan package and the ecosystem copy. Idempotent and stateless: each call checks the store, so a second call writes
 * nothing. `readFile` takes a path relative to the repository root.
 */
import type { Store } from '../core/documents';
import { seedLibrary } from './seed';
import { PACKAGE_FILES, seedPackage } from './seedPackage';
import { ECOSYSTEM_DIR, ECOSYSTEM_FILES, seedEcosystem, type EcosystemResult } from './seedEcosystem';

export interface Result { written: string[]; skipped: string[] }
export interface LoadAllResult { library: Result; businessPlan: Result; ecosystem: EcosystemResult }

export const BUSINESS_PLAN_DIR = 'docs/business-plan';

export async function loadAll(store: Store, readFile: (relativePath: string) => Uint8Array): Promise<LoadAllResult> {
  const library = await seedLibrary(store);
  const pkgFiles = PACKAGE_FILES.map((f) => ({ ...f, bytes: readFile(`${BUSINESS_PLAN_DIR}/${f.name}`) }));
  const businessPlan = await seedPackage(store, pkgFiles);
  const ecosystem = await seedEcosystem(store, ECOSYSTEM_FILES.map((name) => ({ name, bytes: readFile(`${ECOSYSTEM_DIR}/${name}`) })));
  return { library, businessPlan, ecosystem };
}
