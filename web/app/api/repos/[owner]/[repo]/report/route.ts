import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  const { owner, repo: repoName } = params;

  try {
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
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    const packets = repository.pullRequests.map(pr => pr.packet).filter(Boolean);
    
    const stats = {
      totalPrsAnalyzed: repository.pullRequests.length,
      aiAttributedPrs: packets.filter(p => (p?.confidence ?? 0) > 0).length,
      highConfidencePrs: packets.filter(p => (p?.confidence ?? 0) >= 80).length,
      totalEvidencePoints: packets.reduce((acc, p) => acc + (p?.provenanceEvidence?.length ?? 0), 0),
      topRiskCategories: aggregateRiskCategories(packets)
    };

    const auditTrail = repository.pullRequests.map(pr => ({
      prNumber: pr.number,
      status: pr.status,
      merged: pr.merged,
      aiConfidence: pr.packet?.confidence || 0,
      aiTool: pr.packet?.aiTool || 'Unknown',
      riskTags: pr.packet?.tags.map(t => ({ category: t.category, reason: t.reason })) || [],
      evidenceCount: pr.packet?.provenanceEvidence.length || 0,
      approvers: pr.reviewEvents.filter(e => e.eventType === 'APPROVED').map(e => e.username),
      createdAt: pr.createdAt
    }));

    return NextResponse.json({
      reportMetadata: {
        generatedAt: new Date(),
        repository: `${owner}/${repoName}`,
        period: 'All Time'
      },
      summary: stats,
      auditTrail
    });
  } catch (error: any) {
    console.error('[ReportingAPI] Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

function aggregateRiskCategories(packets: any[]) {
  const counts: Record<string, number> = {};
  packets.forEach(p => {
    p.tags.forEach((t: any) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));
}
