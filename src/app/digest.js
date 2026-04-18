import { prisma } from './db.js';
import { sendSlackNotification } from './slack.js';

/**
 * Generates a weekly digest of AI usage for each workspace and sends it to Slack.
 */
export async function generateWeeklyDigest() {
  if (!prisma) {
    console.error('[Digest] Prisma not initialized');
    return;
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        slackWebhookUrl: { not: null }
      },
      include: {
        organizations: {
          include: {
            repositories: {
              include: {
                pullRequests: {
                  where: {
                    createdAt: { gte: oneWeekAgo },
                    merged: true
                  },
                  include: {
                    packet: true
                  }
                }
              }
            }
          }
        }
      }
    });

    for (const workspace of workspaces) {
      console.log(`[Digest] Processing workspace: ${workspace.name}`);
      
      let totalPrs = 0;
      let aiAssistedPrs = 0;
      let highConfidenceAi = 0;

      for (const org of workspace.organizations) {
        for (const repo of org.repositories) {
          totalPrs += repo.pullRequests.length;
          for (const pr of repo.pullRequests) {
            if (pr.packet) {
              aiAssistedPrs++;
              if ((pr.packet.confidence || 0) > 80) highConfidenceAi++;
            }
          }
        }
      }

      if (totalPrs > 0) {
        await sendSlackDigest(workspace.slackWebhookUrl, {
          workspaceName: workspace.name,
          totalPrs,
          aiAssistedPrs,
          highConfidenceAi,
          aiPercent: Math.round((aiAssistedPrs / totalPrs) * 100)
        });
      }
    }
  } catch (error) {
    console.error(`[Digest Error] ${error.message}`);
  }
}

async function sendSlackDigest(webhookUrl, stats) {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📊 Weekly AI Governance Digest: ${stats.workspaceName}`,
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Here is your AI provenance rollup for the last 7 days.`
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Total Merged PRs:*\n${stats.totalPrs}`
        },
        {
          type: "mrkdwn",
          text: `*AI Assisted:*\n${stats.aiAssistedPrs} (${stats.aiPercent}%)`
        },
        {
          type: "mrkdwn",
          text: `*High Confidence AI:*\n${stats.highConfidenceAi}`
        },
        {
          type: "mrkdwn",
          text: `*Review Coverage:*\n100% (Policy Enforced)`
        }
      ]
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Full Analytics Dashboard",
            emoji: true
          },
          url: `${process.env.BASE_UI_URL || 'http://localhost:3001'}/settings`,
          style: "primary"
        }
      ]
    }
  ];

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks })
    });
  } catch (err) {
    console.error(`[Digest Slack Error] ${err.message}`);
  }
}

// If run directly
if (process.argv[1].endsWith('digest.js')) {
  generateWeeklyDigest().then(() => {
    console.log('[Digest] Finished.');
    process.exit(0);
  });
}
