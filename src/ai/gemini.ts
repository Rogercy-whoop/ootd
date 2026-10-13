import { GoogleGenerativeAI, type Part } from '@google/generative-ai';

// Models to try, in order. On the free tier the larger "flash" models often answered
// "503 high demand" (one took over 3 minutes) while the "flash-lite" models replied in
// about a second, so the app uses flash-lite and falls through to the next if one is busy.
// Set GEMINI_MODEL to put a different model first without a code change.
const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];

// Give up on a model after this long rather than leave the user waiting.
const REQUEST_TIMEOUT_MS = 12_000;

function modelNames(): string[] {
  const configured = process.env.GEMINI_MODEL;
  return configured ? [configured, ...DEFAULT_MODELS.filter(m => m !== configured)] : DEFAULT_MODELS;
}

function isBusy(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('503') || /overloaded|unavailable|high demand|abort|timed? ?out/i.test(message);
}

// Sends a prompt (text and optional image parts) to Gemini and returns the parsed JSON reply.
export async function generateJson(parts: string | Array<string | Part>): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set on the server.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError: unknown;
  for (const name of modelNames()) {
    const model = genAI.getGenerativeModel(
      {
        model: name,
        // Ask Gemini for raw JSON so we don't have to dig it out of prose.
        generationConfig: { responseMimeType: 'application/json' },
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    try {
      const result = await model.generateContent(parts);
      return parseJsonReply(result.response.text());
    } catch (error) {
      lastError = error;
      if (!isBusy(error)) throw error;
      console.warn(`[gemini] ${name} is busy, trying the next model`);
    }
  }
  throw lastError;
}

// Turns a data URI ("data:image/webp;base64,....") into the inline image part Gemini expects.
export function imagePartFromDataUri(dataUri: string): Part {
  const match = dataUri.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data.');
  }
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

// Parses Gemini's JSON reply, tolerating stray text around the object.
function parseJsonReply(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('The AI reply was not valid JSON.');
  }
  return JSON.parse(jsonMatch[0]);
}

// Server action errors are hidden in production builds, so actions return this
// plain-English message to the browser instead of throwing.
export function friendlyAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[gemini]', message);
  if (message.includes('GEMINI_API_KEY')) {
    return 'The AI service is not set up on this server yet.';
  }
  if (message.includes('429') || /quota|rate limit|resource.?exhausted/i.test(message)) {
    return "The app has reached its free AI usage limit for now. Please try again in a few minutes.";
  }
  if (/location is not supported/i.test(message)) {
    // Gemini refuses requests from some regions, including mainland China.
    return "The AI service isn't available from the region this server is running in.";
  }
  if (/api key not valid|api_key_invalid|permission.?denied/i.test(message)) {
    return 'The AI service rejected this server\'s API key.';
  }
  if (isBusy(error)) {
    return 'The AI service is busy right now. Please try again in a moment.';
  }
  // Include the HTTP status (never the key) so failures can be told apart.
  const status = message.match(/\[(\d{3})[^\]]*\]/)?.[1];
  return `Something went wrong while talking to the AI${status ? ` (error ${status})` : ''}. Please try again.`;
}
