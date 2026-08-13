# `.github/workflows/`

CI and long-running compute for BuildPilot itself. The eng-side coding agent that runs *inside target repos* is templated in `template/target-repo/.github/workflows/` (added later).

## Planned workflows

| Workflow | Phase | Trigger | Purpose |
|---|---|---|---|
| `ci.yml` | 3 | push, pull_request | typecheck + lint + test |
| `evals.yml` | 8 | pull_request touching `lib/prompts/**` or `lib/providers/**` | run eval suite, comment summary on PR |
| `evals-cross-provider.yml` | 8 | scheduled (weekly) | run evals against every configured provider, open issue on regression |
| `buildpilot-eng.yml` (target-repo template) | 6 | `workflow_dispatch` | dispatcher → runtime adapter |
