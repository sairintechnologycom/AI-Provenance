import 'dotenv/config';
import { App } from '@octokit/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncInstallations() {
  console.log('🔄 Manual Sync: Fetching installations and repositories...');

  if (!process.env.APP_ID || !process.env.PRIVATE_KEY) {
    console.error('❌ Missing APP_ID or PRIVATE_KEY in .env');
    process.exit(1);
  }

  const app = new App({
    appId: process.env.APP_ID,
    privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
  });

  // Iterate over all installations of this app
  await app.eachInstallation(async ({ installation, octokit }) => {
    const owner = installation.account.login;
    const githubId = String(installation.account.id);
    const installationId = installation.id;

    console.log(`\n📦 Processing Installation: ${owner} (ID: ${installationId})`);

    try {
      // 1. Sync Organization
      let dbOrg = await prisma.organization.upsert({
        where: { githubId },
        update: { login: owner },
        create: { githubId, login: owner }
      });

      // 2. Auto-link to the first available workspace if not linked
      if (!dbOrg.workspaceId) {
        const firstWorkspace = await prisma.workspace.findFirst();
        if (firstWorkspace) {
          dbOrg = await prisma.organization.update({
            where: { id: dbOrg.id },
            data: { workspaceId: firstWorkspace.id }
          });
          console.log(`  ✅ Auto-linked to workspace: ${firstWorkspace.name}`);
        }
      }

      // 3. Fetch Repositories for this installation
      // Using generic request to avoid potential rest plugin issues
      console.log('  Fetching repositories...');
      const response = await octokit.request('GET /installation/repositories', {
        per_page: 100
      });

      const repositories = response.data.repositories;
      console.log(`  Found ${repositories.length} repositories`);

      for (const repo of repositories) {
        await prisma.repository.upsert({
          where: { githubId: String(repo.id) },
          update: { owner, name: repo.name },
          create: {
            githubId: String(repo.id),
            owner,
            name: repo.name,
            organizationId: dbOrg.id
          }
        });
        console.log(`  📂 Synced: ${owner}/${repo.name}`);
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${owner}:`, error.message);
      if (error.stack) console.debug(error.stack);
    }
  });

  console.log('\n✅ Manual sync complete! Refresh your dashboard.');
}

syncInstallations()
  .catch(err => {
    console.error('❌ Fatal Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
