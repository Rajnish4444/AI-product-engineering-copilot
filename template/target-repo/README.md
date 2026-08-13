# BuildPilot target-repo template

Copy the contents of this directory into any repo you want BuildPilot to work with. Two things get installed:

1. **`.github/workflows/buildpilot-eng.yml`** — a `workflow_dispatch` handler that BuildPilot triggers via the GitHub API. It reads the `DispatchPayload.v1` JSON and routes to the configured coding-agent adapter.
2. **`.github/actions/<runtime>-adapter/`** — one composite action per supported coding-agent runtime. Ships with `claude-code-adapter`; `gemini-cli-adapter` and `raw-api-adapter` land in v1.1.

## Prerequisites in the target repo

1. **BuildPilot GitHub App installed** on the repo (grants the workflow dispatch permission).
2. **Branch protection on the default branch** — no direct pushes, PRs required (see ADR-0007).
3. **Adapter secrets** set as repo-level secrets:
   - `ANTHROPIC_API_KEY` for the `claude-code` runtime.
   - `GEMINI_API_KEY` for `gemini-cli` (v1.1).

## Installation

```bash
# From the target repo root:
cp -r <buildpilot-repo>/template/target-repo/.github .
git add .github/workflows/buildpilot-eng.yml .github/actions/
git commit -m "chore: install BuildPilot workflows"
git push
```

A one-click "Install BuildPilot into this repo" flow is on the v1.1 roadmap — see [`docs/roadmap.md`](../../docs/roadmap.md) in the main repo.

## What happens when BuildPilot dispatches a task

1. BuildPilot's `/api/dispatch` calls `POST /repos/<owner>/<repo>/actions/workflows/buildpilot-eng.yml/dispatches` with a `DispatchPayload.v1` JSON input.
2. `buildpilot-eng.yml` parses the payload, extracts the `runtime` field.
3. The matching adapter runs: creates a `bp/<task-id>` branch, edits files, opens a PR that says `Closes #<task-id>`.
4. BuildPilot's webhook receiver flips the tracking Issue's label from `bp:dispatched` → `bp:pr-opened` → `bp:merged` as the PR progresses.
