export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*', // Allow all headers
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'POST') {
      try {
        // Check for the R2 binding first.
        if (!env.R2_BUCKET) {
          throw new Error('R2_BUCKET binding is not configured.');
        }

        // Get the image file from the form data.
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
          throw new Error('No file was uploaded.');
        }

        // Create a unique key for the file in R2.
        const key = `scenes/${Date.now()}-${file.name}`;

        // Upload the file directly to the R2 bucket.
        await env.R2_BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });

        // Return the public URL of the uploaded file.
        return new Response(JSON.stringify({ success: true, publicUrl: key }), {
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
