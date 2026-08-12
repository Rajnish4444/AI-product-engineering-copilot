# Architecture Decision Records

This directory captures load-bearing decisions and the reasoning behind them. Each ADR is immutable once accepted; changes require a new ADR that supersedes the old one.

Format is a lightweight [MADR](https://adr.github.io/madr/) variant: Context → Decision → Consequences → Alternatives considered.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-architecture-c-github-native-hybrid.md) | Architecture C — thin serverless with GitHub as backend | Accepted |
| [0002](0002-multi-provider-model-abstraction.md) | Multi-provider model abstraction | Accepted |
| [0003](0003-github-as-persistence-layer.md) | GitHub as persistence layer | Accepted |
| [0004](0004-pm-eng-copilot-split.md) | Split the PM and engineering copilots | Accepted |
| [0005](0005-structured-outputs-with-zod.md) | Structured outputs with Zod | Accepted |
| [0006](0006-pluggable-engineering-runtime.md) | Pluggable engineering runtime | Accepted |
| [0007](0007-safety-guardrails-cost-controls.md) | Safety guardrails and cost controls | Accepted |
| [0008](0008-evaluation-strategy.md) | Evaluation strategy | Accepted |

## Writing a new ADR

Use the `write-adr` Claude Code skill, or copy the format from an existing accepted one. Rules:

- Number sequentially (never reuse a number, even for a superseded ADR).
- Keep the Decision section short and imperative — the point is the choice, not the essay.
- Alternatives considered are not optional. If you cannot list three real alternatives with reasons for rejection, the ADR is not ready.
- An ADR is **accepted** when merged to `main`. Prior states are `proposed` or `superseded`.
