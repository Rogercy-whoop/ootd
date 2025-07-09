'use server';

/**
 * @fileOverview Generates outfit ideas based on weather, occasion, and user's closet.
 * This flow takes the current weather, an occasion, and an optional list of items
 * from the user's closet and returns a descriptive outfit suggestion.
 *
 * - generateOutfitIdea - A function that generates outfit ideas.
 * - GenerateOutfitIdeaInput - The input type for the generateOutfitIdea function.
 * - GenerateOutfitIdeaOutput - The return type for the generateOutfitIdea function.
 */

import {ai} from '@/ai/genkit';
import {getCurrentWeather, fetchWeather} from '@/ai/tools/weather';
import {z} from 'zod';

// We'll use Gemini directly instead of through genkit plugins
const modelToUse = 'gemini-1.5-pro';

const ClothingItemSchema = z.object({
  id: z.string().describe('A unique identifier for the clothing item.'),
  category: z
    .string()
    .describe(
      'The general category of the clothing item (e.g., top, bottom, shoes).'
    ),
  subCategory: z
    .string()
    .optional()
    .describe('A more specific category (e.g., t-shirt, jeans, sneaker).'),
  tags: z
    .array(z.string())
    .describe("Descriptive tags for the clothing item (style, material, etc.)."),
  dominantColors: z
    .array(z.string())
    .optional()
    .describe('An array of dominant color hex codes.'),
  hasPattern: z.boolean().optional().describe('Whether the item has a discernible pattern.'),
  patternDescription: z
    .string()
    .optional()
    .describe('A brief description of the pattern if one exists.'),
});

const InspirationItemSchema = z.object({
  description: z.string().describe("The description of a previously saved outfit inspiration."),
  items: z.array(ClothingItemSchema).describe("The items included in the outfit."),
});

const GenerateOutfitIdeaInputSchema = z.object({
  latitude: z.number().optional().describe('The user\'s current latitude for weather lookup.'),
  longitude: z.number().optional().describe('The user\'s current longitude for weather lookup.'),
  occasion: z.string().optional().describe('The occasion or event the user is dressing for. This is optional.'),
  closetItems: z.array(ClothingItemSchema).optional().describe("A list of clothing items available in the user's closet."),
  inspirationItems: z.array(InspirationItemSchema).optional().describe("A list of previously saved outfits that the user liked, to infer their personal style."),
});

export type GenerateOutfitIdeaInput = z.infer<typeof GenerateOutfitIdeaInputSchema>;

const GenerateOutfitIdeaOutputSchema = z.object({
  outfitDescription: z.string().describe('A concise, 2-3 sentence description of the suggested outfit.'),
  itemIds: z.array(z.string()).describe("An array of IDs of the clothing items from the closet that make up the suggested outfit. This can be empty if no suitable items are found."),
  missingItems: z.array(z.string()).optional().describe("Items that would be perfect for this weather/occasion but are missing from the closet."),
  weatherWarnings: z.array(z.string()).optional().describe("Weather-specific warnings about missing items."),
  alternativeOutfits: z.array(z.object({
    outfitDescription: z.string(),
    itemIds: z.array(z.string()),
    reason: z.string()
  })).optional().describe("Alternative outfit options for the same occasion/weather.")
});

export type GenerateOutfitIdeaOutput = z.infer<typeof GenerateOutfitIdeaOutputSchema>;

export async function generateOutfitIdea(input: GenerateOutfitIdeaInput): Promise<GenerateOutfitIdeaOutput> {
  // Check if Gemini API key is available before running the flow
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("No Gemini API key found. Please set GEMINI_API_KEY in your .env file.");
  }
  return generateOutfitIdeaFlow(input);
}

// Direct Gemini integration for outfit generation
const generateOutfitWithGemini = async (input: GenerateOutfitIdeaInput): Promise<GenerateOutfitIdeaOutput> => {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  // Get weather data if available
  let weatherData = null;
  if (input.latitude && input.longitude) {
    try {
      weatherData = await fetchWeather({ latitude: input.latitude, longitude: input.longitude });
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    }
  }

  // Build the prompt
  let prompt = `You are an expert personal stylist. Generate a comprehensive outfit suggestion with weather awareness, professional color theory, and daily fashion trends as a JSON object.

# STYLE
- Your answer should be direct, clear, and pleasant to read.
- When recommending items not in the user's closet, suggest common daily-wear items (e.g., white t-shirt, blue jeans, sneakers, black dress, etc.) that are easy to find and versatile.

# CONTEXT
- Weather: ${weatherData ? weatherData : 'Weather data not available'}
${input.occasion ? `- Occasion: ${input.occasion}` : ''}
${input.inspirationItems ? `- Style Inspiration: ${input.inspirationItems.map(item => item.description).join(', ')}` : ''}

# COLOR THEORY
- When selecting items, use professional color theory principles (such as complementary, analogous, or monochromatic color schemes) to create visually appealing and harmonious outfits. If possible, explain your color choices in the outfit description.

# DAILY FASHION
- Consider current daily fashion trends and modern street style when making outfit suggestions. Prioritize combinations that are both stylish and practical for everyday wear.

# TASK
Create a weather-appropriate outfit with intelligent suggestions for missing items.

${input.closetItems ? `
## TASK: CREATE WEATHER-AWARE, COLOR-COORDINATED, AND TRENDY OUTFIT FROM CLOSET

### Available Items
${input.closetItems.map(item => 
  `- ID: ${item.id}, Category: ${item.category}${item.subCategory ? `, Item: ${item.subCategory}` : ''}, Tags: ${item.tags.join(', ')}, Colors: ${item.dominantColors?.join(', ') || 'N/A'}`
).join('\n')}

### WEATHER-AWARE LOGIC:
1. If it's RAINY/STORMY and user has no raincoat/umbrella: Suggest what they have but warn about missing rain protection
2. If it's SUNNY/HOT and user has t-shirt but no shorts (only long pants): Suggest t-shirt + pants but recommend shorts for comfort
3. If it's COLD and user has no warm jacket: Suggest layers but warn about missing warm outerwear
4. Always prioritize user's existing items but be honest about what's missing

### REQUIREMENTS:
- Your 'outfitDescription' should be 2-3 sentences explaining the choice, any weather considerations, and the color theory or fashion trend applied
- Your 'itemIds' array MUST contain the IDs of the chosen items from their closet
- Your 'missingItems' array should list specific items they should add (e.g., "raincoat", "shorts", "warm jacket"). If you recommend an item not in the closet, prefer common daily-wear items and provide a short description (and a generic image URL if possible).
- Your 'weatherWarnings' array should contain specific weather-related warnings (e.g., "It's raining but you don't have a raincoat - consider adding one!")
- Your 'alternativeOutfits' array should contain 2-3 alternative combinations using their existing items

` : `
## TASK: CREATE GENERAL OUTFIT
Your 'outfitDescription' should be stylish, helpful, and concise (2-3 sentences), and mention the color theory or fashion trend used.
Your 'itemIds' array MUST be empty.
Your 'missingItems' array should suggest basic wardrobe essentials, and for each, provide a short description and a generic image URL if possible.
`}

# OUTPUT FORMAT
Return ONLY a JSON object with this exact structure:
{
  "outfitDescription": "2-3 sentence description with weather, color theory, and fashion trend considerations",
  "itemIds": ["id1", "id2", ...],
  "missingItems": [
    { "name": "item1", "description": "Short description", "imageUrl": "https://..." },
    { "name": "item2", "description": "Short description", "imageUrl": "https://..." }
  ],
  "weatherWarnings": ["warning1", "warning2", ...],
  "alternativeOutfits": [
    {
      "outfitDescription": "Alternative 1 description",
      "itemIds": ["id1", "id3"],
      "reason": "Why this alternative works"
    },
    {
      "outfitDescription": "Alternative 2 description", 
      "itemIds": ["id2", "id4"],
      "reason": "Why this alternative works"
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        outfitDescription: parsed.outfitDescription || 'A stylish outfit suggestion',
        itemIds: parsed.itemIds || [],
        missingItems: parsed.missingItems || [],
        weatherWarnings: parsed.weatherWarnings || [],
        alternativeOutfits: parsed.alternativeOutfits || []
      };
    }
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
  }
  
    // Fallback response
  return {
    outfitDescription: 'A stylish outfit suggestion based on your preferences and available items.',
    itemIds: input.closetItems ? input.closetItems.slice(0, 2).map(item => item.id) : [],
    missingItems: [],
    weatherWarnings: [],
    alternativeOutfits: []
  };
};

const generateOutfitIdeaFlow = async (input: GenerateOutfitIdeaInput): Promise<GenerateOutfitIdeaOutput> => {
  return generateOutfitWithGemini(input);
};
