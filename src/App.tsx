import { useMemo, useState } from 'react';
import './App.css';
import { agentSpecs, createAccessReviewPacket, summarizePortfolio, type ReviewerDecision } from './permissions';

const decisionLabels: Record<ReviewerDecision, string> = {
  approve: 'Approve',
  limit: 'Limit scope',
  block: 'Block',
};

function App() {
  const [selectedAgentId, setSelectedAgentId] = useState(agentSpecs[0].id);
  const selectedAgent = agentSpecs.find((agent) => agent.id === selectedAgentId) ?? agentSpecs[0];
  const packet = useMemo(() => createAccessReviewPacket(selectedAgent), [selectedAgent]);
  const summary = useMemo(() => summarizePortfolio(agentSpecs), []);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="section-label">AI governance workspace</p>
          <h1>Agent Permission Review Console</h1>
          <p className="hero-copy">
            Convert synthetic agent specs into a least-privilege permission matrix, reviewer decision states,
            overbroad-scope flags, and rollback notes before an internal agent ships.
          </p>
        </div>
        <div className="summary-grid" aria-label="review summary">
          <span>
            <strong>{summary.agentsReviewed}</strong>
            Agents reviewed
          </span>
          <span>
            <strong>{summary.blockedAgents}</strong>
            Block decisions
          </span>
          <span>
            <strong>{summary.limitedAgents}</strong>
            Scope limits
          </span>
          <span>
            <strong>{summary.rollbackPlansRequired}</strong>
            Rollbacks required
          </span>
        </div>
      </section>

      <section className="workspace">
        <aside className="agent-list" aria-label="agent specs">
          <p className="section-label">Requested agents</p>
          {agentSpecs.map((agent) => {
            const review = createAccessReviewPacket(agent);

            return (
              <button
                className={agent.id === selectedAgent.id ? 'agent-card selected' : 'agent-card'}
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                type="button"
              >
                <span className={`decision-dot ${review.recommendedDecision}`} />
                <span>
                  <strong>{agent.name}</strong>
                  <small>{agent.owner}</small>
                </span>
                <em>{decisionLabels[review.recommendedDecision]}</em>
              </button>
            );
          })}
        </aside>

        <section className="review-console">
          <div className="console-header">
            <div>
              <p className="section-label">Permission matrix</p>
              <h2>{selectedAgent.name}</h2>
              <p>{selectedAgent.businessGoal}</p>
            </div>
            <div className={`decision-card ${packet.recommendedDecision}`}>
              <span>Reviewer decision</span>
              <strong>{decisionLabels[packet.recommendedDecision]}</strong>
            </div>
          </div>

          <div className="matrix" role="table" aria-label="Permission matrix">
            <div className="matrix-row matrix-head" role="row">
              <span>System</span>
              <span>Scope</span>
              <span>Action</span>
              <span>Risk</span>
              <span>Reviewer state</span>
            </div>
            {packet.findings.map((finding) => (
              <div className="matrix-row" role="row" key={`${finding.system}-${finding.scope}`}>
                <span>{finding.system}</span>
                <span>{finding.scope}</span>
                <span>{finding.action}</span>
                <span className={`risk ${finding.severity}`}>{finding.severity}</span>
                <span>{decisionLabels[finding.reviewerDecision]}</span>
              </div>
            ))}
          </div>

          <div className="packet-grid">
            <article>
              <p className="section-label">Access-review packet</p>
              <h3>{packet.overbroadCount} permissions need reviewer attention</h3>
              <p>
                {packet.reviewer} should review {packet.totalPermissions} requested permissions. {packet.writeLikeCount}{' '}
                write-like actions can mutate, export, or notify from connected systems.
              </p>
              <ul>
                {packet.findings.map((finding) => (
                  <li key={finding.reason + finding.scope}>{finding.reason}</li>
                ))}
              </ul>
            </article>
            <article>
              <p className="section-label">Rollback notes</p>
              <h3>
                {packet.rollbackPlanMissing
                  ? 'Rollback plan missing'
                  : packet.rollbackRequired
                    ? 'Rollback plan required'
                    : 'Monitor only'}
              </h3>
              <p>{packet.rollbackPlanMissing ? 'A rollback plan is required before this agent can be approved.' : selectedAgent.rollbackPlan}</p>
              <div className="boundary-note">No real tools, secrets, user records, or company systems are connected.</div>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
