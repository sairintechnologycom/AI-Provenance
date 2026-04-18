/**
 * Sends a notification to Slack via Webhook.
 * @param {string} webhookUrl - Incoming webhook URL.
 * @param {object} packet - The MergeBriefPacket object.
 * @param {object} pr - The PullRequest and Repository context.
 */
export async function sendSlackNotification(webhookUrl, packet, pr) {
  if (!webhookUrl) return;

  const repoPath = `${pr.repository.owner}/${pr.repository.name}`;
  const prLink = `https://github.com/${repoPath}/pull/${pr.number}`;
  const packetLink = `${process.env.APP_URL}/packets/${packet.id}`;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🚀 MergeBrief Packet Ready: PR #${pr.number}`,
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Repository:* <https://github.com/${repoPath}|${repoPath}>\n*Pull Request:* <${prLink}|#${pr.number}: ${packet.summary || "No summary available"}>`
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Confidence:*\n${packet.confidence}%`
        },
        {
          type: "mrkdwn",
          text: `*AI Tool:*\n${packet.aiTool || "Unknown"}`
        }
      ]
    }
  ];

  // Add tags if present
  if (packet.tags && packet.tags.length > 0) {
    const tagList = packet.tags.map(t => `\`${t.category}\``).join(", ");
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Signals:* ${tagList}`
      }
    });
  }

  blocks.push({
    type: "actions",
    block_id: `pr_action_${pr.number}`,
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "🚀 View Packet",
          emoji: true
        },
        url: packetLink,
        action_id: "view_packet"
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "✅ Approve PR",
          emoji: true
        },
        value: JSON.stringify({
          packetId: packet.id,
          prNumber: pr.number,
          owner: pr.repository.owner,
          repo: pr.repository.name
        }),
        action_id: "approve_pr",
        style: "primary",
        confirm: {
          title: {
            type: "plain_text",
            text: "Are you sure?"
          },
          text: {
            type: "plain_text",
            text: "This will record a 'Global Approval' for this AI-assisted PR."
          },
          confirm: {
            type: "plain_text",
            text: "Confirm Approval"
          },
          deny: {
            type: "plain_text",
            text: "Cancel"
          }
        }
      }
    ]
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks })
    });

    if (!response.ok) {
      throw new Error(`Slack API responded with ${response.status}`);
    }
  } catch (error) {
    console.error(`[Slack Error] Failed to send notification for packet ${packet.id}:`, error.message);
  }
}
