/**
 * IP Compliance Reporting Service
 * Aggregates PR provenance data for a repository to generate audit trails.
 */

import { prisma } from '../app/db.js';

/**
 * Generates a compliance report for a specific repository.
 * @param {string} owner - Repository owner login.
 * @param {string} repoName - Repository name.
 * @param {Object} options - Report options (date range, detail level).
 */
export async function generateReport(owner, repoName, options = {}) {
  const repository = await prisma.repository.findUnique({
    where: {
      owner_name: { owner, name: repoName }
    },
    include: {
      pullRequests: {
        where: {
          packet: { isNot: null }
        },
        include: {
          packet: {
            include: {
              provenanceEvidence: true,
              tags: true,
              intents: true
            }
          },
          reviewEvents: true
        },
        orderBy: { number: 'desc' }
      }
    }
  });

  if (!repository) {
    throw new Error(`Repository ${owner}/${repoName} not found.`);
  }

  const packets = repository.pullRequests.map(pr => pr.packet).filter(Boolean);
  
  const stats = {
    totalPrsAnalyzed: repository.pullRequests.length,
    aiAttributedPrs: packets.filter(p => p.confidence > 0).length,
    highConfidencePrs: packets.filter(p => p.confidence >= 80).length,
    totalEvidencePoints: packets.reduce((acc, p) => acc + p.provenanceEvidence.length, 0),
    topRiskCategories: aggregateRiskCategories(packets)
  };

  const auditTrail = repository.pullRequests.map(pr => ({
    prNumber: pr.number,
    status: pr.status,
    merged: pr.merged,
    aiConfidence: pr.packet?.confidence || 0,
    aiTool: pr.packet?.aiTool || 'Unknown',
    riskTags: pr.packet?.tags.map(t => t.category) || [],
    evidenceCount: pr.packet?.provenanceEvidence.length || 0,
    approvers: pr.reviewEvents.filter(e => e.eventType === 'APPROVED').map(e => e.username),
    createdAt: pr.createdAt
  }));

  return {
    reportMetadata: {
      generatedAt: new Date(),
      repository: `${owner}/${repoName}`,
      period: options.period || 'All Time'
    },
    summary: stats,
    auditTrail
  };
}

function aggregateRiskCategories(packets) {
  const counts = {};
  packets.forEach(p => {
    p.tags.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));
}
