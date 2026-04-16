#!/usr/bin/env node

const { analyzeCommit } = require('./core/detect');

async function main() {
  const args = process.argv.slice(2);
  let shaIndex = args.indexOf('--sha');
  
  if (shaIndex === -1 || shaIndex === args.length - 1) {
    console.error('Usage: node src/cli.js --sha <commit-sha>');
    process.exit(1);
  }
  
  const sha = args[shaIndex + 1];
  const repoPath = process.cwd();
  
  try {
    const result = await analyzeCommit(repoPath, sha);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  }
}

main();
