#!/usr/bin/env node

import 'dotenv/config';
import { analyzeCommit } from './core/detect.js';
import { checkSubscription } from './core/gating.js';
import { execSync } from 'child_process';

async function getRepoMetadata() {
  try {
    const remote = execSync('git remote get-url origin').toString().trim();
    // Simple parser for git@github.com:owner/repo.git or https://github.com/owner/repo.git
    const match = remote.match(/[:/]([^/]+)\/([^/.]+)(\.git)?$/);
    if (!match) return { owner: 'unknown', repo: 'unknown' };
    return { owner: match[1], repo: match[2] };
  } catch (e) {
    return { owner: 'local', repo: 'test' };
  }
}

async function isRepoPrivate() {
  try {
    // In a real CLI, we might check if a remote exists or use a flag --private
    // For this gating, we check if there's a remote that isn't public
    const visibility = execSync('git rev-parse --is-inside-work-tree').toString().trim();
    return visibility === 'true'; // Simplified: assume if it's a git repo, check it
  } catch (e) {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  let shaIndex = args.indexOf('--sha');
  
  if (shaIndex === -1 || shaIndex === args.length - 1) {
    console.error('Usage: node src/cli.js --sha <commit-sha>');
    process.exit(1);
  }
  
  const sha = args[shaIndex + 1];
  const repoPath = process.cwd();
  
  // --- Gating Check ---
  const { owner, repo } = await getRepoMetadata();
  const isPrivate = await isRepoPrivate(); 
  const licenseKey = process.env.MERGEBRIEF_LICENSE;

  const gating = await checkSubscription({ owner, repo, isPrivate, licenseKey });
  
  if (!gating.allowed) {
    console.error('\n❌ Paywall Required');
    console.error(gating.message);
    process.exit(402); // Payment Required
  }
  // --------------------
  
  try {
    const result = await analyzeCommit(repoPath, sha);
    console.log(JSON.stringify({ ...result, tier: gating.tier }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  }
}

main();
