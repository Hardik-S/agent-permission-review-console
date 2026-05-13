# Agent Permission Review Console

Agent Permission Review Console is a public, fixture-first AI governance product for reviewing synthetic internal-agent permission requests before deployment. It converts agent specs into data scopes, tool actions, least-privilege flags, reviewer decisions, rollback notes, and an access-review packet.

## Portfolio Signal

This project is intentionally not an autonomous-agent demo. The portfolio signal is product judgment around AI governance: making blast radius, data scope, write capability, approval state, and rollback planning visible enough for an engineering lead, security reviewer, or operations owner to make a controlled deployment decision.

## Stack Rationale

- Vite, React, and TypeScript keep the first slice static, fast to verify, and deployable on Vercel without API keys or server state.
- Fixture-first data keeps every permission scenario reproducible and avoids real credentials, personal data, or live tool access.
- Vitest covers the permission-boundary logic so the UI is backed by deterministic rules instead of hand-authored labels.
- Plain CSS keeps the surface portable and avoids component-library churn for a single-screen governance console.

## File Map

- `src/permissions.ts`: typed fixtures, policy thresholds, scope classification, packet generation, and reviewer-summary helpers.
- `src/permissions.test.ts`: deterministic tests for overbroad scopes, rollback requirements, and reviewer packet counts.
- `src/App.tsx`: product UI composition for the agent list, permission matrix, review packet, and rollback notes.
- `src/App.css` and `src/index.css`: responsive product styling and global tokens.
- `vite.config.ts`: Vite React config with Vitest globals.

## Synthetic Fixture Provenance

All data is synthetic and hand-authored for this portfolio product. The agents, systems, scopes, reviewer names, tool actions, policy ids, and rollback notes do not describe real company infrastructure. The fixtures are designed to demonstrate permission-review patterns:

- A support triage agent with mixed read and draft-write access.
- A finance close helper with sensitive ledger and export actions.
- A sales research agent with public-source reads and CRM draft writes.

## Permission-Boundary Rationale

The first slice treats permissions as reviewable operating boundaries:

- `read` actions are lower risk unless they touch restricted or cross-customer data.
- `write`, `export`, and `notify` actions require stronger reviewer decisions because they can mutate records or disclose information.
- Scopes marked `restricted`, `customer`, `financial`, or `employee` raise blast-radius concerns.
- Employee data stays reviewer-limited even for read-only requests because HRIS-style profile access still exposes private internal records and should not become auto-approval traffic.
- Rollback notes are mandatory when an agent can write, export, or notify from a sensitive system.

These rules are deliberately conservative. They are meant to surface reviewer questions, not to replace a security review.

## Local Setup

```powershell
npm ci
npm run test -- --run
npm run build
npm run dev
```

## Verification

Current worker-run verification:

- `npm ci`
- `npm run test -- --run`
- `npm run build`
- Built-output smoke for `Agent Permission Review Console`, `Permission matrix`, and `Access-review packet`

## Deployment

Expected deployment target: Vercel static production deployment.

Production URL: https://agent-permission-review-console.vercel.app

Deployment evidence from the worker run:

- Vercel project: `batb4016-9101s-projects/agent-permission-review-console`.
- Inspect URL: https://vercel.com/batb4016-9101s-projects/agent-permission-review-console/6NM9Yh1yAptWEAwiGSHyg25wGGmw
- Production alias smoke found `Agent Permission Review Console`, `Permission matrix`, and `Access-review packet` in the deployed asset.

## Decisions Made

- Chose a single-screen console rather than a marketing page so the first viewport is the actual governance workflow.
- Kept all data local and synthetic so the repository can remain public under `Hardik-S`.
- Modeled reviewer decisions explicitly as `approve`, `limit`, or `block` to make the review packet actionable.
- Avoided live agent/tool calls because the product value is permission review and rollback planning, not agent autonomy.
- Treat a missing rollback plan as a blocking review state whenever write-like or overbroad permissions require rollback coverage; this keeps the packet from approving risky access with an empty remediation path.
- Keep employee-data reads at `limit` rather than `approve`; this is intentionally stricter than public/internal reads and keeps private workforce data visible in the reviewer packet before an internal agent ships.
- Match broad-scope keywords as whole words, not substrings, so narrow scopes such as call transcripts do not get escalated simply because a word contains `all`.
