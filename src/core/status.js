/**
 * Updates the GitHub Status Check for a specific commit (Classic Status API)
 */
export async function updateStatusCheck(octokit, { owner, repo, sha, state, description, target_url = 'https://github.com/apps/merge-brief' }) {
  try {
    const response = await octokit.rest.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state, // 'pending', 'success', 'failure', 'error'
      description: (description || '').substring(0, 140),
      context: 'MergeBrief Approval',
      target_url
    });
    console.log(`[StatusCheck] Status updated to ${state} for ${sha.substring(0, 7)}`);
    return response.data;
  } catch (error) {
    console.error(`[StatusCheck] Failed to update Status Check:`, error.message);
    return null;
  }
}
