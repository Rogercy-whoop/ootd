import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow large image uploads
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { photoDataUri } = req.body;
    if (!photoDataUri) {
      return res.status(400).json({ error: 'Missing photoDataUri' });
    }

    // Dynamic import for firebase-admin
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getStorage } = await import('firebase-admin/storage');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: 'your-project-id.appspot.com', // <-- replace with your actual bucket
      });
    }
    const adminStorage = getStorage();

    // Convert data URI to base64 (strip prefix)
    const base64 = photoDataUri.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    // Create a unique filename
    const filename = `background-removal/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(filename);
    const buffer = Buffer.from(base64, 'base64');
    await file.save(buffer, {
      contentType: 'image/jpeg',
      public: true,
      metadata: { cacheControl: 'public, max-age=3600' },
    });
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    // Call Replicate API
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN is not set' });
    }
    const fetch = (await import('node-fetch')).default;
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
      return res.status(500).json({ error: 'Failed to start background removal prediction.' });
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
        return res.status(500).json({ error: 'Background removal failed.' });
      }
      await new Promise(res => setTimeout(res, 1500));
    }
    if (!outputUrl) {
      return res.status(500).json({ error: 'Background removal timed out.' });
    }
    // Download the transparent PNG and convert to data URI
    const imgRes = await fetch(Array.isArray(outputUrl) ? outputUrl[0] : outputUrl);
    const imgBuffer = await imgRes.buffer();
    const resultDataUri = `data:image/png;base64,${imgBuffer.toString('base64')}`;
    return res.status(200).json({ photoDataUri: resultDataUri });
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 