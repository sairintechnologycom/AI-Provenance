import { Anthropic } from '@anthropic-ai/sdk';

/**
 * Secondary verification logic using a lightweight LLM.
 * Used to reduce false positives/negatives in AI detection.
 */
export async function verifyAIGeneration(diff, currentConfidence, methods) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { verifiedConfidence: currentConfidence, verified: false, reason: 'LLM not configured' };
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = `
You are an expert code analyst specializing in AI presence detection.
Review the provided git diff and the existing heuristic analysis results.
Your goal is to determine if the code was likely produced by an LLM (Copilot, ChatGPT, etc.) or a Human.

AI often shows:
- Perfect indentation and consistent commenting style.
- Over-explanation of simple functions.
- Generic placeholders like "TODO: Insert logic here".
- Common boilerplate patterns from popular models.

Human code often shows:
- More varied comment styles and punctuation.
- Iterative tweaks or specific "hacks" with context.
- Domain-specific variable naming that feels less "textbook".

Respond ONLY in JSON format:
{
  "consensus": "AI" | "HUMAN" | "UNCERTAIN",
  "confidenceScore": number (0-100),
  "reasoning": "Short string explanation"
}
`;

  const userMessage = `
Current Analysis:
- Heuristic Confidence: ${currentConfidence}
- Detection Methods: ${methods.join(', ')}

Git Diff:
${diff.substring(0, 15000)}
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        { role: "user", content: userMessage }
      ],
    });

    const result = JSON.parse(response.content[0].text);
    
    // Weighted adjustment
    let finalConfidence = currentConfidence;
    if (result.consensus === 'AI') {
      finalConfidence = Math.max(currentConfidence, result.confidenceScore);
    } else if (result.consensus === 'HUMAN') {
      finalConfidence = Math.min(currentConfidence, 100 - result.confidenceScore);
    }

    return {
      verifiedConfidence: Math.round(finalConfidence),
      verified: true,
      reason: result.reasoning,
      consensus: result.consensus
    };
  } catch (error) {
    console.error(`[LLM-Verifier] Error: ${error.message}`);
    return { verifiedConfidence: currentConfidence, verified: false, reason: error.message };
  }
}
