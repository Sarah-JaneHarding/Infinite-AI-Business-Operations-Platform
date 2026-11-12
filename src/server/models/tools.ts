import { Type } from './schema';
import { agentById } from '../../departments';
import { detectPii } from '../../core/guardrails/pii';
import { detectInjection } from '../../core/guardrails/injection';
import { deidentify } from '../../core/guardrails/pii';
import type { Rec } from '../../core/warehouse';
import { NEVER_MODEL_READABLE } from './rules';
import type { ToolSpec } from './providers';
import { getDeterministicRecommendations } from './local';

/** The tools a model may call. Provider-neutral: each adapter translates them. */
export const TOOLS: ToolSpec[] = [
  { name: 'query_data_warehouse', description: 'Inspect the data warehouse. Always returns collection names and record counts. Returns record contents only for collections an administrator has allowed for model access (none by default), and only de-identified.', parameters: { type: Type.OBJECT, properties: { collection: { type: Type.STRING, description: 'A collection name, or "all" for counts of every collection' }, query: { type: Type.STRING, description: 'Optional keyword filter (allowed collections only)' }, limit: { type: Type.INTEGER, description: 'Maximum records to return (default 10, at most 20)' } }, required: ['collection'] } },
  { name: 'calculate_school_unit_economics', description: 'Computes illustrative unit economics for a number of primary schools from the inputs given. Inputs left out use stated defaults; treat the result as a draft model, not a sourced figure.', parameters: { type: Type.OBJECT, properties: { activeSchools: { type: Type.INTEGER, description: 'Number of subscribed primary schools' }, monthlyFeeZar: { type: Type.NUMBER, description: 'Monthly subscription fee per school in ZAR (default 4000)' }, llmTokensPerSchoolPerMonth: { type: Type.INTEGER, description: 'Average monthly model tokens per school (default 150000)' }, serverCostPerMonthZar: { type: Type.NUMBER, description: 'Fixed monthly hosting and storage cost in ZAR (default 850)' } }, required: ['activeSchools'] } },
  { name: 'audit_compliance_and_guardrails', description: 'Checks text for personal identifiers, South African ID numbers, instruction-override patterns and cross-border transfer indicators. A screening aid, not legal advice.', parameters: { type: Type.OBJECT, properties: { content: { type: Type.STRING, description: 'Text to check' }, checkPopiaSection72: { type: Type.BOOLEAN, description: 'Also check for cross-border transfer indicators' }, checkStudentPii: { type: Type.BOOLEAN, description: 'Also check for learner identifiers' }, checkSiasTierSafeguards: { type: Type.BOOLEAN, description: 'Reserved' } }, required: ['content'] } },
  { name: 'inspect_department_agent', description: 'Returns a specialist agent contract (purpose, inputs, formats, approvers, framework).', parameters: { type: Type.OBJECT, properties: { agentId: { type: Type.STRING, description: 'The agent id, for example OPS-FIN-01' } }, required: ['agentId'] } },
  { name: 'generate_task_recommendations', description: 'Returns illustrative suggestions, input presets and next steps for an agent task. Presets are placeholders to edit, not facts.', parameters: { type: Type.OBJECT, properties: { agentId: { type: Type.STRING, description: 'The agent id' }, contextSummary: { type: Type.STRING, description: 'Brief context or objective' } }, required: ['agentId'] } },
];
export const TOOL_NAMES: ReadonlySet<string> = new Set(TOOLS.map((t) => t.name));

export interface ToolContext {
  load(): Record<string, readonly Rec[]>;
  /** Collections whose contents a model may see (rule M9). Never includes NEVER_MODEL_READABLE. */
  readable: ReadonlySet<string>;
}

/** Reads OPS_MODEL_READABLE_COLLECTIONS. A name on the never-list stops startup: that is a mistake, not a preference. */
export function readReadable(env: Record<string, string | undefined>): Set<string> {
  const names = (env.OPS_MODEL_READABLE_COLLECTIONS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const never = names.filter((n) => NEVER_MODEL_READABLE.has(n));
  if (never.length) throw new Error(`OPS_MODEL_READABLE_COLLECTIONS may never include: ${never.join(', ')}`);
  const bad = names.filter((n) => !/^[a-z0-9_]{1,64}$/.test(n));
  if (bad.length) throw new Error(`OPS_MODEL_READABLE_COLLECTIONS has an invalid collection name: ${bad.join(', ')}`);
  return new Set(names);
}

/** Only short text and numbers leave a record, so a nested blob or a long free-text field cannot carry bulk data. */
const slim = (r: Rec) => Object.fromEntries(Object.entries(r).filter(([, v]) => typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length <= 200)));

export async function executeTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<Record<string, unknown>> {
  switch (name) {
    case 'query_data_warehouse': {
      const collection = String(args.collection || 'all');
      const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
      const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(Math.floor(args.limit), 20)) : 10;
      const all = ctx.load();
      const counts = Object.fromEntries(Object.entries(all).filter(([c]) => !NEVER_MODEL_READABLE.has(c)).map(([c, v]) => [c, v.length]));
      if (collection === 'all' || !ctx.readable.has(collection)) {
        return { collection, counts, note: collection === 'all' || NEVER_MODEL_READABLE.has(collection) || !(collection in all) ? undefined : 'Contents of this collection are not available to models; only counts are.' };
      }
      const rows = (all[collection] ?? []).map(slim).filter((r) => !query || JSON.stringify(r).toLowerCase().includes(query)).slice(0, limit);
      // De-identify what is allowed through; the hub also scans every tool result before the model sees it.
      const clean = JSON.parse(deidentify(JSON.stringify(rows), ['tool:query_data_warehouse']).text) as unknown[];
      return { collection, counts, records: clean };
    }

      case 'calculate_school_unit_economics': {
        const activeSchools = Number(args.activeSchools) || 1;
        const monthlyFeeZar = Number(args.monthlyFeeZar) || 4000;
        const llmTokens = Number(args.llmTokensPerSchoolPerMonth) || 150000;
        const serverCostZar = Number(args.serverCostPerMonthZar) || 850;

        // Pricing model for Gemini 3.8 Flash: ~$0.10 / 1M input tokens, ~$0.40 / 1M output tokens (blended ~$0.15/1M tokens)
        // USD to ZAR exchange rate estimate: R18.50 per USD
        const usdToZar = 18.50;
        const blendedCostPerTokenUsd = 0.0000002; // $0.20 per 1M tokens
        const tokenCostPerSchoolUsd = llmTokens * blendedCostPerTokenUsd;
        const tokenCostPerSchoolZar = Math.round(tokenCostPerSchoolUsd * usdToZar * 100) / 100;
        const totalLlmCostZar = Math.round(tokenCostPerSchoolZar * activeSchools * 100) / 100;

        const monthlyRevenueZar = activeSchools * monthlyFeeZar;
        const annualRecurringRevenueZar = monthlyRevenueZar * 12;
        const totalDirectCostZar = serverCostZar + totalLlmCostZar;
        const monthlyGrossProfitZar = monthlyRevenueZar - totalDirectCostZar;
        const grossMarginPercent = monthlyRevenueZar > 0 ? Math.round((monthlyGrossProfitZar / monthlyRevenueZar) * 1000) / 10 : 0;
        const breakEvenSchools = Math.ceil(serverCostZar / (monthlyFeeZar - tokenCostPerSchoolZar));

        return {
          modelParameters: {
            activeSchools,
            monthlyFeeZar,
            llmTokensPerSchoolPerMonth: llmTokens,
            serverCostPerMonthZar: serverCostZar,
            region: 'AWS Cape Town (af-south-1) - In-Country Data Residency'
          },
          financialSummary: {
            monthlyRecurringRevenueZar: monthlyRevenueZar,
            annualRecurringRevenueZar: annualRecurringRevenueZar,
            totalDirectCostZar,
            tokenCostPerSchoolZar,
            monthlyGrossProfitZar,
            grossMarginPercent: `${grossMarginPercent}%`,
            breakEvenSchools,
            viabilityStatus: grossMarginPercent > 70 ? 'HIGHLY_VIABLE' : grossMarginPercent > 50 ? 'VIABLE' : 'SUBSIDY_REQUIRED'
          },
          southAfricanSchoolViability: {
            targetQuintile: 'Quintile 4-5 and Independent Primary Schools',
            affordabilityBenchmark: 'R4,000/month covers full multi-user ops & CAPS analytics',
            popiaComplianceSurcharge: 'R0 (Included in base tier with local data residency)'
          }
        };
      }

      case 'audit_compliance_and_guardrails': {
        const content = String(args.content || '');
        const piiIssues = detectPii(content);
        const injectionIssues = detectInjection(content);

        const checkPopia72 = args.checkPopiaSection72 !== false;
        const popia72Violations: string[] = [];

        // Check for cross-border indicators without binding agreements
        const crossBorderKeywords = ['us-east-1', 'openai foreign server', 'unencrypted s3 us', 'eu central cross-border without agreement'];
        for (const kw of crossBorderKeywords) {
          if (content.toLowerCase().includes(kw)) {
            popia72Violations.push(`Cross-border data transfer flagged (${kw}): POPIA Section 72 requires adequate safeguards, binding corporate rules, or explicit consent.`);
          }
        }

        // Check for South African 13-digit ID format
        const saIdRegex = /\b\d{13}\b/g;
        const saIdMatches = content.match(saIdRegex) || [];

        return {
          contentLength: content.length,
          compliant: piiIssues.length === 0 && injectionIssues.length === 0 && popia72Violations.length === 0 && saIdMatches.length === 0,
          piiFindings: piiIssues,
          saIdNumbersFound: saIdMatches.length,
          injectionFindings: injectionIssues,
          popiaSection72Findings: popia72Violations,
          remediationAdvice: [
            ...(piiIssues.length ? ['Strip learner names, cell numbers, and email addresses prior to drafting.'] : []),
            ...(saIdMatches.length ? ['Replace 13-digit SA national ID numbers with pseudonymous learner UUIDs.'] : []),
            ...(popia72Violations.length ? ['Ensure cloud data residency remains within AWS Cape Town (af-south-1).'] : []),
            'Enforce Law 02: Human-in-the-Loop second approver sign-off on all drafted operational documents.'
          ]
        };
      }

      case 'inspect_department_agent': {
        const id = String(args.agentId || '').trim();
        const agent = agentById(id);
        if (!agent) {
          return { error: `Agent '${id}' not found in the 16 Infinite-AI departments.` };
        }
        return {
          id: agent.id,
          name: agent.name,
          purpose: agent.purpose,
          summary: agent.summary,
          framework: agent.framework,
          inputs: agent.inputs.map((i) => ({ key: i.key, label: i.label, kind: i.kind, required: i.required })),
          formats: agent.formats,
          secondApprover: agent.secondApprover,
          lawsCovered: ['Law 01 (De-identification)', 'Law 02 (Human Ratification)', 'Law 03 (POPIA s72 Residency)']
        };
      }

      case 'generate_task_recommendations': {
        const id = String(args.agentId || '').trim();
        const agent = agentById(id);
        if (!agent) return { error: `Agent '${id}' not found.` };
        const recs = getDeterministicRecommendations(agent);
        return { ...recs, agentId: id };
      }

      default:
        return { error: `Unknown tool: ${name}` };
  }
}
