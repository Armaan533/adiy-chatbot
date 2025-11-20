// Netlify Function to proxy requests to Cohere securely.
// Save this file at: netlify/functions/generate.js
// IMPORTANT:
// - Set your Cohere API key in Netlify: COHERE_API_KEY (Site settings → Build & deploy → Environment)
// - Locally, use `netlify dev` and set env var in your shell or with `netlify env:set`.
// - This file uses the Cohere REST "generate" endpoint via fetch, so no additional npm deps required.

const COHERE_API_KEY = "OvcxZJimZQSy9RxU3yeJFT4sAZt12IeH4RnYiM4l";

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Allow': 'POST' }, body: 'Method Not Allowed' };
  }

  if (!COHERE_API_KEY) {
    console.error('Missing COHERE_API_KEY environment variable');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server not configured. Missing COHERE_API_KEY.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const prompt = body.prompt || '';
  const max_tokens = Number.isInteger(body.max_tokens) ? body.max_tokens : 150;
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;

  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
  }

  try {
    const cohereResponse = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command-xlarge', // change if you want a different Cohere model
        prompt,
        max_tokens,
        temperature,
        k: 0
      })
    });

    if (!cohereResponse.ok) {
      const text = await cohereResponse.text();
      console.error('Cohere API error', cohereResponse.status, text);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Cohere API error', details: text })
      };
    }

    const json = await cohereResponse.json();
    // Cohere generate returns { generations: [{ text: "..." }], ... }
    const text = (json.generations && json.generations[0] && json.generations[0].text) || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    };

  } catch (err) {
    console.error('Request to Cohere failed', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};