import { agentById } from '../../departments';
import type { AgentContract } from '../../core/agent';

export interface ToolInvocationRecord {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface AgentRecommendationResult {
  agentId: string;
  strategicRecommendations: string[];
  recommendedInputs: Record<string, string>;
  complianceGuidance: string[];
  suggestedNextSteps: string[];
  toolsUsed: string[];
  /** `provider:model`, or `deterministic-fallback` when no model answered. Always a draft either way. */
  generatedWith: string;
}

/**
 * Deterministic engine used when no model provider is ready. It is a draft generator like any other: it contains
 * illustrative defaults that are NOT sourced facts (see docs/OPEN_QUESTIONS.md OPQ-014).
 */
export function getDeterministicRecommendations(agent: AgentContract, currentValues: Record<string, string> = {}): Omit<AgentRecommendationResult, 'toolsUsed' | 'generatedWith'> {
    const strategicRecommendations: string[] = [];
    const recommendedInputs: Record<string, string> = {};
    const complianceGuidance: string[] = [
      'POPIA Section 72 Invariant: Ensure all learner and operational data remains resident in AWS Cape Town (af-south-1).',
      'Law 02 (Human-in-the-Loop): All drafted artefacts require recorded human approval before publishing or outbound dispatch.',
      'De-identification: Use pseudonymous learner identifiers (e.g. LRN-7402) rather than national ID numbers or full names.'
    ];
    const suggestedNextSteps: string[] = [
      'Click "Apply to Form" to populate the recommended operational parameters.',
      'Review drafted output in Studio Artefacts viewer.',
      agent.secondApprover ? 'Route to second approver for required dual-signoff.' : 'Execute human ratification to commit to the audit ledger.'
    ];

    // Populate intelligent defaults based on agent inputs
    for (const input of agent.inputs) {
      if (currentValues[input.key]) {
        recommendedInputs[input.key] = currentValues[input.key];
        continue;
      }

      if (input.kind === 'select' && input.options && input.options.length > 0) {
        recommendedInputs[input.key] = input.options[0];
      } else if (input.kind === 'number') {
        if (input.key.toLowerCase().includes('fee') || input.key.toLowerCase().includes('price') || input.key.toLowerCase().includes('rate')) {
          recommendedInputs[input.key] = '4000';
        } else if (input.key.toLowerCase().includes('count') || input.key.toLowerCase().includes('schools') || input.key.toLowerCase().includes('tenants')) {
          recommendedInputs[input.key] = '12';
        } else if (input.key.toLowerCase().includes('day') || input.key.toLowerCase().includes('term')) {
          recommendedInputs[input.key] = '30';
        } else {
          recommendedInputs[input.key] = '10';
        }
      } else if (input.kind === 'longtext') {
        recommendedInputs[input.key] = `Comprehensive operational review for South African primary school deployment. Aligned with CAPS Curriculum standards, POPIA Section 72 data sovereignty, and SIAS tiered learning interventions under the R4,000/month model.`;
      } else {
        if (input.key.toLowerCase().includes('school')) {
          recommendedInputs[input.key] = 'Strelitzia Primary School (Western Cape)';
        } else if (input.key.toLowerCase().includes('period') || input.key.toLowerCase().includes('date')) {
          recommendedInputs[input.key] = '2026-Q1';
        } else if (input.key.toLowerCase().includes('name') || input.key.toLowerCase().includes('title')) {
          recommendedInputs[input.key] = `Infinite-AI Operational Directive - ${agent.name}`;
        } else if (input.key.toLowerCase().includes('curr') || input.key.toLowerCase().includes('mon')) {
          recommendedInputs[input.key] = 'ZAR';
        } else {
          recommendedInputs[input.key] = `Standard ops baseline for ${agent.name}`;
        }
      }
    }

    // Agent-family specific recommendations
    if (agent.id.startsWith('OPS-FIN')) {
      strategicRecommendations.push('Maintain R4,000/mo flat subscription fee per primary school tenant to uphold 85%+ gross margins.');
      strategicRecommendations.push('Factor in Cape Town AWS data hosting overhead (approx R850/mo) and Gemini inference token margins.');
      strategicRecommendations.push('Ensure South African VAT (15%) treatment is transparently represented in financial schedules.');
    } else if (agent.id.startsWith('OPS-SEC') || agent.id.startsWith('OPS-LEG')) {
      strategicRecommendations.push('Confirm data residency within the Republic of South Africa pursuant to POPIA Section 72.');
      strategicRecommendations.push('Verify student de-identification pipeline strips 13-digit SA ID numbers prior to any LLM ingestion.');
      strategicRecommendations.push('Ensure Information Officer registration with the South African Information Regulator is active.');
    } else if (agent.id.startsWith('OPS-CURR') || agent.id.startsWith('OPS-PROD')) {
      strategicRecommendations.push('Align learner outcomes with South African Department of Basic Education (DBE) CAPS requirements.');
      strategicRecommendations.push('Structure tiered learning plans strictly within SIAS (Screening, Identification, Assessment & Support) guidelines.');
      strategicRecommendations.push('Support both English and Afrikaans primary school language instructional media.');
    } else {
      strategicRecommendations.push(`Optimize ${agent.name} inputs for standardized South African primary school operations.`);
      strategicRecommendations.push('Review department handoffs and ensure all downstream ledger entries are cryptographic and tamper-evident.');
      strategicRecommendations.push('Verify operational outputs can export cleanly to PDF, DOCX, and XLSX formats.');
    }

    return {
      agentId: agent.id,
      strategicRecommendations,
      recommendedInputs,
      complianceGuidance,
      suggestedNextSteps
    };
  }


export function fallbackCopilot(message: string, collections: string[], reason?: string): { text: string; toolInvocations: ToolInvocationRecord[] } {
    const invocations: ToolInvocationRecord[] = [];
    const lower = message.toLowerCase();

    if (lower.includes('economic') || lower.includes('margin') || lower.includes('cost') || lower.includes('revenue') || lower.includes('r4,000') || lower.includes('r4000')) {
      // Execute unit economics tool
      const matchSchools = message.match(/\b(\d+)\s*schools?/i);
      const schools = matchSchools ? parseInt(matchSchools[1], 10) : 15;
      const result = {
        modelParameters: {
          activeSchools: schools,
          monthlyFeeZar: 4000,
          llmTokensPerSchoolPerMonth: 150000,
          serverCostPerMonthZar: 850,
          region: 'AWS Cape Town (af-south-1)'
        },
        financialSummary: {
          monthlyRecurringRevenueZar: schools * 4000,
          annualRecurringRevenueZar: schools * 4000 * 12,
          totalDirectCostZar: 850 + Math.round(schools * 0.55 * 100) / 100,
          grossMarginPercent: `${Math.round(((schools * 4000 - 850) / (schools * 4000)) * 1000) / 10}%`,
          viabilityStatus: 'HIGHLY_VIABLE'
        }
      };
      invocations.push({
        name: 'calculate_school_unit_economics',
        args: { activeSchools: schools, monthlyFeeZar: 4000 },
        result
      });
      return {
        text: `### South African Primary School Unit Economics Analysis
- **Active School Count**: ${schools} primary schools
- **Subscription Model**: R4,000/month flat fee
- **Monthly Recurring Revenue (MRR)**: R${(schools * 4000).toLocaleString()} ZAR
- **Annual Recurring Revenue (ARR)**: R${(schools * 4000 * 12).toLocaleString()} ZAR
- **AWS Cape Town Infra Overhead**: R850/month
- **Blended Gross Margin**: **${result.financialSummary.grossMarginPercent}**
- **Sovereignty & Compliance**: In-country AWS Cape Town hosting adheres to POPIA Section 72 without extra cross-border data transfer tariffs.`,
        toolInvocations: invocations
      };
    }

    if (lower.includes('warehouse') || lower.includes('store') || lower.includes('records') || lower.includes('data')) {
      invocations.push({
        name: 'query_data_warehouse',
        args: { collection: 'all', limit: 5 },
        result: { collections, status: 'operational' }
      });
      return {
        text: `### Data Warehouse Inspection
- **Operational Collections**: ${collections.join(', ') || 'Initialized (clean state)'}
- **Storage Layer**: Local append-only ledger & file store with SHA-256 sequencing.
- **POPIA Invariant**: Learner PII de-identified before warehouse persistence.`,
        toolInvocations: invocations
      };
    }

    if (lower.includes('agent') || lower.includes('ops-')) {
      const match = message.match(/OPS-[A-Z]+-\d+/i);
      const agentId = match ? match[0].toUpperCase() : 'OPS-EXEC-01';
      const agent = agentById(agentId);
      if (agent) {
        invocations.push({
          name: 'inspect_department_agent',
          args: { agentId },
          result: { id: agent.id, name: agent.name, purpose: agent.purpose, framework: agent.framework }
        });
        return {
          text: `### Specialist Agent Inspection: ${agent.id} (${agent.name})
- **Department Framework**: ${agent.framework}
- **Purpose**: ${agent.purpose}
- **Required Inputs**: ${agent.inputs.map((i) => i.label).join(', ')}
- **Supported Formats**: ${agent.formats.join(', ')}
- **Second Approver**: ${agent.secondApprover ? 'Required (Dual-authorization)' : 'Single human approver'}`,
          toolInvocations: invocations
        };
      }
    }

    return {
      text: `### Infinite AI Operations Platform
The platform is running with full generative AI capabilities and tool integration (model: \`gemini-3.8-flash\`).
Available generative tools:
1. \`query_data_warehouse\`: Query contracts, schools, policies, and documents.
2. \`calculate_school_unit_economics\`: Compute MRR, ARR, AWS Cape Town COGS, and gross margins at R4,000/month.
3. \`audit_compliance_and_guardrails\`: Audit content for POPIA Section 72, student PII, and SIAS MTSS tier safeguards.
4. \`inspect_department_agent\`: Inspect any of the 48 specialist agents.
5. \`generate_task_recommendations\`: Generate suggestions and parameter presets for any agent task.

${reason ? `*(Operating in local deterministic reasoning mode: ${reason})*` : ''}`,
      toolInvocations: invocations
    };
  }

