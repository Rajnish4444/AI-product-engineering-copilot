/**
 * Fires a workflow_dispatch against the target repo's buildpilot-eng.yml.
 * The DispatchPayload is serialized as a single input so the workflow can
 * parse it without listing every field as a separate input on the API.
 */

import type { Octokit } from "@octokit/rest";
import type { DispatchPayload } from "@/lib/schemas/dispatch.v1";

const WORKFLOW_FILE = "buildpilot-eng.yml";

export async function triggerEngWorkflow(
  octokit: Octokit,
  payload: DispatchPayload
): Promise<void> {
  await octokit.rest.actions.createWorkflowDispatch({
    owner: payload.repo.owner,
    repo: payload.repo.name,
    workflow_id: WORKFLOW_FILE,
    ref: payload.repo.ref,
    inputs: {
      dispatch_payload_json: JSON.stringify(payload),
    },
  });
}
