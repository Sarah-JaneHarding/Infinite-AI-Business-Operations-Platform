import { canonical, sha256Hex } from './crypto';
import type { LedgerEntry, OrgId } from './types';

const GENESIS = '0'.repeat(64);

/**
 * Append-only, hash-chained audit ledger. There is no update or delete method; `verify()` recomputes
 * the chain so tampering with any stored entry is detectable.
 */
export class Ledger {
  private entries: LedgerEntry[] = [];
  constructor(initial: LedgerEntry[] = [], private onAppend?: (e: LedgerEntry) => void) {
    this.entries = [...initial];
  }

  get all(): readonly LedgerEntry[] {
    return this.entries;
  }

  async append(e: { orgId: OrgId; actor: string; action: string; subject: string; detail?: Record<string, unknown>; at?: string }): Promise<LedgerEntry> {
    const prev = this.entries[this.entries.length - 1];
    const base = {
      seq: (prev?.seq ?? 0) + 1,
      at: e.at ?? new Date().toISOString(),
      orgId: e.orgId,
      actor: e.actor,
      action: e.action,
      subject: e.subject,
      detail: e.detail ?? {},
      prevHash: prev?.hash ?? GENESIS,
    };
    const entry: LedgerEntry = { ...base, hash: await sha256Hex(canonical(base)) };
    this.entries.push(entry);
    this.onAppend?.(entry);
    return entry;
  }

  /** Returns the seq of the first bad entry, or null when the chain is intact. */
  async verify(): Promise<number | null> {
    let prevHash = GENESIS;
    for (const [i, e] of this.entries.entries()) {
      const { hash, ...base } = e;
      if (e.seq !== i + 1 || e.prevHash !== prevHash || (await sha256Hex(canonical(base))) !== hash) return e.seq;
      prevHash = hash;
    }
    return null;
  }
}
