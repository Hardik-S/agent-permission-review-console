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

  it('limits employee data reads even without write-like access', () => {
    const employeeRead = classifyPermission({
      system: 'HRIS',
      scope: 'Team member profile',
      action: 'read',
      sensitivity: 'employee',
      justification: 'Checks onboarding state before assigning internal workflow tasks.',
    });

    expect(employeeRead.severity).toBe('medium');
    expect(employeeRead.reviewerDecision).toBe('limit');
  });

  it('does not mark narrow scopes broad because they contain broad-scope substrings', () => {
    const callSummaryRead = classifyPermission({
      system: 'Call center archive',
      scope: 'Call transcript summaries',
      action: 'read',
      sensitivity: 'internal',
      justification: 'Reads summarized internal coaching notes for reviewer calibration.',
    });

    expect(callSummaryRead.severity).toBe('low');
    expect(callSummaryRead.reviewerDecision).toBe('approve');
  });

  it('summarizes reviewer workload for the access-review packet', () => {
    const summary = summarizePortfolio(agentSpecs);

    expect(summary.agentsReviewed).toBe(3);
    expect(summary.blockedAgents).toBe(1);
    expect(summary.rollbackPlansRequired).toBe(3);
  });

  it('blocks write-like access when the rollback plan is missing', () => {
    const packet = createAccessReviewPacket({
      ...agentSpecs[0],
      id: 'support-triage-without-rollback',
      rollbackPlan: '   ',
    });

    expect(packet.rollbackRequired).toBe(true);
    expect(packet.rollbackPlanMissing).toBe(true);
    expect(packet.recommendedDecision).toBe('block');
  });
});
