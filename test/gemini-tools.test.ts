import { describe, expect, it } from 'vitest';
import { GeminiOperationsService, GEMINI_OPERATIONS_TOOLS } from '../src/server/geminiService';
import { FileStore } from '../src/server/fileAdapter';
import { agentById } from '../src/departments';

describe('Gemini Operations Service & Generative AI Tools', () => {
  const store = new FileStore();
  const service = new GeminiOperationsService();

  it('exposes the 5 operational tools with complete function schemas', () => {
    expect(GEMINI_OPERATIONS_TOOLS).toHaveLength(5);
    const names = GEMINI_OPERATIONS_TOOLS.map((t) => t.name);
    expect(names).toContain('query_data_warehouse');
    expect(names).toContain('calculate_school_unit_economics');
    expect(names).toContain('audit_compliance_and_guardrails');
    expect(names).toContain('inspect_department_agent');
    expect(names).toContain('generate_task_recommendations');
  });

  it('executes calculate_school_unit_economics tool with R4,000/mo primary school baseline', async () => {
    const result = await service.executeTool('calculate_school_unit_economics', {
      activeSchools: 15,
      monthlyFeeZar: 4000
    }, store) as {
      financialSummary: {
        monthlyRecurringRevenueZar: number;
        annualRecurringRevenueZar: number;
        grossMarginPercent: string;
        viabilityStatus: string;
      };
      southAfricanSchoolViability: {
        affordabilityBenchmark: string;
      };
    };

    expect(result.financialSummary.monthlyRecurringRevenueZar).toBe(60000);
    expect(result.financialSummary.annualRecurringRevenueZar).toBe(720000);
    expect(result.financialSummary.grossMarginPercent).toMatch(/%/);
    expect(result.financialSummary.viabilityStatus).toBe('HIGHLY_VIABLE');
    expect(result.southAfricanSchoolViability.affordabilityBenchmark).toContain('R4,000/month');
  });

  it('executes audit_compliance_and_guardrails tool detecting learner PII and cross-border risks', async () => {
    const badContent = 'Learner Sipho Ndlovu with ID 0801015023087 was routed to us-east-1 without consent';
    const auditResult = await service.executeTool('audit_compliance_and_guardrails', {
      content: badContent,
      checkPopiaSection72: true,
      checkStudentPii: true
    }, store) as {
      compliant: boolean;
      saIdNumbersFound: number;
      popiaSection72Findings: string[];
      remediationAdvice: string[];
    };

    expect(auditResult.compliant).toBe(false);
    expect(auditResult.saIdNumbersFound).toBe(1);
    expect(auditResult.popiaSection72Findings.length).toBeGreaterThan(0);
    expect(auditResult.remediationAdvice.length).toBeGreaterThan(0);
  });

  it('executes inspect_department_agent tool returning agent details', async () => {
    const agentResult = await service.executeTool('inspect_department_agent', {
      agentId: 'OPS-FIN-01'
    }, store) as {
      id: string;
      name: string;
      inputs: Array<{ key: string }>;
    };

    expect(agentResult.id).toBe('OPS-FIN-01');
    expect(agentResult.name).toBeDefined();
    expect(agentResult.inputs.length).toBeGreaterThan(0);
  });

  it('generates agent suggestions and recommendations for any agent task', async () => {
    const agent = agentById('OPS-FIN-01')!;
    expect(agent).toBeDefined();

    const recs = await service.getAgentRecommendations(agent, {}, store);
    expect(recs.agentId).toBe('OPS-FIN-01');
    expect(recs.strategicRecommendations.length).toBeGreaterThan(0);
    expect(recs.complianceGuidance.length).toBeGreaterThan(0);
    expect(recs.suggestedNextSteps.length).toBeGreaterThan(0);
    expect(recs.recommendedInputs).toBeDefined();

    // Check that every input of the agent has a recommended value
    for (const input of agent.inputs) {
      expect(recs.recommendedInputs[input.key]).toBeDefined();
    }
  });

  it('runs copilot with tool usage in deterministic mode when no API key is provided', async () => {
    const response = await service.runCopilot('What are the school unit economics for 20 schools?', [], store);
    expect(response.text).toContain('Unit Economics');
    expect(response.toolInvocations.length).toBeGreaterThan(0);
    expect(response.toolInvocations[0].name).toBe('calculate_school_unit_economics');
  });
});
