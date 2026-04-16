const fs = require('fs');
const path = require('path');
const { analyzeCommit } = require('../core/detect');

async function runAzureAdapter() {
  try {
    // Collect variables from Azure Pipelines Environment
    // Build.SourceVersion represents the commit SHA in ADO
    const sha = process.argv[2] || process.env.BUILD_SOURCEVERSION;
    
    // System.DefaultWorkingDirectory is the root of the repo in ADO
    const repoPath = process.env.SYSTEM_DEFAULTWORKINGDIRECTORY || process.cwd();
    
    const trailerKey = process.env.TRAILER_KEY || 'AI-generated-by';

    if (!sha) {
      throw new Error('No commit SHA provided. Make sure to run inside Azure DevOps or pass SHA as argument.');
    }

    console.log(`Analyzing commit ${sha} in ${repoPath}`);

    const result = await analyzeCommit(repoPath, sha, trailerKey);

    if (!result) {
      console.log('No detection result generated.');
      return;
    }

    // Prepare string representations
    const aiToolStr = result.aiTool || 'None found';
    const confidenceStr = result.aiTool ? `${result.confidence}%` : 'N/A';
    const methodsStr = result.methods && result.methods.length > 0 ? result.methods.join(', ') : 'None';

    // Generate Markdown manually since we do not have @actions/core in ADO
    const markdownContent = `
# AI Provenance Detection

| Metric | Value |
|--------|-------|
| **Commit SHA** | \`${result.sha}\` |
| **AI Tool** | ${aiToolStr} |
| **Confidence** | ${confidenceStr} |
| **Files Touched** | ${result.files || 0} |
| **Lines Added** | ${result.linesAdded || 0} |
| **Lines Removed** | ${result.linesRemoved || 0} |
| **Detection Methods** | ${methodsStr} |
`;

    // Write the Markdown Summary file to disk
    const summaryPath = path.join(repoPath, 'ai-provenance-summary.md');
    fs.writeFileSync(summaryPath, markdownContent.trim());

    // Tell Azure DevOps to attach this Markdown file to the PR / Build Summary UI
    console.log(`##vso[task.addattachment type=Distributedtask.Core.Summary;name=AI Provenance Report;]${summaryPath}`);

    console.log('AI Provenance report successfully attached to Azure DevOps Build Summary.');

  } catch (error) {
    console.error(`Azure DevOps Adapter failed: ${error.message}`);
    // Instruct ADO to fail the current task
    console.log(`##vso[task.logissue type=error]${error.message}`);
    process.exit(1);
  }
}

runAzureAdapter();
