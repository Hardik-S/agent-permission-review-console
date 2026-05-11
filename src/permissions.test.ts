import { describe, expect, it } from 'vitest';
import { agentSpecs, classifyPermission, createAccessReviewPacket, summarizePortfolio } from './permissions';

describe('permission review logic', () => {
  it('blocks restricted broad finance access', () => {
    const financePacket = createAccessReviewPacket(agentSpecs[1]);

    expect(financePacket.recommendedDecision).toBe('block');
    expect(financePacket.overbroadCount).toBe(3);
    expect(financePacket.findings.some((finding) => finding.severity === 'high')).toBe(true);
  });

  it('limits customer write access even when a rollback plan exists', () => {
    const crmWrite = agentSpecs[0].permissions.find((permission) => permission.system === 'CRM');

    expect(crmWrite).toBeDefined();
    expect(classifyPermission(crmWrite!).reviewerDecision).toBe('limit');
  });

  it('summarizes reviewer workload for the access-review packet', () => {
    const summary = summarizePortfolio(agentSpecs);

    expect(summary.agentsReviewed).toBe(3);
    expect(summary.blockedAgents).toBe(1);
    expect(summary.rollbackPlansRequired).toBe(3);
  });
});
