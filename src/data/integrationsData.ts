import { IntegrationTool } from '../types';

export const INITIAL_INTEGRATIONS: IntegrationTool[] = [
  {
    id: 'int-notion',
    name: 'Notion',
    category: 'Knowledge',
    tier: 'Free Tier',
    status: 'Connected',
    iconName: 'FileText',
    description: 'Bi-directional sync of SOPs, internal company wiki, and meeting briefing agendas.',
    usageQuota: '1,000 blocks / month (Free tier active)',
    webhookUrl: 'https://api.infinite-ai.internal/webhooks/notion-sync',
    lastSynced: '12m ago'
  },
  {
    id: 'int-slack',
    name: 'Slack',
    category: 'Collaboration',
    tier: 'Free Tier',
    status: 'Connected',
    iconName: 'MessageSquare',
    description: 'Real-time HITL approval notifications, critical incident alerts, and executive briefings.',
    usageQuota: '90-day message history (Free tier active)',
    webhookUrl: 'https://hooks.slack.com/services/T089/B022/ia-alerts',
    lastSynced: '1m ago'
  },
  {
    id: 'int-jira',
    name: 'Trello / Jira',
    category: 'Project',
    tier: 'Free Tier',
    status: 'Connected',
    iconName: 'Kanban',
    description: 'Automated sprint backlog decomposition from MOD-01 into Kanban cards.',
    usageQuota: 'Up to 10 boards active (Free tier)',
    webhookUrl: 'https://api.infinite-ai.internal/webhooks/jira-sprints',
    lastSynced: '45m ago'
  },
  {
    id: 'int-github',
    name: 'GitHub',
    category: 'Code',
    tier: 'Free Tier',
    status: 'Connected',
    iconName: 'GitBranch',
    description: 'Turborepo repository hosting, GitHub Actions 19-stage CI verification, and release tags.',
    usageQuota: '2,000 CI runner minutes / month',
    webhookUrl: 'https://api.github.com/repos/infinite-ai/platform/events',
    lastSynced: 'Just now'
  },
  {
    id: 'int-google',
    name: 'Google Workspace',
    category: 'Productivity',
    tier: 'Free Tier',
    status: 'Connected',
    iconName: 'Mail',
    description: 'Google Drive secure backup exports, executive calendar scheduling, and Gmail alerts.',
    usageQuota: '15 GB shared storage tier',
    webhookUrl: 'https://api.infinite-ai.internal/webhooks/google-drive',
    lastSynced: '2h ago'
  },
  {
    id: 'int-stripe',
    name: 'Stripe / Paystack',
    category: 'Payments',
    tier: 'Free Tier',
    status: 'Connected',
    iconName: 'CreditCard',
    description: 'Usage-metered recurring billing, invoice dunning, and ZAR / USD card settlement.',
    usageQuota: 'Sandbox active · Pay-as-you-transact',
    webhookUrl: 'https://api.infinite-ai.internal/webhooks/stripe-metering',
    lastSynced: '5m ago'
  },
  {
    id: 'int-hubspot',
    name: 'HubSpot',
    category: 'CRM',
    tier: 'Free Tier',
    status: 'Connected',
    iconName: 'Users',
    description: 'Inbound sales prospect enrichment, B2B deal pipeline tracking, and contact sync.',
    usageQuota: 'Free CRM · 1,000 contacts',
    webhookUrl: 'https://api.infinite-ai.internal/webhooks/hubspot-leads',
    lastSynced: '28m ago'
  },
  {
    id: 'int-zapier',
    name: 'Zapier',
    category: 'Automation',
    tier: 'Free Tier',
    status: 'Connected',
    iconName: 'Zap',
    description: 'Multi-app webhooks connecting Infinite-AI agent signals to 5,000+ external apps.',
    usageQuota: '100 tasks / month (Free tier)',
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/91283/infinite-ai',
    lastSynced: '18m ago'
  },
  {
    id: 'int-aws',
    name: 'AWS af-south-1',
    category: 'Cloud',
    tier: 'Enterprise',
    status: 'Connected',
    iconName: 'Cloud',
    description: 'Cape Town primary data plane (ECS Fargate, RDS PostgreSQL 16 + pgvector, KMS, S3).',
    usageQuota: 'Multi-AZ production tenant active',
    webhookUrl: 'https://cloudwatch.af-south-1.amazonaws.com/events',
    lastSynced: 'Just now'
  },
  {
    id: 'int-azure',
    name: 'Azure Cloud',
    category: 'Cloud',
    tier: 'Free Tier',
    status: 'Ready',
    iconName: 'Server',
    description: 'Secondary cold-standby disaster recovery point and multi-cloud health verification.',
    usageQuota: 'Free credits tier ($200 credit active)',
    webhookUrl: 'https://management.azure.com/infinite-ai/dr-sync',
    lastSynced: '6h ago'
  }
];
