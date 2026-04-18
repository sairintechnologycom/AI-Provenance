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

  console.log('✅ Demo data seeded successfully!');
  console.log(`- Workspace ID: ${workspace.id}`);
  console.log(`- Repository: ${repo.owner}/${repo.name}`);
  console.log(`- PR Number: #${pr.number}`);
  console.log(`- Packet ID: ${packet.id}`);
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
