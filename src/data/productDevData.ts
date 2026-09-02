import { RepoConnection, ProductEpic, AutonomousTask } from '../types';

export const INITIAL_REPO_CONNECTION: RepoConnection = {
  opsRepo: {
    name: 'infinite-ai/business-operations',
    url: 'https://github.com/infinite-ai/business-operations',
    branch: 'main',
    commitHash: 'a8f912c',
    lastCommitMsg: 'chore(gov): verify Stage 02 Merkle ledger hash chain & ratify bylaws',
    status: 'CONNECTED',
    role: 'Infinite-AI Business Operations: Governance, L0-L4 Brain & 46 AI-Agent Orchestration'
  },
  productRepo: {
    name: 'Sarah-JaneHarding/infinite-ai-ecosystem',
    url: 'https://github.com/Sarah-JaneHarding/infinite-ai-ecosystem',
    branch: 'main',
    commitHash: 'e7b419a',
    lastCommitMsg: 'feat(core): initialize Infinite-AI Education Ecosystem kernel & diagnostic engine v2.4',
    status: 'CONNECTED',
    role: 'Infinite-AI Education Ecosystem — Core Product Repository, Learning Engine, APIs & Microservices'
  },
  syncStatus: 'CONNECTED',
  twoWaySyncActive: true,
  lastSynced: 'Just now',
  syncLatencyMs: 38,
  webhookUrl: 'https://ops.infinite-ai.internal/api/v1/webhooks/github-bridge',
  secretConfigured: true,
  stats: {
    openPrs: 5,
    branchesCount: 14,
    testSuitesPassing: 48,
    pendingApprovals: 2,
    autonomousCommitsToday: 19
  }
};

export const INITIAL_EPICS: ProductEpic[] = [
  {
    id: 'EPIC-EDU-01',
    title: 'Adaptive Learning & Diagnostic Engine v2.4',
    status: 'IN_PROGRESS',
    leadAgent: 'A01 · Chief Product Officer',
    collaboratingAgents: ['A03 · Software Architect', 'A04 · Full-Stack Lead', 'A06 · QA Automation'],
    progress: 78,
    targetRelease: 'Infinite-AI Education Ecosystem v2.4.0-rc1',
    description: 'Dynamic item difficulty calibrator with real-time student competency graph updates and sub-50ms latency in af-south-1.',
    featuresCount: 6
  },
  {
    id: 'EPIC-EDU-02',
    title: 'POPIA Section 72 Data Egress & Pseudonymization Firewall',
    status: 'IN_PROGRESS',
    leadAgent: 'A11 · Security & Compliance Auditor',
    collaboratingAgents: ['A03 · Software Architect', 'A05 · DevOps & Cloud Lead'],
    progress: 92,
    targetRelease: 'Infinite-AI Education Ecosystem v2.4.0-rc1',
    description: 'Cryptographic student PII masking prior to vectorization or external model inference, strictly enforced in all API gateways.',
    featuresCount: 4
  },
  {
    id: 'EPIC-EDU-03',
    title: 'Real-Time Multi-Tenant Curriculum Assessment API',
    status: 'VALIDATION',
    leadAgent: 'A03 · Principal Software Architect',
    collaboratingAgents: ['A04 · Full-Stack Lead', 'A06 · QA Automation'],
    progress: 85,
    targetRelease: 'Infinite-AI Education Ecosystem v2.4.0',
    description: 'Postgres row-level security (RLS) partition scheme ensuring school/tenant curriculum data isolation with zero bleed.',
    featuresCount: 5
  },
  {
    id: 'EPIC-EDU-04',
    title: 'Offline-First SQLite Edge Synchronization for Rural Schools',
    status: 'PLANNED',
    leadAgent: 'A04 · Full-Stack Development Lead',
    collaboratingAgents: ['A05 · DevOps & Cloud Lead', 'A12 · Operations Specialist'],
    progress: 35,
    targetRelease: 'Infinite-AI Education Ecosystem v2.5.0-alpha',
    description: 'CRDT-based synchronization protocol for resource-constrained schools with intermittent connectivity.',
    featuresCount: 7
  },
  {
    id: 'EPIC-EDU-05',
    title: 'Infinite Brain L3 Procedural Integration SDK',
    status: 'COMPLETED',
    leadAgent: 'A03 · Principal Software Architect',
    collaboratingAgents: ['A01 · Chief Product Officer', 'A06 · QA Automation'],
    progress: 100,
    targetRelease: 'Infinite-AI Education Ecosystem v2.3.9-stable',
    description: 'Direct bi-directional hook allowing Infinite-AI Education Ecosystem product code to ingest procedural SOPs and guidelines from Operations Brain.',
    featuresCount: 3
  }
];

export const INITIAL_AUTONOMOUS_TASKS: AutonomousTask[] = [
  {
    id: 'TASK-EDU-204',
    title: 'Implement POPIA Egress Sanitizer Middleware in API Router',
    epicId: 'EPIC-EDU-02',
    repo: 'Sarah-JaneHarding/infinite-ai-ecosystem',
    branch: 'feat/edu-popia-egress-sanitizer',
    assignedAgent: {
      id: 'A11',
      name: 'Sentinel-Auditor',
      role: 'Security & Compliance Auditor',
      department: 'Security & Compliance'
    },
    collaboratingAgents: ['A03 · Principal Architect', 'A06 · QA Automation'],
    status: 'AWAITING_APPROVAL',
    priority: 'CRITICAL',
    description: 'Intercept outgoing model payloads and inspect for South African ID numbers, phone numbers, and learner names. Replaces PII with salted SHA-256 tokens before gateway forwarding.',
    diffSummary: {
      filesChanged: 4,
      additions: 142,
      deletions: 18,
      files: [
        'packages/api/src/middleware/popia-egress.ts',
        'packages/api/src/router/assessment.ts',
        'packages/security/src/pii-masker.ts',
        'packages/security/test/popia-egress.spec.ts'
      ]
    },
    testResults: {
      totalTests: 42,
      passed: 42,
      failed: 0,
      durationMs: 384,
      coveragePct: 98.4,
      suites: [
        { name: 'Unit: PII Tokenization Regex & Salt', status: 'PASS', tests: 18, duration: '94ms' },
        { name: 'Integration: API Gateway Egress Interceptor', status: 'PASS', tests: 14, duration: '180ms' },
        { name: 'Security: Red-Team Injection Probe Suite', status: 'PASS', tests: 10, duration: '110ms' }
      ],
      securityScan: {
        status: 'PASS',
        piiChecked: true,
        popiaCompliant: true,
        details: 'Verified against POPIA Section 72 cross-border conditions. 0 unmasked entities detected.'
      }
    },
    approvalCheck: {
      required: true,
      status: 'PENDING',
      approverRole: 'Sarah-Jane (CEO) / Lead Security Officer',
      gatedReason: 'Law 02 (Human-in-the-Loop) & POPIA statutory compliance sign-off required prior to production branch merge.'
    },
    releaseVersion: 'Infinite-AI Education Ecosystem v2.4.0-rc1',
    createdAt: '2026-09-02 10:15 UTC',
    updatedAt: '2026-09-02 12:45 UTC',
    codeDiff: `diff --git a/packages/api/src/middleware/popia-egress.ts b/packages/api/src/middleware/popia-egress.ts
new file mode 100644
index 0000000..f4a812b
--- /dev/null
+++ b/packages/api/src/middleware/popia-egress.ts
@@ -0,0 +1,38 @@
+import { Request, Response, NextFunction } from 'express';
+import { maskSouthAfricanPii, verifyProvenanceStamp } from '@infinite-ai-ecosystem/security';
+
+export function popiaEgressGuard(req: Request, res: Response, next: NextFunction) {
+  const originTenant = req.headers['x-tenant-id'] as string;
+  if (!originTenant) {
+    return res.status(400).json({ error: 'Missing tenant isolation header' });
+  }
+
+  // Law 01: The Membrane - zero raw PII egress permitted
+  const originalJson = res.json;
+  res.json = function (body: any) {
+    const sanitized = maskSouthAfricanPii(body, {
+      saltPrefix: process.env.PII_SALT_SECRET || 'popia_l5_salt',
+      stripNationalId: true,
+      pseudonymizeLearnerName: true
+    });
+    res.setHeader('X-POPIA-Compliance', 'Passed-Section-72');
+    res.setHeader('X-Provenance-Stamp', verifyProvenanceStamp(originTenant));
+    return originalJson.call(this, sanitized);
+  };
+
+  next();
+}`
  },
  {
    id: 'TASK-EDU-205',
    title: 'Adaptive Diagnostic Engine: Dynamic Difficulty IRT Algorithm',
    epicId: 'EPIC-EDU-01',
    repo: 'Sarah-JaneHarding/infinite-ai-ecosystem',
    branch: 'feat/edu-irt-diagnostic-v2',
    assignedAgent: {
      id: 'A04',
      name: 'Titan-FullStack',
      role: 'Full-Stack Development Lead',
      department: 'Software Engineering'
    },
    collaboratingAgents: ['A03 · Principal Architect', 'A01 · Chief Product Officer'],
    status: 'AWAITING_APPROVAL',
    priority: 'HIGH',
    description: 'Implements Item Response Theory (IRT 3PL) calculating learner ability theta in real-time, selecting optimal next questions with sub-30ms evaluation.',
    diffSummary: {
      filesChanged: 5,
      additions: 218,
      deletions: 34,
      files: [
        'packages/engine/src/irt/adaptive-calibrator.ts',
        'packages/engine/src/irt/theta-estimator.ts',
        'packages/engine/test/irt-calibration.spec.ts',
        'packages/db/schema/competency-matrix.sql',
        'packages/api/src/controllers/diagnostics.ts'
      ]
    },
    testResults: {
      totalTests: 56,
      passed: 56,
      failed: 0,
      durationMs: 440,
      coveragePct: 99.1,
      suites: [
        { name: 'Unit: 3-Parameter Logistic Theta Estimator', status: 'PASS', tests: 24, duration: '120ms' },
        { name: 'Integration: Next Question Recommendation API', status: 'PASS', tests: 20, duration: '190ms' },
        { name: 'Performance: 1,000 Concurrent Student Evaluations', status: 'PASS', tests: 12, duration: '130ms' }
      ],
      securityScan: {
        status: 'PASS',
        piiChecked: true,
        popiaCompliant: true,
        details: 'Static analysis passed. Algorithmic bias metrics within South African curriculum benchmark tolerances.'
      }
    },
    approvalCheck: {
      required: true,
      status: 'PENDING',
      approverRole: 'Sarah-Jane (CEO) / Product Architect',
      gatedReason: 'Core pedagogical scoring algorithm update. Requires executive countersignature under Law 02.'
    },
    releaseVersion: 'Infinite-AI Education Ecosystem v2.4.0-rc1',
    createdAt: '2026-09-02 08:30 UTC',
    updatedAt: '2026-09-02 13:10 UTC',
    codeDiff: `diff --git a/packages/engine/src/irt/adaptive-calibrator.ts b/packages/engine/src/irt/adaptive-calibrator.ts
new file mode 100644
index 0000000..9c381da
--- /dev/null
+++ b/packages/engine/src/irt/adaptive-calibrator.ts
@@ -0,0 +1,32 @@
+export interface ItemParameters {
+  difficulty_b: number; // Item difficulty (-3.0 to +3.0)
+  discrimination_a: number; // Discrimination slope (>0.5)
+  guessing_c: number; // Pseudo-chance guessing parameter (0 to 0.3)
+}
+
+export function calculateProbability3PL(theta: number, item: ItemParameters): number {
+  const { difficulty_b, discrimination_a, guessing_c } = item;
+  const expFactor = Math.exp(1.7 * discrimination_a * (theta - difficulty_b));
+  return guessing_c + (1 - guessing_c) * (expFactor / (1 + expFactor));
+}
+
+export function estimateLearnerTheta(responses: { correct: boolean; item: ItemParameters }[]): number {
+  let theta = 0.0; // Initial prior
+  // Newton-Raphson maximum likelihood convergence
+  for (let iter = 0; iter < 10; iter++) {
+    let numerator = 0;
+    let denominator = 0;
+    for (const { correct, item } of responses) {
+      const p = calculateProbability3PL(theta, item);
+      const w = 1.7 * item.discrimination_a * (1 - p);
+      numerator += (correct ? 1 : 0) - p;
+      denominator += w * p;
+    }
+    const delta = numerator / (denominator + 1e-6);
+    theta += delta;
+    if (Math.abs(delta) < 0.01) break;
+  }
+  return Math.min(3.0, Math.max(-3.0, theta));
+}`
  },
  {
    id: 'TASK-EDU-206',
    title: 'Automated Playwright E2E Test Suite for Classroom Assessment',
    epicId: 'EPIC-EDU-03',
    repo: 'Sarah-JaneHarding/infinite-ai-ecosystem',
    branch: 'feat/edu-playwright-e2e-classroom',
    assignedAgent: {
      id: 'A06',
      name: 'Vanguard-QA',
      role: 'QA & Testing Automation Lead',
      department: 'Software Engineering'
    },
    collaboratingAgents: ['A04 · Full-Stack Lead', 'A05 · DevOps & Cloud Lead'],
    status: 'TESTING',
    priority: 'MEDIUM',
    description: 'Full end-to-end regression automation covering student login, question loading, answer submission, network disconnect handling, and gradebook sync.',
    diffSummary: {
      filesChanged: 6,
      additions: 310,
      deletions: 12,
      files: [
        'tests/e2e/classroom-assessment.spec.ts',
        'tests/e2e/network-offline-recovery.spec.ts',
        'tests/fixtures/mock-tenant.json',
        'playwright.config.ts'
      ]
    },
    testResults: {
      totalTests: 38,
      passed: 38,
      failed: 0,
      durationMs: 1250,
      coveragePct: 94.7,
      suites: [
        { name: 'E2E: Single-Sign-On & Multi-Tenant Routing', status: 'PASS', tests: 12, duration: '350ms' },
        { name: 'E2E: Low-Bandwidth Network Drop & Reconnect', status: 'PASS', tests: 14, duration: '520ms' },
        { name: 'E2E: Teacher Real-time Proctor Dashboard', status: 'PASS', tests: 12, duration: '380ms' }
      ],
      securityScan: {
        status: 'PASS',
        piiChecked: true,
        popiaCompliant: true,
        details: 'Zero mock leakages in test fixtures.'
      }
    },
    approvalCheck: {
      required: true,
      status: 'PENDING',
      approverRole: 'QA Lead / Tech Lead',
      gatedReason: 'Automated CI test suite pass verification before branch promotion.'
    },
    releaseVersion: 'Infinite-AI Education Ecosystem v2.4.0-rc1',
    createdAt: '2026-09-02 11:20 UTC',
    updatedAt: '2026-09-02 13:25 UTC'
  },
  {
    id: 'TASK-EDU-207',
    title: 'Multi-Tenant Row-Level Security Migration for Postgres in af-south-1',
    epicId: 'EPIC-EDU-03',
    repo: 'Sarah-JaneHarding/infinite-ai-ecosystem',
    branch: 'feat/edu-postgres-rls-tenant-guard',
    assignedAgent: {
      id: 'A03',
      name: 'Nexus-Architect',
      role: 'Principal Software Architect',
      department: 'Software Engineering'
    },
    collaboratingAgents: ['A05 · DevOps Lead', 'A11 · Security Auditor'],
    status: 'MERGED',
    priority: 'CRITICAL',
    description: 'Database migration enforcing strict Postgres RLS on all assessment, student, and teacher tables using current_setting(app.current_tenant_id). Enforces Law 04.',
    diffSummary: {
      filesChanged: 3,
      additions: 86,
      deletions: 8,
      files: [
        'packages/db/migrations/20260902_enforce_tenant_rls.sql',
        'packages/db/src/connection.ts',
        'packages/db/test/rls-bleed.spec.ts'
      ]
    },
    testResults: {
      totalTests: 32,
      passed: 32,
      failed: 0,
      durationMs: 290,
      coveragePct: 100.0,
      suites: [
        { name: 'Security: Cross-Tenant Data Access Exploit Tests', status: 'PASS', tests: 20, duration: '180ms' },
        { name: 'Migration: Up/Down Consistency Check', status: 'PASS', tests: 12, duration: '110ms' }
      ],
      securityScan: {
        status: 'PASS',
        piiChecked: true,
        popiaCompliant: true,
        details: 'Audit verified. Cross-tenant leakage impossible at SQL engine level.'
      }
    },
    approvalCheck: {
      required: true,
      status: 'APPROVED',
      approverRole: 'Sarah-Jane (CEO)',
      signedBy: 'Sarah-Jane (CEO)',
      signedAt: '2026-09-02 09:14 UTC',
      signatureHash: 'sha256:7f4c91b2e817a02c9183491f0a827419e083c21a47b8e192',
      comments: 'Statutory compliance confirmed. RLS migration approved for staging & production.',
      gatedReason: 'Law 04 (Tenant Isolation) requires cryptographic confirmation before migration run.'
    },
    releaseVersion: 'Infinite-AI Education Ecosystem v2.3.9-stable',
    createdAt: '2026-09-01 14:00 UTC',
    updatedAt: '2026-09-02 09:15 UTC'
  },
  {
    id: 'TASK-EDU-208',
    title: 'Autonomous Circuit Breaker for Model Gateway with Failover to Claude 3.5 Sonnet',
    epicId: 'EPIC-EDU-01',
    repo: 'Sarah-JaneHarding/infinite-ai-ecosystem',
    branch: 'feat/edu-gateway-circuit-breaker',
    assignedAgent: {
      id: 'A05',
      name: 'Aegis-DevOps',
      role: 'DevOps & Cloud Infrastructure Lead',
      department: 'DevOps & Cloud'
    },
    collaboratingAgents: ['A03 · Principal Architect'],
    status: 'AUTONOMOUS_DEV',
    priority: 'HIGH',
    description: 'Wraps all AI inference requests in resilience circuit breaker. Automatically fails over from primary model to fallback endpoint within 250ms on HTTP 429/503.',
    diffSummary: {
      filesChanged: 3,
      additions: 110,
      deletions: 15,
      files: [
        'packages/ai/src/gateway/circuit-breaker.ts',
        'packages/ai/src/gateway/model-router.ts',
        'packages/ai/test/circuit-breaker-failover.spec.ts'
      ]
    },
    testResults: {
      totalTests: 18,
      passed: 18,
      failed: 0,
      durationMs: 210,
      coveragePct: 96.2,
      suites: [
        { name: 'Unit: Circuit Breaker State Transition (Closed/Open/Half-Open)', status: 'PASS', tests: 10, duration: '90ms' },
        { name: 'Integration: Zero-Downtime Failover Probe', status: 'PASS', tests: 8, duration: '120ms' }
      ],
      securityScan: {
        status: 'PASS',
        piiChecked: true,
        popiaCompliant: true,
        details: 'Encrypted token telemetry active. No API keys logged in error payloads.'
      }
    },
    approvalCheck: {
      required: true,
      status: 'PENDING',
      approverRole: 'DevOps Lead / Architect',
      gatedReason: 'Infrastructure routing parameter change requires review.'
    },
    releaseVersion: 'Infinite-AI Education Ecosystem v2.4.0-rc1',
    createdAt: '2026-09-02 12:00 UTC',
    updatedAt: '2026-09-02 13:30 UTC'
  }
];

