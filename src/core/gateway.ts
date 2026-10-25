import type { Purpose, Provenance } from './types';
import type { Ledger } from './ledger';

export interface GatewayRequest {
  orgId: string;
  agentId: string;
  purpose: Purpose;
  system: string;
  /** Must already be de-identified. */
  prompt: string;
  provenance: Provenance;
  /** Structured, de-identified context the local engine can summarise deterministically. */
  context?: Record<string, string | number>;
}
export interface GatewayResponse {
  text: string;
  engine: string;
}
export interface Engine {
  name: string;
  complete(req: GatewayRequest): Promise<string>;
}

/**
 * Deterministic offline engine. It never invents content: it restates the structured context it was
 * given. It exists so every agent works with no API key and so tests are reproducible.
 */
export const localDraftEngine: Engine = {
  name: 'local-draft/1',
  async complete(req) {
    const lines = Object.entries(req.context ?? {}).map(([k, v]) => `- ${k}: ${v} [src:${k}]`);
    return lines.length ? `Facts supplied to this draft:\n${lines.join('\n')}` : 'No structured facts were supplied; a human must complete this section.';
  },
};

/** Calls the server route, which holds the provider key. The browser never sees a key. */
export function remoteEngine(url = '/api/gateway/gemini', name = 'gemini-via-server', fetchImpl: typeof fetch = fetch): Engine {
  return {
    name,
    async complete(req) {
      const r = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ system: req.system, prompt: req.prompt }) });
      if (!r.ok) throw new Error(`gateway upstream ${r.status}`);
      const j = (await r.json()) as { text?: string };
      if (!j.text) throw new Error('gateway upstream returned no text');
      return j.text;
    },
  };
}

export class GatewayRefused extends Error {}

/** The only code in the platform that can produce model text. */
export class Gateway {
  constructor(private ledger: Ledger, private engine: Engine = localDraftEngine) {}
  setEngine(e: Engine) {
    this.engine = e;
  }
  get engineName() {
    return this.engine.name;
  }

  async complete(req: GatewayRequest): Promise<GatewayResponse> {
    if (!req.provenance.deidentified) {
      await this.ledger.append({ orgId: req.orgId, actor: req.agentId, action: 'gateway.refused', subject: req.purpose, detail: { reason: 'not_deidentified' } });
      throw new GatewayRefused('Gateway refuses any request that is not de-identified.');
    }
    if (!req.provenance.sources.length) throw new GatewayRefused('Gateway refuses requests without provenance sources.');
    let text: string;
    let engine = this.engine;
    try {
      text = await engine.complete(req);
    } catch (e) {
      // Fail closed to the deterministic engine; record the fallback.
      await this.ledger.append({ orgId: req.orgId, actor: req.agentId, action: 'gateway.fallback', subject: req.purpose, detail: { from: engine.name, error: String((e as Error).message) } });
      engine = localDraftEngine;
      text = await engine.complete(req);
    }
    await this.ledger.append({ orgId: req.orgId, actor: req.agentId, action: 'gateway.complete', subject: req.purpose, detail: { engine: engine.name, promptChars: req.prompt.length, sources: req.provenance.sources } });
    return { text, engine: engine.name };
  }
}
