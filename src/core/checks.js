/**
 * GitHub Check Runs API Integration
 */

export async function createCheckRun(octokit, { owner, repo, sha, name = 'MergeBrief AI Analysis' }) {
  try {
    const response = await octokit.rest.checks.create({
      owner,
      repo,
      name,
      head_sha: sha,
      status: 'queued',
      started_at: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error(`[CheckRun] Error creating check:`, error.message);
    return null;
  }
}

export async function updateCheckRun(octokit, { owner, repo, check_run_id, status, conclusion, output, packetUrl = null }) {
  try {
    const payload = {
      owner,
      repo,
      check_run_id,
      status // 'queued', 'in_progress', 'completed'
    };

    if (conclusion) {
      payload.conclusion = conclusion; // 'success', 'failure', 'neutral', 'action_required', etc
      payload.completed_at = new Date().toISOString();
    }
    
    if (output) {
      payload.output = output;
      // Truncate output summary if needed (GitHub imposes 65k char limit)
      if (payload.output.summary && payload.output.summary.length > 65000) {
        payload.output.summary = payload.output.summary.substring(0, 65000) + '... (truncated)';
      }
    }
    
    if (packetUrl) {
      // We can use the details_url to link to the Next.js app
      payload.details_url = packetUrl;
    }

    const response = await octokit.rest.checks.update(payload);
    return response.data;
  } catch (error) {
    console.error(`[CheckRun] Error updating check:`, error.message);
    return null;
  }
}
