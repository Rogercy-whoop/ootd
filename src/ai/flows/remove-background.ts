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
import sharp from 'sharp';

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
        console.error('No REPLICATE_API_TOKEN in environment');
        throw new Error('REPLICATE_API_TOKEN is not set in the environment.');
      }

      // Detect MIME type and strip prefix
      const match = input.photoDataUri.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.*)$/);
      if (!match) {
        console.error('[remove-background] Invalid data URI format. Prefix:', input.photoDataUri.slice(0, 100));
        throw new Error('Invalid data URI format');
      }
      const mimeType = match[1];
      let ext = 'jpg';
      if (mimeType === 'image/png') ext = 'png';
      else if (mimeType === 'image/webp') ext = 'webp';
      const base64 = match[3];
      console.log(`[remove-background] Detected MIME type: ${mimeType}, using extension: .${ext}`);

      // Upload to Firebase Storage using Admin SDK
      let imageUrl: string;
      try {
        // Create a unique filename
        const filename = `background-removal/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const adminStorage = await getAdminStorage();
        const bucket = adminStorage.bucket();
        const file = bucket.file(filename);

        // Convert base64 to buffer
        const buffer = Buffer.from(base64, 'base64');
        console.log(`[remove-background] Buffer first bytes:`, buffer.slice(0, 16));
        console.log(`[remove-background] Uploading to Firebase Storage: ${filename}`);

        // Upload to Firebase Storage
        await file.save(buffer, {
          contentType: mimeType,
          public: true, // Make the file publicly accessible
          metadata: {
            cacheControl: 'public, max-age=3600',
          },
        });

        // Get the public URL
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        console.log(`[remove-background] Uploaded image URL: ${imageUrl}`);
      } catch (firebaseError) {
        console.error('[remove-background] Firebase Storage upload failed:', firebaseError);
        throw new Error('Failed to upload image to storage for background removal.');
      }

      // Call Replicate API
      try {
        console.log('[remove-background] Calling Replicate API with image:', imageUrl);
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
        console.log('[remove-background] Replicate API response:', json);
        if (!json || !json.urls || !json.urls.get) {
          throw new Error('Failed to start background removal prediction.');
        }

        // Poll for result
        let resultUrl = json.urls.get;
        let outputUrl = null;
        for (let i = 0; i < 20; i++) {
          console.log(`[remove-background] Polling Replicate result: attempt ${i+1}`);
          const pollRes = await fetch(resultUrl, {
            headers: { 'Authorization': `Token ${apiToken}` },
          });
          const pollJson = await pollRes.json() as { status?: string; output?: string | string[] };
          console.log(`[remove-background] Poll result:`, pollJson);
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
        console.log('[remove-background] Downloading result image:', outputUrl);
        const imgRes = await fetch(Array.isArray(outputUrl) ? outputUrl[0] : outputUrl);
        const imgBuffer = await imgRes.buffer();

        // Resize with sharp to max 512x512
        const resizedBuffer = await sharp(imgBuffer)
          .resize({ width: 512, height: 512, fit: 'inside' })
          .png()
          .toBuffer();
        console.log('[remove-background] Resized image buffer size:', resizedBuffer.length);

        const resultDataUri = `data:image/png;base64,${resizedBuffer.toString('base64')}`;
        if (resultDataUri.length > 1_000_000) {
          console.error('[remove-background] Resulting image is still too large for Gemini:', resultDataUri.length);
          throw new Error('Processed image is too large to analyze. Please upload a smaller image.');
        }
        console.log('[remove-background] Background removal complete. Returning data URI.');
        return { photoDataUri: resultDataUri };
      } catch (replicateError) {
        console.error('[remove-background] Replicate API call or polling failed:', replicateError);
        throw replicateError;
      }
    } catch (error) {
      console.error('[remove-background] Background removal failed:', error);
      // Fallback to original image
      return { photoDataUri: input.photoDataUri };
    }
  }
);
