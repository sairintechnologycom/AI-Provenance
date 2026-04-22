import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding interactive demo data...');

  // 1. Cleanup
  await prisma.appEvent.deleteMany({});
  await prisma.mergeBriefPacket.deleteMany({});
  await prisma.pullRequest.deleteMany({});
  await prisma.repository.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.workspace.deleteMany({});

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Design Partner Beta',
      slackWebhookUrl: 'https://hooks.slack.com/services/mock/webhook',
    }
  });

  // 3. Create Org & Repo
  const org = await prisma.organization.create({
    data: {
      githubId: 'org-12345',
      login: 'Acme-Corp',
      workspaceId: workspace.id
    }
  });

  const repo = await prisma.repository.create({
    data: {
      githubId: 'repo-67890',
      owner: 'Acme-Corp',
      name: 'core-api',
      organizationId: org.id
    }
  });

  // 4. Create Pull Request
  const pr = await prisma.pullRequest.create({
    data: {
      githubId: 'pr-999',
      number: 42,
      repositoryId: repo.id,
      status: 'PENDING',
      latencySeconds: 124,
    }
  });

  // 5. Create MergeBrief Packet (The Star of the Show)
  const packet = await prisma.mergeBriefPacket.create({
    data: {
      pullRequestId: pr.id,
      status: 'COMPLETED',
      summary: 'This PR introduces a new authentication middleware and updates the core database schema. High concentration of AI-generated code detected in the auth module.',
      aiTool: 'GitHub Copilot',
      confidence: 94,
      filesChangedCount: 12,
      headSha: 'a1b2c3d4e5f6',
      baseSha: 'z9y8x7w6v5u4',
      tags: {
        create: [
          { type: 'DETERMINISTIC', category: 'auth', reason: 'Modified auth-middleware.ts' },
          { type: 'INFERRED', category: 'infra', reason: 'Updates database connection pooling logic' },
          { type: 'DETERMINISTIC', category: 'security', reason: 'Added sensitive headers to API responses' }
        ]
      },
      intents: {
        create: [
          { detail: 'Implement JWT session handling' },
          { detail: 'Optimize PostgreSQL connection pooling' },
          { detail: 'Refactor error handling in API controllers' }
        ]
      },
      reviewerSuggestions: {
        create: [
          { username: 'security-expert-rob', reason: 'Auth module owner' },
          { username: 'infra-guru-sam', reason: 'Connection pooling changes' }
        ]
      },
      provenanceEvidence: {
        create: [
          { file: 'src/middleware/auth.ts', method: 'trailer', confidence: 100 },
          { file: 'src/db/pool.ts', method: 'heuristic', confidence: 85 }
        ]
      }
    }
  });

  // 4b. Create Human-Led PR (#43)
  const pr43 = await prisma.pullRequest.create({
    data: {
      githubId: 'pr-1001',
      number: 43,
      repositoryId: repo.id,
      status: 'APPROVED',
      approvalNote: 'Verified human logic for the critical race condition fix.',
      latencySeconds: 45,
    }
  });

  await prisma.mergeBriefPacket.create({
    data: {
      pullRequestId: pr43.id,
      status: 'COMPLETED',
      summary: 'Bug fix for connection race condition. This PR is predominantly human-authored with high-confidence manual logic patterns detected.',
      aiTool: null,
      confidence: 12,
      filesChangedCount: 2,
      headSha: 'b2c3d4e5f6a1',
      baseSha: 'a1b2c3d4e5f6',
      tags: {
        create: [
          { type: 'DETERMINISTIC', category: 'logic', reason: 'Manual mutex implementation' }
        ]
      },
      intents: {
        create: [{ detail: 'Fix race condition in connection manager' }]
      },
      reviewerSuggestions: {
        create: [{ username: 'lead-dev-jane', reason: 'Concurrency expert' }]
      },
      provenanceEvidence: {
        create: [{ method: 'heuristic', confidence: 10 }]
      }
    }
  });

  // 4c. Create High-Risk PR (#44)
  const pr44 = await prisma.pullRequest.create({
    data: {
      githubId: 'pr-1002',
      number: 44,
      repositoryId: repo.id,
      status: 'REJECTED',
      approvalNote: 'Rejected due to insecure infrastructure exposed by AI configuration scaffold.'
    }
  });

  await prisma.mergeBriefPacket.create({
    data: {
      pullRequestId: pr44.id,
      status: 'COMPLETED',
      summary: 'Infrastructure update for staging environment. AI-generated terraform scripts detected with major security misconfigurations.',
      aiTool: 'Claude 3.5 Sonnet',
      confidence: 65,
      filesChangedCount: 8,
      headSha: 'c3d4e5f6a1b2',
      baseSha: 'b2c3d4e5f6a1',
      tags: {
        create: [
          { type: 'DETERMINISTIC', category: 'security', reason: 'Public S3 bucket detected' },
          { type: 'INFERRED', category: 'infra', reason: 'Standard AI boilerplate for AWS' }
        ]
      },
      intents: {
        create: [{ detail: 'Scale staging to 3 nodes' }]
      },
      reviewerSuggestions: {
        create: [
          { username: 'security-expert-rob', reason: 'S3 permission review' },
          { username: 'infra-guru-sam', reason: 'AWS scaling owner' }
        ]
      },
      provenanceEvidence: {
        create: [
          { file: 'main.tf', method: 'heuristic', confidence: 70 },
          { file: 'outputs.tf', method: 'fingerprint:boilerplate-scaffold', confidence: 60 }
        ]
      }
    }
  });

  // 4d. Create Mixed PR (#45)
  const pr45 = await prisma.pullRequest.create({
    data: {
      githubId: 'pr-1003',
      number: 45,
      repositoryId: repo.id,
      status: 'PENDING'
    }
  });

  await prisma.mergeBriefPacket.create({
    data: {
      pullRequestId: pr45.id,
      status: 'COMPLETED',
      summary: 'Expansion of the analytics service. Contains a mix of human structural changes and AI-generated helper functions.',
      aiTool: 'Mixed Sources',
      confidence: 45,
      filesChangedCount: 5,
      headSha: 'd4e5f6a1b2c3',
      baseSha: 'c3d4e5f6a1b2',
      tags: {
        create: [
          { type: 'INFERRED', category: 'analytics', reason: 'Pattern suggests AI helpers' }
        ]
      },
      intents: {
        create: [
          { detail: 'Add weekly digest generator' },
          { detail: 'Refactor analytics event mapper' }
        ]
      },
      reviewerSuggestions: {
        create: [{ username: 'data-scientist-alice', reason: 'Analytics owner' }]
      },
      provenanceEvidence: {
        create: [
          { file: 'helpers.js', method: 'heuristic', confidence: 80 },
          { file: 'service.js', method: 'fingerprint:excessive-jsdoc', confidence: 30 }
        ]
      }
    }
  });

  console.log('✅ Demo data seeded successfully!');
  console.log(`- Workspace ID: ${workspace.id}`);
  console.log(`- Repository: ${repo.owner}/${repo.name}`);
  console.log(`- PRs Seeded: #${pr.number}, #${pr43.number}, #${pr44.number}, #${pr45.number}`);
  console.log('\n🚀 Next Steps:');
  console.log('1. Run `npm run dev:all`');
  console.log('2. Open http://localhost:3001 in your browser');
  console.log('3. Log in with GitHub and enjoy the demo!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
