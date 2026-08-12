# Roadmap

What ships in v1, what is deferred, and roughly why. This roadmap is a working document — bumped when scope changes.

## v1 (target: end of current sprint)

The demo-able MVP. Explicit definition of done:

- [ ] Sign in with GitHub.
- [ ] Chat a rough idea; PRD streams into the artifact pane.
- [ ] Task list generates from the PRD.
- [ ] Dispatch a task; a PR opens in the target repo.
- [ ] Provider swap works (config change; evals stay green).
- [ ] Eval suite runs locally and in CI.
- [ ] All 8 ADRs merged.
- [ ] Runbook covers first-time setup and top 5 incidents.

## v1.1 — Post-demo polish (deferred; may skip)

Cleanups that would happen after the interview if this became a shipping product.

- One-click "Install BuildPilot workflows into this repo" — automates the manual copy documented in [`runbook.md`](runbook.md).
- Session resumption from any device (currently session state is per-cookie; PRDs are already durable in Gists, but the chat history is not).
- Real-time cost meter in the artifact pane.
- Prompt library UI: browse and diff prompt versions.
- Adapter benchmarking dashboard: same task across every adapter, side-by-side.

## v2 candidates — Anti-goals to name explicitly

Things that would be reasonable for a shipping product but are **intentionally not** in scope, because they would compromise the v1 architecture or narrative:

- **Multi-tenant SaaS.** Would require introducing a user DB and rewrites of the "GitHub is the DB" principle. Not the story we are telling.
- **Non-GitHub source hosts (GitLab, Bitbucket).** Would fragment the persistence layer.
- **Direct pushes to `main`.** Rejected in [ADR-0007](adr/0007-safety-guardrails-cost-controls.md).
- **Self-hosted model inference.** Adds ops surface that the "no infra" principle explicitly forbids.
- **Autonomous multi-repo refactors.** Would require cross-repo installation tokens with no user gate; unsafe by construction.

If any of these become required, they should be preceded by an ADR that explicitly supersedes the constraint they violate.

## Technical debt to acknowledge (not fix in v1)

Being honest about what we are choosing not to do:

- **No structured cost accounting DB.** Per-session cost is computed on the fly from provider responses. Historical analysis requires re-fetching logs.
- **No eval provenance store.** Eval results write to `eval-results/` but are not indexed. Trend analysis is manual.
- **No agent replay.** If an adapter fails, users cannot replay the exact model calls with a fix. Would need a session-replay store.
- **In-memory rate limiting only.** A single instance is fine at demo scale; horizontal deploys would drift.
- **No feature flags.** Every change ships to everyone. Fine at one user; obvious hazard at ten.

Each of these is a candidate for a v1.1+ ADR when the product actually has users to justify the work.

## Ideas we have considered and rejected

- **Slack integration for PM copilot.** Nice demo but violates "GitHub-native." Add later if it earns its way in.
- **VS Code extension for eng copilot.** Would compete with Claude Code / Cursor directly instead of composing with them. Wrong lane.
- **Community prompt gallery.** Adds a moderation surface with no clear ROI at MVP.
- **Fine-tuned model for PRD generation.** Not until we have data showing the base models fail systematically at something the prompt cannot fix.
