export type PermissionAction = 'read' | 'write' | 'export' | 'notify';
export type DataSensitivity = 'public' | 'internal' | 'customer' | 'financial' | 'employee' | 'restricted';
export type ReviewerDecision = 'approve' | 'limit' | 'block';

export interface PermissionRequest {
  system: string;
  scope: string;
  action: PermissionAction;
  sensitivity: DataSensitivity;
  justification: string;
}

export interface AgentSpec {
  id: string;
  name: string;
  owner: string;
  businessGoal: string;
  requestedBy: string;
  reviewer: string;
  permissions: PermissionRequest[];
  rollbackPlan: string;
}

export interface PermissionFinding {
  system: string;
  scope: string;
  action: PermissionAction;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  reviewerDecision: ReviewerDecision;
}

export interface AccessReviewPacket {
  agentId: string;
  agentName: string;
  reviewer: string;
  totalPermissions: number;
  overbroadCount: number;
  writeLikeCount: number;
  recommendedDecision: ReviewerDecision;
  rollbackRequired: boolean;
  rollbackPlanMissing: boolean;
  findings: PermissionFinding[];
}

export const agentSpecs: AgentSpec[] = [
  {
    id: 'support-triage',
    name: 'Support Triage Copilot',
    owner: 'Customer Operations',
    requestedBy: 'Ops Systems',
    reviewer: 'Security reviewer',
    businessGoal: 'Prioritize inbound customer issues and draft next-step notes for agents.',
    rollbackPlan: 'Disable draft creation, revoke CRM token, and route all unresolved tickets to the support lead.',
    permissions: [
      {
        system: 'Helpdesk',
        scope: 'Open tickets and SLA metadata',
        action: 'read',
        sensitivity: 'customer',
        justification: 'Needed to classify active tickets by urgency.',
      },
      {
        system: 'CRM',
        scope: 'Customer account notes',
        action: 'write',
        sensitivity: 'customer',
        justification: 'Drafts internal next-step notes after a human review.',
      },
      {
        system: 'Slack',
        scope: 'Support escalation channel',
        action: 'notify',
        sensitivity: 'internal',
        justification: 'Posts escalation summaries when SLA risk is high.',
      },
    ],
  },
  {
    id: 'finance-close',
    name: 'Finance Close Analyst',
    owner: 'Finance Operations',
    requestedBy: 'Controller',
    reviewer: 'Finance systems reviewer',
    businessGoal: 'Compare synthetic close checklist evidence against missing journal support.',
    rollbackPlan: 'Revoke export permission, delete generated files, and require manual controller signoff on every variance.',
    permissions: [
      {
        system: 'ERP',
        scope: 'Journal entries and vendor ledger',
        action: 'export',
        sensitivity: 'financial',
        justification: 'Exports variance evidence for month-end review packets.',
      },
      {
        system: 'Data warehouse',
        scope: 'All finance tables',
        action: 'read',
        sensitivity: 'restricted',
        justification: 'Requested broad access to avoid missing close dependencies.',
      },
      {
        system: 'Document store',
        scope: 'Close packet folder',
        action: 'write',
        sensitivity: 'financial',
        justification: 'Adds generated close-support summaries for controller review.',
      },
    ],
  },
  {
    id: 'sales-research',
    name: 'Sales Research Scout',
    owner: 'Revenue Operations',
    requestedBy: 'Growth team',
    reviewer: 'RevOps reviewer',
    businessGoal: 'Collect public account signals and draft non-sending CRM research briefs.',
    rollbackPlan: 'Remove CRM draft-write scope and keep only public-source read access.',
    permissions: [
      {
        system: 'Public web sources',
        scope: 'Company websites and press pages',
        action: 'read',
        sensitivity: 'public',
        justification: 'Collects public facts for account research.',
      },
      {
        system: 'CRM',
        scope: 'Prospect research notes',
        action: 'write',
        sensitivity: 'internal',
        justification: 'Creates drafts for human sales review only.',
      },
    ],
  },
];

const sensitiveScopes = new Set<DataSensitivity>(['customer', 'financial', 'employee', 'restricted']);
const writeLikeActions = new Set<PermissionAction>(['write', 'export', 'notify']);

export function classifyPermission(permission: PermissionRequest): PermissionFinding {
  const touchesSensitiveData = sensitiveScopes.has(permission.sensitivity);
  const mutatesOrDiscloses = writeLikeActions.has(permission.action);
  const broadScope = /all|ledger|account|entries|customer/i.test(permission.scope);

  if (permission.sensitivity === 'restricted' || (touchesSensitiveData && permission.action === 'export')) {
    return {
      system: permission.system,
      scope: permission.scope,
      action: permission.action,
      severity: 'high',
      reason: 'Restricted or exportable sensitive data needs a narrower scope and explicit approval.',
      reviewerDecision: 'block',
    };
  }

  if ((touchesSensitiveData && mutatesOrDiscloses) || broadScope) {
    return {
      system: permission.system,
      scope: permission.scope,
      action: permission.action,
      severity: 'medium',
      reason: 'Permission can change records, notify users, or spans a broad business object.',
      reviewerDecision: 'limit',
    };
  }

  return {
    system: permission.system,
    scope: permission.scope,
    action: permission.action,
    severity: 'low',
    reason: 'Scope is narrow enough for first-pass approval with monitoring.',
    reviewerDecision: 'approve',
  };
}

export function createAccessReviewPacket(agent: AgentSpec): AccessReviewPacket {
  const findings = agent.permissions.map(classifyPermission);
  const overbroadCount = findings.filter((finding) => finding.severity !== 'low').length;
  const writeLikeCount = agent.permissions.filter((permission) => writeLikeActions.has(permission.action)).length;
  const rollbackRequired = writeLikeCount > 0 || overbroadCount > 0;
  const rollbackPlanMissing = rollbackRequired && agent.rollbackPlan.trim().length === 0;
  const recommendedDecision = rollbackPlanMissing || findings.some((finding) => finding.reviewerDecision === 'block')
    ? 'block'
    : findings.some((finding) => finding.reviewerDecision === 'limit')
      ? 'limit'
      : 'approve';

  return {
    agentId: agent.id,
    agentName: agent.name,
    reviewer: agent.reviewer,
    totalPermissions: agent.permissions.length,
    overbroadCount,
    writeLikeCount,
    recommendedDecision,
    rollbackRequired,
    rollbackPlanMissing,
    findings,
  };
}

export function summarizePortfolio(specs: AgentSpec[]) {
  const packets = specs.map(createAccessReviewPacket);

  return {
    agentsReviewed: packets.length,
    blockedAgents: packets.filter((packet) => packet.recommendedDecision === 'block').length,
    limitedAgents: packets.filter((packet) => packet.recommendedDecision === 'limit').length,
    approvalReadyAgents: packets.filter((packet) => packet.recommendedDecision === 'approve').length,
    rollbackPlansRequired: packets.filter((packet) => packet.rollbackRequired).length,
  };
}
