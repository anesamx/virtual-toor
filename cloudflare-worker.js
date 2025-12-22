export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (request.method === 'HEAD' || request.method === 'GET') {
      if (!env.R2_BUCKET) {
        throw new Error('R2_BUCKET binding is not configured.');
      }

      const object = await env.R2_BUCKET.get(key);

      if (object === null) {
        return new Response('Object Not Found', { status: 404 });
      }

      const headers = {
        ...corsHeaders,
        'Content-Type': object.httpMetadata.contentType,
        'Content-Length': object.size,
      };

      if (request.method === 'HEAD') {
        return new Response(null, { headers });
      }

      return new Response(object.body, {
        headers,
      });
    }

    if (request.method === 'POST') {
      try {
        if (!env.R2_BUCKET) {
          throw new Error('R2_BUCKET binding is not configured.');
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
          throw new Error('No file was uploaded.');
        }

        const uploadKey = `scenes/${Date.now()}-${file.name}`;

        await env.R2_BUCKET.put(uploadKey, file.stream(), {
          httpMetadata: { contentType: file.type },
        });

        return new Response(JSON.stringify({ success: true, publicUrl: uploadKey }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('Worker Error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders,
    });
  },
};