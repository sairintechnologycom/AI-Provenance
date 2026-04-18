import express from 'express';
import { prisma } from './db.js';

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
  try {
    const repos = await prisma.repository.findMany({
      include: { organization: true },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(repos);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/repos/:owner/:repo/pulls
 * Returns list of PRs for a specific repo.
 */
router.get('/repos/:owner/:repo/pulls', checkDb, async (req, res) => {
  try {
    const prs = await prisma.pullRequest.findMany({
      where: {
        repository: {
          owner: req.params.owner,
          name: req.params.repo
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
  try {
    const packet = await prisma.mergeBriefPacket.findUnique({
      where: { id: req.params.id },
      include: {
        pullRequest: {
          include: { repository: true }
        },
        tags: true,
        intents: true,
        reviewerSuggestions: true,
        provenanceEvidence: true
      }
    });

    if (!packet) {
      return res.status(404).json({ error: 'Packet not found' });
    }

    res.json(packet);
  } catch (error) {
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

export default router;
