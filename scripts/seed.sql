-- 1. Workspace
INSERT INTO "Workspace" ("id", "name", "slackWebhookUrl", "createdAt", "updatedAt") 
VALUES ('ws_demo_123', 'Demo-Workspace', 'https://hooks.slack.com/services/mock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Organization
INSERT INTO "Organization" ("id", "githubId", "login", "workspaceId", "createdAt", "updatedAt")
VALUES ('org_demo_123', 'github_org_789', 'Acme-Corp', 'ws_demo_123', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Repository
INSERT INTO "Repository" ("id", "githubId", "owner", "name", "organizationId", "createdAt", "updatedAt")
VALUES ('repo_demo_123', 'github_repo_456', 'Acme-Corp', 'core-api', 'org_demo_123', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. PullRequest
INSERT INTO "PullRequest" ("id", "githubId", "number", "repositoryId", "status", "approvalNote", "merged", "createdAt", "updatedAt")
VALUES ('pr_demo_123', 'github_pr_111', 42, 'repo_demo_123', 'PENDING', NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 5. MergeBriefPacket
INSERT INTO "MergeBriefPacket" ("id", "pullRequestId", "status", "version", "summary", "aiTool", "confidence", "filesChangedCount", "headSha", "baseSha", "createdAt", "updatedAt")
VALUES ('packet_demo_123', 'pr_demo_123', 'COMPLETED', 1, 'This PR introduces a new JWT-based authentication middleware. High concentration of AI-generated code detected in auth-middleware.ts.', 'GitHub Copilot', 94, 12, 'a1b2c3d4', 'z9y8x7w6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 6. PacketRiskTag
INSERT INTO "PacketRiskTag" ("id", "packetId", "type", "category", "reason")
VALUES ('tag_1', 'packet_demo_123', 'DETERMINISTIC', 'auth', 'Modified core auth module');
INSERT INTO "PacketRiskTag" ("id", "packetId", "type", "category", "reason")
VALUES ('tag_2', 'packet_demo_123', 'INFERRED', 'security', 'Pattern matches JWT bypass heuristics');

-- 7. PacketIntent
INSERT INTO "PacketIntent" ("id", "packetId", "detail")
VALUES ('intent_1', 'packet_demo_123', 'Implement session handling');
INSERT INTO "PacketIntent" ("id", "packetId", "detail")
VALUES ('intent_2', 'packet_demo_123', 'Refactor error logging');

-- 8. PacketReviewerSuggestion
INSERT INTO "PacketReviewerSuggestion" ("id", "packetId", "username", "reason")
VALUES ('sugg_1', 'packet_demo_123', 'security-tom', 'Auth domain expert');
