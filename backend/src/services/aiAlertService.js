import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';

// Validate AI response structure before it touches any application logic
const aiResponseSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  recommendation: z.string().min(1).max(1000),
  possible_causes: z.array(z.string().min(1).max(500)).min(0).max(10),
});

/**
 * Build a deterministic fallback alert when LLM is unavailable or returns invalid data.
 * This must NOT claim to be AI-generated.
 */
const buildFallbackAlert = (event, anomalies) => {
  const types = anomalies.map((a) => a.type).join(', ');
  return {
    title: `API Anomaly Detected: ${event.api_name}`,
    message: `Anomalies detected for ${event.api_name}: ${anomalies.map((a) => a.description).join('; ')}.`,
    recommendation:
      'Check API logs and service health dashboards. Verify upstream dependencies and database connectivity.',
    possible_causes: anomalies.map((a) => `Anomaly type: ${a.type}`),
    ai_generated: false,
  };
};

let openaiClient = null;

const getOpenAIClient = () => {
  if (!config.openai.apiKey) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: config.openai.timeoutMs,
      maxRetries: config.openai.maxRetries,
    });
  }
  return openaiClient;
};

/**
 * Generate a human-readable alert via LLM.
 * Falls back gracefully on any failure — never surfaces provider errors to clients.
 */
export const generateAIAlert = async (event, anomalies) => {
  const client = getOpenAIClient();

  if (!client) {
    logger.info({ api_name: event.api_name }, 'OpenAI key not configured — using fallback alert');
    return buildFallbackAlert(event, anomalies);
  }

  const userPrompt = buildUserPrompt(event, anomalies);

  try {
    const completion = await client.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) throw new Error('Empty response from LLM');

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error('LLM returned non-JSON content');
    }

    // Validate structure — never trust AI output blindly
    const validated = aiResponseSchema.safeParse(parsed);
    if (!validated.success) {
      logger.warn({ errors: validated.error.errors }, 'LLM response failed schema validation — using fallback');
      return buildFallbackAlert(event, anomalies);
    }

    logger.info({ api_name: event.api_name, model: config.openai.model }, 'AI alert generated successfully');

    return {
      title: validated.data.title,
      message: validated.data.message,
      recommendation: validated.data.recommendation,
      possible_causes: validated.data.possible_causes,
      ai_generated: true,
    };
  } catch (err) {
    // Classify the error without exposing provider internals
    const isTimeout = err.code === 'ETIMEDOUT' || err.message?.includes('timeout');
    logger.warn(
      { api_name: event.api_name, error: err.message, isTimeout },
      'LLM call failed — using deterministic fallback alert'
    );
    return buildFallbackAlert(event, anomalies);
  }
};

// Exposed for testing
export { buildFallbackAlert, aiResponseSchema };
export default { generateAIAlert, buildFallbackAlert };
