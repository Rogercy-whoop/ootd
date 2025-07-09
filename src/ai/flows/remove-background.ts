'use server';

/**
 * @fileOverview This file defines a Genkit flow for removing the background from a clothing item image.
 *
 * - removeBackground - A function that takes a clothing item image and returns a new image with a transparent background.
 * - RemoveBackgroundInput - The input type for the removeBackground function.
 * - RemoveBackgroundOutput - The output type for the removeBackground function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {GoogleGenerativeAI} from '@google/generative-ai';
import fetch from 'node-fetch';
import { getAdminStorage } from '@/lib/firebaseAdmin';

const RemoveBackgroundInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a clothing item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RemoveBackgroundInput = z.infer<typeof RemoveBackgroundInputSchema>;

const RemoveBackgroundOutputSchema = z.object({
  photoDataUri: z.string().describe("The data URI of the new image with a transparent background."),
});
export type RemoveBackgroundOutput = z.infer<typeof RemoveBackgroundOutputSchema>;

export async function removeBackground(input: RemoveBackgroundInput): Promise<RemoveBackgroundOutput> {
  return removeBackgroundFlow(input);
}

const removeBackgroundFlow = ai.defineFlow(
  {
    name: 'removeBackgroundFlow',
    inputSchema: RemoveBackgroundInputSchema,
    outputSchema: RemoveBackgroundOutputSchema,
  },
  async (input) => {
    try {
      const apiToken = process.env.REPLICATE_API_TOKEN;
      if (!apiToken) {
        throw new Error('REPLICATE_API_TOKEN is not set in the environment.');
      }

      // Convert data URI to base64 (strip prefix)
      const base64 = input.photoDataUri.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

      // Upload to Firebase Storage using Admin SDK
      let imageUrl: string;
      try {
        // Create a unique filename
        const filename = `background-removal/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const adminStorage = await getAdminStorage();
        const bucket = adminStorage.bucket();
        const file = bucket.file(filename);

        // Convert base64 to buffer
        const buffer = Buffer.from(base64, 'base64');

        // Upload to Firebase Storage
        await file.save(buffer, {
          contentType: 'image/jpeg',
          public: true, // Make the file publicly accessible
          metadata: {
            cacheControl: 'public, max-age=3600',
          },
        });

        // Get the public URL
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      } catch (firebaseError) {
        console.error('Firebase Storage upload failed:', firebaseError);
        throw new Error('Failed to upload image to storage for background removal.');
      }

      // Call Replicate API
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc', // 851-labs/background-remover
          input: { image: imageUrl },
        }),
      });
      const json = await response.json() as { urls?: { get?: string } };
      if (!json || !json.urls || !json.urls.get) {
        throw new Error('Failed to start background removal prediction.');
      }

      // Poll for result
      let resultUrl = json.urls.get;
      let outputUrl = null;
      for (let i = 0; i < 20; i++) {
        const pollRes = await fetch(resultUrl, {
          headers: { 'Authorization': `Token ${apiToken}` },
        });
        const pollJson = await pollRes.json() as { status?: string; output?: string | string[] };
        if (pollJson.status === 'succeeded' && pollJson.output) {
          outputUrl = pollJson.output;
          break;
        }
        if (pollJson.status === 'failed') {
          throw new Error('Background removal failed.');
        }
        await new Promise(res => setTimeout(res, 1500));
      }
      if (!outputUrl) {
        throw new Error('Background removal timed out.');
      }

      // Download the transparent PNG and convert to data URI
      const imgRes = await fetch(Array.isArray(outputUrl) ? outputUrl[0] : outputUrl);
      const imgBuffer = await imgRes.buffer();
      const resultDataUri = `data:image/png;base64,${imgBuffer.toString('base64')}`;
      return { photoDataUri: resultDataUri };
      
    } catch (error) {
      console.error('Background removal failed:', error);
      // Fallback to original image
      return { photoDataUri: input.photoDataUri };
    }
  }
);
