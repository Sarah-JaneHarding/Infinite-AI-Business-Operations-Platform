export type NavTab = 
  | 'command' 
  | 'brain' 
  | 'agents'
  | 'website'
  | 'product'
  | 'dev' 
  | 'gateway' 
  | 'infra' 
  | 'gov' 
  | 'crm' 
  | 'integrations' 
  | 'docs';

export interface StageGate {
  id: string;
  name: string;
  dependsOn: string;
  status: 'PASS' | 'GAP' | 'PROG' | 'BLOCK';
  summary: string;
  details: string;
  command: string;
  testCount: number;
}

export interface OpenQuestion {
  id: string;
  question: string;
  blocks: string;
  owner: string;
  status: 'OPEN' | 'CRITICAL' | 'BLOCKED' | 'DECISION' | 'PROG' | 'DONE' | 'DEFERRED';
}

export interface RiskItem {
  id: string;
  title: string;
  likelihood: number; // 1-5
  impact: number;     // 1-5
  mitigation: string;
  owner: string;
  category: 'Compliance' | 'Infrastructure' | 'Financial' | 'Operational' | 'Security';
}

export interface BusinessModule {
  id: string;
  code: string;
  name: string;
  originalRef: string;
  purpose: string;
  habitatName: string;
  habitatIcon: string;
  accentColor: string;
  agents: string[];
  metrics: { label: string; value: string; change?: string }[];
}

export interface DealItem {
  id: string;
  client: string;
  contact: string;
  stage: 'PROSPECT' | 'BRIEFED' | 'DEMO' | 'PILOT GATED' | 'PILOT ACTIVE' | 'EXPANDED';
  tier: 'Pilot Seed' | 'Standard' | 'Enterprise';
  annualValueZar: number;
  nextStep: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: 'PLAN' | 'AUDIT' | 'SPEC' | 'POLICY' | 'SOP' | 'PLAYBOOK' | 'LOG';
  version: string;
  owner: string;
  status: 'LIVE' | 'REVIEW' | 'DRAFT' | 'RATIFIED' | 'NEEDS_SIGNATURE';
  lastUpdated: string;
}

export interface DagNode {
  id: string;
  name: string;
  type: 'ingest' | 'guardrail' | 'gateway' | 'hitl' | 'ledger';
  status: 'idle' | 'running' | 'completed' | 'waiting_approval' | 'failed';
  result?: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  department: string;
  role: string;
  skills: string[];
  responsibilities: string[];
  guardrails: string[];
  permissions: {
    read: string[];
    write: string[];
    execute: string[];
  };
  hitl_gates: string[];
  telemetry: {
    logging: boolean;
    versioning?: boolean;
    lastActive?: string;
    tasksHandled?: number;
  };
}

export interface WebPageItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  version: string;
  lastModified: string;
  author: string;
  isSystem?: boolean;
}

export interface IntegrationTool {
  id: string;
  name: string;
  category: 'Knowledge' | 'Collaboration' | 'Project' | 'Code' | 'Productivity' | 'Payments' | 'CRM' | 'Automation' | 'Cloud';
  tier: 'Free Tier' | 'Pro Upgradeable' | 'Enterprise';
  status: 'Connected' | 'Ready' | 'Configuring';
  iconName: string;
  description: string;
  usageQuota: string;
  webhookUrl: string;
  lastSynced: string;
}

export interface RepoDetails {
  name: string;
  url?: string;
  branch: string;
  commitHash: string;
  lastCommitMsg: string;
  status: 'CONNECTED' | 'SYNCING' | 'ERROR' | 'OFFLINE';
  role: string;
}

export interface RepoConnection {
  opsRepo: RepoDetails;
  productRepo: RepoDetails;
  syncStatus: 'CONNECTED' | 'SYNCING' | 'ERROR' | 'OFFLINE';
  twoWaySyncActive: boolean;
  lastSynced: string;
  syncLatencyMs: number;
  webhookUrl: string;
  secretConfigured: boolean;
  stats: {
    openPrs: number;
    branchesCount: number;
    testSuitesPassing: number;
    pendingApprovals: number;
    autonomousCommitsToday: number;
  };
}

export interface ProductEpic {
  id: string;
  title: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATION';
  leadAgent: string;
  collaboratingAgents: string[];
  progress: number;
  targetRelease: string;
  description: string;
  featuresCount: number;
}

export interface AutonomousTask {
  id: string;
  title: string;
  epicId: string;
  repo: 'Sarah-JaneHarding/infinite-ai-ecosystem' | 'infinite-ai-ecosystem' | 'tecosystem' | 'business-operations' | string;
  branch: string;
  assignedAgent: {
    id: string;
    name: string;
    role: string;
    department: string;
  };
  collaboratingAgents: string[];
  status: 'BACKLOG' | 'AUTONOMOUS_DEV' | 'TESTING' | 'AWAITING_APPROVAL' | 'APPROVED' | 'MERGED' | 'REJECTED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  diffSummary: {
    filesChanged: number;
    additions: number;
    deletions: number;
    files: string[];
  };
  testResults: {
    totalTests: number;
    passed: number;
    failed: number;
    durationMs: number;
    coveragePct: number;
    suites: {
      name: string;
      status: 'PASS' | 'FAIL' | 'RUNNING';
      tests: number;
      duration: string;
    }[];
    securityScan: {
      status: 'PASS' | 'WARN' | 'FAIL';
      piiChecked: boolean;
      popiaCompliant: boolean;
      details: string;
    };
  };
  approvalCheck: {
    required: boolean;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
    approverRole: string;
    signedBy?: string;
    signedAt?: string;
    signatureHash?: string;
    comments?: string;
    gatedReason: string;
  };
  releaseVersion: string;
  createdAt: string;
  updatedAt: string;
  codeDiff?: string;
}

