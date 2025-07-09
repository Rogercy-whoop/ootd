'use server';

/**
 * @fileOverview This file defines a Genkit flow for tagging clothing items uploaded by the user.
 *
 * - tagClothingItem - A function that takes a clothing item image and returns rich tags for it.
 * - TagClothingItemInput - The input type for the tagClothingItem function.
 * - TagClothingItemOutput - The return type for the tagClothingItem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const TagClothingItemInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a clothing item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
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

export async function tagClothingItem({ photoDataUri }: { photoDataUri: string }): Promise<any> {
  // TEMPORARY: Disable tagging for testing background removal
  return {
    category: 'unknown',
    subCategory: 'unknown',
    tags: [],
    dominantColors: [],
    hasPattern: false,
    patternDescription: '',
  };
}

const prompt = ai.definePrompt({
  name: 'tagClothingItemPrompt',
  model: 'gemini-1.5-pro',
  input: {schema: TagClothingItemInputSchema},
  output: {schema: TagClothingItemOutputSchema},
  prompt: `You are an AI assistant specialized in analyzing and tagging clothing items from images.
  Your task is to analyze the provided image, focusing only on the primary clothing item and ignoring the background or any other objects.

  Image: {{media url=photoDataUri}}

  From the image, extract the following information:
  1.  **category**: The general category (e.g., top, bottom, shoes, accessory).
  2.  **subCategory**: A more specific category (e.g., t-shirt, jeans, sneaker, handbag).
  3.  **tags**: Relevant descriptive tags about the item's style, material, or suitable occasion (e.g., 'casual', 'cotton', 'summer', 'formal wear').
  4.  **dominantColors**: An array of the main colors present in the item, as hex codes.
  5.  **hasPattern**: A boolean indicating if the item has a repeating pattern.
  6.  **patternDescription**: If 'hasPattern' is true, describe the pattern (e.g., 'horizontal stripes', 'floral print').
  
  Please provide the output in the specified JSON format.`,
});

const tagClothingItemFlow = ai.defineFlow(
  {
    name: 'tagClothingItemFlow',
    inputSchema: TagClothingItemInputSchema,
    outputSchema: TagClothingItemOutputSchema,
  },
  async input => {
    const response = await prompt(input);
    const output = response.output;

    if (!output) {
      console.error('AI tag response did not conform to schema. Full response:', JSON.stringify(response, null, 2));
      throw new Error("The AI failed to generate valid tags. Its response was not in the expected JSON format.");
    }

    return output;
  }
);
