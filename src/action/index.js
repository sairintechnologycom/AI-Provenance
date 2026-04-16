const core = require('@actions/core');
const github = require('@actions/github');
const { analyzeCommit } = require('../core/detect');

async function run() {
  try {
    const sha = core.getInput('sha') || github.context.sha;
    const trailerKey = core.getInput('trailer-key') || 'AI-generated-by';
    
    // We get the workspace path from GITHUB_WORKSPACE environment variable
    const repoPath = process.env.GITHUB_WORKSPACE || process.cwd();
    
    core.info(`Analyzing commit ${sha} in ${repoPath}`);
    core.info(`Using trailer key: ${trailerKey}`);
    
    const result = await analyzeCommit(repoPath, sha, trailerKey);
    
    // Check if result has expected structure, otherwise handle undefined
    if (!result) {
      core.info('No detection result generated.');
      return;
    }

    const aiToolStr = result.aiTool || 'None found';
    const confidenceStr = result.aiTool ? `${result.confidence}%` : 'N/A';
    const methodsStr = result.methods && result.methods.length > 0 ? result.methods.join(', ') : 'None';

    const webhookUrl = core.getInput('webhook-url');
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        });
        core.info(`Successfully forwarded telemetry to webhook.`);
      } catch (postError) {
        core.warning(`Failed to forward telemetry to webhook: ${postError.message}`);
      }
    }

    // Use core.summary to generate markdown table
    await core.summary
      .addHeading('AI Provenance Detection')
      .addTable([
        [{data: 'Metric', header: true}, {data: 'Value', header: true}],
        ['Commit SHA', result.sha],
        ['AI Tool', aiToolStr],
        ['Confidence', confidenceStr],
        ['Files Touched', String(result.files || 0)],
        ['Lines Added', String(result.linesAdded || 0)],
        ['Lines Removed', String(result.linesRemoved || 0)],
        ['Detection Methods', methodsStr]
      ])
      .write();
      
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
