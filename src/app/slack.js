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
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View MergeBrief Packet",
          emoji: true
        },
        url: packetLink,
        style: "primary"
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
