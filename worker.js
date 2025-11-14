
// Import the aws4 library for signing requests
import { AwsV4 } from 'aws4';

export default {
  async fetch(request, env, ctx) {
    // --- CORS Headers ---
    // These headers allow your web app to talk to the worker
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Replace with your specific domain in production for better security
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // --- Handle CORS preflight requests (the browser sends this first) ---
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // --- Only allow POST requests for generating URLs ---
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const { filename, contentType } = await request.json();

      if (!filename || !contentType) {
        return new Response('Missing "filename" or "contentType" in request body', { status: 400 });
      }

      // --- Environment variables (you will set these in the Cloudflare dashboard) ---
      const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID;
      const R2_BUCKET_NAME = env.R2_BUCKET_NAME;
      const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID;
      const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY;

      const host = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const url = `https://${host}/${filename}`;

      // --- Use aws4 to create the presigned URL ---
      const signer = new AwsV4({
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
        service: 's3',
        region: 'auto',
        host: host,
        method: 'PUT',
        path: `/${filename}`,
        headers: {
          'Content-Type': contentType,
        },
      });

      const signedUrl = await signer.sign();

      // --- Send the secure, temporary URL back to the client ---
      return new Response(JSON.stringify({ presignedUrl: signedUrl.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error("Error generating presigned URL:", error);
      return new Response('Error generating presigned URL', { status: 500 });
    }
  },
};
