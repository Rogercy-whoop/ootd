import { GoogleGenerativeAI } from '@google/generative-ai';

// One place to choose the Gemini model. Set GEMINI_MODEL to switch models without a code change.
const DEFAULT_MODEL = 'gemini-3.5-flash';

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set on the server.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    // Ask Gemini for raw JSON so we don't have to dig it out of prose.
    generationConfig: { responseMimeType: 'application/json' },
  });
}

// Turns a data URI ("data:image/webp;base64,....") into the inline image part Gemini expects.
export function imagePartFromDataUri(dataUri: string) {
  const match = dataUri.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data.');
  }
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

// Parses Gemini's JSON reply, tolerating stray text around the object.
export function parseJsonReply(text: string): any {
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
  if (message.includes('503') || /overloaded|unavailable/i.test(message)) {
    return 'The AI service is busy right now. Please try again in a moment.';
  }
  return 'Something went wrong while talking to the AI. Please try again.';
}
