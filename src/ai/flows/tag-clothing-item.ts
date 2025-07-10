'use server';

/**
 * @fileOverview This file defines a flow for tagging clothing items uploaded by the user.
 * Uses Google Generative AI directly for better image processing capabilities.
 */

import {z} from 'zod';
import type { Gender } from '@/lib/types';
import { getGenderSpecificCategories, CLOTHING_CATEGORIES } from './tag-categories';

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

export async function tagClothingItem({ photoDataUri, gender }: { photoDataUri: string; gender?: Gender }): Promise<TagClothingItemOutput> {
  // Check if Gemini API key is available
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("No Gemini API key found. Please set GEMINI_API_KEY in your .env file.");
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Use gemini-1.5-flash which is better for image analysis and more cost-effective
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const genderContext = gender && gender !== 'prefer-not-to-say' 
      ? `\nUser Gender: ${gender} - Please consider ${gender}-specific clothing categories and styles.`
      : '\nUser Gender: Not specified - Use general clothing categories.';

    const prompt = `You are an expert fashion analyst. Analyze this clothing item image and provide detailed information.

Image: [The clothing item image]${genderContext}

Please analyze the image and return a JSON object with the following structure:

{
  "category": "The main category (top, bottom, shoes, accessory, outerwear)",
  "subCategory": "Specific item type (e.g., t-shirt, jeans, sneakers, blouse)",
  "tags": ["array", "of", "descriptive", "tags", "like", "casual", "cotton", "summer", "formal"],
  "dominantColors": ["#HEXCODE1", "#HEXCODE2"],
  "hasPattern": true/false,
  "patternDescription": "Description of pattern if present (e.g., 'stripes', 'floral', 'geometric')"
}

Guidelines:
- Focus only on the clothing item, ignore background
- Use common color names and convert to hex codes
- Be specific with subCategory (e.g., 'crew neck t-shirt' not just 't-shirt')
- Include style, material, and occasion tags
- If no pattern, set hasPattern to false and patternDescription to empty string
- Consider gender-specific terminology and categories when applicable

Return ONLY the JSON object, no other text.`;

    const result = await model.generateContent([prompt, photoDataUri]);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and return the result
    return {
      category: parsed.category || 'unknown',
      subCategory: parsed.subCategory || 'unknown',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors : [],
      hasPattern: Boolean(parsed.hasPattern),
      patternDescription: parsed.patternDescription || ''
    };
    
  } catch (error) {
    console.error('Error in tagClothingItem:', error);
    
    // Fallback response
    return {
      category: 'unknown',
      subCategory: 'unknown',
      tags: [],
      dominantColors: [],
      hasPattern: false,
      patternDescription: ''
    };
  }
}
