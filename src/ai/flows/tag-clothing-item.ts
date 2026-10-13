'use server';

/**
 * @fileOverview This file defines a flow for tagging clothing items uploaded by the user.
 * Uses Google Generative AI directly for better image processing capabilities.
 */

import {z} from 'zod';
import type { Gender } from '@/lib/types';
import { generateJson, imagePartFromDataUri, friendlyAiError } from '@/ai/gemini';

const TagClothingItemInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a clothing item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']).optional().describe('User gender for better categorization'),
});
export type TagClothingItemInput = z.infer<typeof TagClothingItemInputSchema>;

const TagClothingItemOutputSchema = z.object({
  category: z
    .string()
    .describe(
      'The general category of the clothing item (e.g., top, bottom, shoes, accessory).'
    ),
  subCategory: z
    .string()
    .describe('A more specific category (e.g., t-shirt, jeans, sneaker).'),
  tags: z
    .array(z.string())
    .describe(
      'An array of descriptive tags for the clothing item (e.g., casual, cotton, summer, formal wear).'
    ),
  dominantColors: z
    .array(z.string().describe("A dominant color hex code (e.g., '#FFFFFF')."))
    .describe(
      'An array of the main colors present in the item, as hex codes.'
    ),
  hasPattern: z
    .boolean()
    .describe('Whether the item has a discernible pattern.'),
  patternDescription: z
    .string()
    .optional()
    .describe('A brief description of the pattern if one exists.'),
});
export type TagClothingItemOutput = z.infer<typeof TagClothingItemOutputSchema>;

// The browser shrinks photos to 1024px before upload, which is well under this.
const MAX_IMAGE_DATA_URI_LENGTH = 2_000_000; // ~1.5 MB image

export async function tagClothingItem({ photoDataUri, gender }: { photoDataUri: string; gender?: Gender }): Promise<TagClothingItemOutput | { error: string }> {
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(photoDataUri)) {
    return { error: 'Please upload a PNG, JPG, or WEBP image.' };
  }
  if (photoDataUri.length > MAX_IMAGE_DATA_URI_LENGTH) {
    return { error: 'That image is too large. Please try a smaller photo.' };
  }

  try {
    const genderContext = gender && gender !== 'prefer-not-to-say' 
      ? `\nUser Gender: ${gender} - Please consider ${gender}-specific clothing categories and styles.`
      : '\nUser Gender: Not specified - Use general clothing categories.';

    const prompt = `You are an expert fashion analyst specializing in clothing item classification and analysis. Analyze this clothing item image with high precision.

Image: [The clothing item image]${genderContext}

Please analyze the image and return a JSON object with the following structure:

{
  "category": "The main category (top, bottom, shoes, accessory, outerwear)",
  "subCategory": "Specific item type (e.g., crew neck t-shirt, skinny jeans, running sneakers, silk blouse)",
  "tags": ["array", "of", "descriptive", "tags", "like", "casual", "cotton", "summer", "formal", "fitted", "loose", "vintage", "modern"],
  "dominantColors": ["#HEXCODE1", "#HEXCODE2"],
  "hasPattern": true/false,
  "patternDescription": "Description of pattern if present (e.g., 'stripes', 'floral', 'geometric', 'solid')"
}

Analysis Guidelines:
- Focus ONLY on the clothing item, completely ignore background elements
- Be extremely specific with subCategory (e.g., 'crew neck cotton t-shirt' not just 't-shirt')
- Include comprehensive tags: style (casual/formal), material (cotton/denim/silk), fit (fitted/loose), season (summer/winter), occasion (work/casual/athletic)
- Convert color names to accurate hex codes (e.g., navy blue = #000080, burgundy = #800020)
- For patterns: be specific (e.g., 'vertical stripes', 'floral print', 'geometric pattern', 'solid color')
- Consider gender-specific terminology and categories when applicable
- If the image is unclear or shows multiple items, focus on the most prominent clothing item

Return ONLY the JSON object, no other text or explanations.`;

    const parsed = await generateJson([prompt, imagePartFromDataUri(photoDataUri)]);
    const validatedResult = {
      category: parsed.category || 'unknown',
      subCategory: parsed.subCategory || 'unknown',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag: any) => typeof tag === 'string') : [],
      dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors.filter((color: any) => typeof color === 'string' && color.startsWith('#')) : [],
      hasPattern: Boolean(parsed.hasPattern),
      patternDescription: parsed.patternDescription || ''
    };
    return validatedResult;
  } catch (error) {
    // Report the failure instead of saving an "unknown" item to the closet.
    return { error: friendlyAiError(error) };
  }
}
