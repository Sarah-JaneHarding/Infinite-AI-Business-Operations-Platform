import { canonical, sha256Hex } from './crypto';
import type { LedgerEntry, OrgId } from './types';

const GENESIS = '0'.repeat(64);

export interface LedgerInput { orgId: OrgId; actor: string; action: string; subject: string; detail?: Record<string, unknown> }
/** Asks the server to author the next entry. `knownSeq` is the newest entry this client holds; the server returns what it missed. */
export type Sequencer = (input: LedgerInput, knownSeq: number) => Promise<{ entry: LedgerEntry; earlier: LedgerEntry[] }>;

/**
 * Append-only, hash-chained audit ledger. There is no update or delete method; `verify()` recomputes
 * the chain so tampering with any stored entry is detectable.
 */
export class Ledger {
  private entries: LedgerEntry[] = [];
  private tail: Promise<unknown> = Promise.resolve();
  /** With a `sequencer` the server assigns seq/hash/time (and persists the entry); without one the chain is built locally. */
  constructor(initial: LedgerEntry[] = [], private onAppend?: (e: LedgerEntry) => void, private sequencer?: Sequencer) {
    this.entries = [...initial];
  }

  get all(): readonly LedgerEntry[] {
    return this.entries;
  }

  async append(e: LedgerInput & { at?: string }): Promise<LedgerEntry> {
    if (!this.sequencer) return this.appendLocal(e);
    // One request at a time, so `knownSeq` is always the true tip of this client's copy.
    const run = this.tail.then(() => this.appendRemote(this.sequencer!, e));
    this.tail = run.catch(() => undefined);
    return run;
  }

  private async appendRemote(seq: Sequencer, e: LedgerInput): Promise<LedgerEntry> {
    const known = this.entries[this.entries.length - 1]?.seq ?? 0;
    const { entry, earlier } = await seq({ orgId: e.orgId, actor: e.actor, action: e.action, subject: e.subject, detail: e.detail }, known);
    const gap = [...earlier, entry].every((x, i) => x.seq === known + 1 + i);
    if (!gap) throw new Error('Server ledger reply does not continue this ledger.');
    this.entries.push(...earlier, entry);
    return entry;
  }

  private async appendLocal(e: LedgerInput & { at?: string }): Promise<LedgerEntry> {
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
