const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

/**
 * GET /api/repos
 * Returns list of tracked repositories.
 */
router.get('/repos', async (req, res) => {
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
router.get('/repos/:owner/:repo/pulls', async (req, res) => {
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
router.get('/repos/:owner/:repo/pulls/:number/packet', async (req, res) => {
  try {
    const pr = await prisma.pullRequest.findUnique({
      where: {
        repositoryId_number: {
          repositoryId: (await prisma.repository.findFirst({
            where: { owner: req.params.owner, name: req.params.repo }
          })).id,
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
router.get('/packets/:id', async (req, res) => {
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
router.get('/jobs/:id', async (req, res) => {
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

module.exports = router;
