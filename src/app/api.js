import express from 'express';
import { prisma } from './db.js';
import { updateStatusCheck } from '../core/status.js';

/**
 * Factory for API Router with GitHub App context
 */
export default function createApiRouter(githubApp) {
  const router = express.Router();

  /**
   * Middleware to check if Prisma is available
   */
  const checkDb = (req, res, next) => {
    if (!prisma) {
      return res.status(503).json({ error: 'Database is currently unavailable' });
    }
    next();
  };

  /**
   * GET /api/repos
   * Returns list of tracked repositories.
   */
  router.get('/repos', checkDb, async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'x-workspace-id header is required for tenant isolation' });
    }

    try {
      const repos = await prisma.repository.findMany({
        where: {
          organization: { workspaceId }
        },
        include: { organization: true },
        orderBy: { updatedAt: 'desc' }
      });
      res.json(repos);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/governance/stats
   * Aggregated metrics for the Governance Dashboard.
   */
  router.get('/governance/stats', checkDb, async (req, res) => {
    try {
      const totalPrs = await prisma.pullRequest.count();
      const avgLatency = await prisma.pullRequest.aggregate({
        _avg: { latencySeconds: true },
        where: { latencySeconds: { not: null } }
      });

      const triageDistribution = await prisma.mergeBriefPacket.groupBy({
        by: ['aiTool'], // Temporarily using aiTool as a proxy or we can use PacketTag if triage is stored there
        // Actually, we should probably check packet summaries or tags.
        // For Tier 1, let's just return the latency stats.
        _count: { id: true }
      });

      res.json({
        totalPrs,
        avgLatencySeconds: Math.round(avgLatency._avg.latencySeconds || 0),
        status: 'Operational'
      });
    } catch (error) {
      console.error('[API] Governance stats error:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/repos/:owner/:repo/pulls
   * Returns list of PRs for a specific repo.
   */
  router.get('/repos/:owner/:repo/pulls', checkDb, async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];

    if (!workspaceId) {
      return res.status(400).json({ error: 'x-workspace-id header is required' });
    }

    try {
      const prs = await prisma.pullRequest.findMany({
        where: {
          repository: {
            owner: req.params.owner,
            name: req.params.repo,
            organization: { workspaceId }
          }
        },
        include: {
          packet: true
        },
        orderBy: { updatedAt: 'desc' }
      });
      res.json(prs);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/repos/:owner/:repo/pulls/:number/packet
   * Utility mapping PR numbers to their associated packet.
   */
  router.get('/repos/:owner/:repo/pulls/:number/packet', checkDb, async (req, res) => {
    try {
      const repo = await prisma.repository.findFirst({
        where: { owner: req.params.owner, name: req.params.repo }
      });

      if (!repo) return res.status(404).json({ error: 'Repository not found' });

      const pr = await prisma.pullRequest.findUnique({
        where: {
          repositoryId_number: {
            repositoryId: repo.id,
            number: parseInt(req.params.number)
          }
        },
        include: { packet: true }
      });
      
      if (!pr || !pr.packet) return res.status(404).json({ error: 'Packet not found' });
      // Redirect to the canonical packet ID endpoint
      res.redirect(`/api/packets/${pr.packet.id}`);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/packets/:id
   * Canonical endpoint for retrieving full packet details.
   */
  router.get('/packets/:id', checkDb, async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    try {
      const packet = await prisma.mergeBriefPacket.findUnique({
        where: { id: req.params.id },
        include: {
          pullRequest: {
            include: { 
              repository: {
                include: { organization: true }
              } 
            }
          },
          tags: true,
          intents: true,
          reviewerSuggestions: true,
          provenanceEvidence: true,
          lineRisks: true
        }
      });
      if (!packet) {
        return res.status(404).json({ error: 'Packet not found' });
      }

      // Tenant Isolation Check
      if (!workspaceId) {
        return res.status(400).json({ error: 'x-workspace-id header is required' });
      }

      if (packet.pullRequest.repository.organization.workspaceId !== workspaceId) {
        return res.status(403).json({ error: 'Access Denied: This packet does not belong to your workspace' });
      }

      res.json(packet);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * POST /api/packets/:id/approve
   * Approves a packet, updates DB, and clears GitHub gate.
   */
  router.post('/packets/:id/approve', checkDb, async (req, res) => {
    const { note, username, intent } = req.body;
    
    if (!note) {
      return res.status(400).json({ error: 'Approval note is required' });
    }

    try {
      const packet = await prisma.mergeBriefPacket.findUnique({
        where: { id: req.params.id },
        include: {
          pullRequest: {
            include: {
              repository: {
                include: { organization: true }
              }
            }
          }
        }
      });

      if (!packet) {
        return res.status(404).json({ error: 'Packet not found' });
      }

      const pr = packet.pullRequest;
      const repo = pr.repository;

      // 1. Update Database
      await prisma.pullRequest.update({
        where: { id: pr.id },
        data: {
          status: 'APPROVED',
          approvalNote: note,
          reviewerIntent: intent || {}
        }
      });

      // 2. Update GitHub Status Check
      if (githubApp) {
        try {
          const installationId = parseInt(repo.organization.githubId); // This might be wrong, installationId != orgId usually
          // However, in this app, we might be storing installationId in organization.githubId or similar
          // Let's check how we handle webhooks
          
          // Re-fetching installationId if needed, but for simplicity let's assume we can get it from Octokit App if it's already installed
          // A better way is to store installationId in the Organization model.
          
          // FOR NOW: We'll try to find the installation for this repo/owner
          const { data: installations } = await githubApp.octokit.rest.apps.listInstallations();
          const installation = installations.find(i => i.account.login === repo.owner);
          
          if (installation) {
            const octokit = await githubApp.getInstallationOctokit(installation.id);
            await updateStatusCheck(octokit, {
              owner: repo.owner,
              repo: repo.name,
              sha: packet.headSha || pr.headSha, // We need to make sure headSha is available
              state: 'success',
              description: `Approved: ${note.substring(0, 50)}...`
            });
          }
        } catch (ghErr) {
          console.error(`[API] Failed to update GitHub status:`, ghErr.message);
          // Non-blocking for the API response
        }
      }

      // 3. Log Event
      await prisma.appEvent.create({
        data: {
          event: 'web_approved',
          payload: { 
            packetId: packet.id, 
            prNumber: pr.number, 
            username: username || 'Web User',
            note 
          }
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error(`[API] Approval error:`, error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/jobs/:id
   */
  router.get('/jobs/:id', checkDb, async (req, res) => {
    try {
      const job = await prisma.analysisJob.findUnique({
        where: { id: req.params.id }
      });
      if (!job) return res.status(404).json({ error: 'Job not found' });
      res.json(job);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/admin/leads
   * Returns list of waitlist signups.
   */
  router.get('/admin/leads', checkDb, async (req, res) => {
    // For now, only internal API key (handled by middleware) is required,
    // but we should eventually add a super-admin role check.
    try {
      const leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/admin/events
   * Returns recent system events.
   */
  router.get('/admin/events', checkDb, async (req, res) => {
    try {
      const events = await prisma.appEvent.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' }
      });
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return router;
}
