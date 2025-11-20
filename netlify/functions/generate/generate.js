// Netlify Function to proxy requests to Cohere securely.
// This version uses the required /v1/chat endpoint.

const COHERE_API_KEY = "OvcxZJimZQSy9RxU3yeJFT4sAZt12IeH4RnYiM4l";

exports.handler = async function (event, context) {
  // --- Standard boilerplate and security checks ---
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
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

  // The 'prompt' is sent from our frontend.
  const userMessage = body.prompt || '';
  if (!userMessage) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
  }

  // --- Start of Cohere API Call ---
  try {
    // 1. UPDATE: Use the /v1/chat endpoint
    const cohereResponse = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      // 2. UPDATE: The payload now uses `message` instead of `prompt`.
      // We can also remove parameters that are not standard for the chat endpoint like `k`.
      body: JSON.stringify({
        model: 'command-a-03-2025', // You can use other models like 'command-r' or 'command-r-plus'
        message: userMessage,
        temperature: 0.7
        // 'chat_history' can be added here for follow-up conversations
      })
    });

    if (!cohereResponse.ok) {
      const errorText = await cohereResponse.text();
      // This will now log the detailed error from Cohere to your Netlify function logs
      console.error('Cohere API error', cohereResponse.status, errorText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Failed to get a response from Cohere.', details: errorText })
      };
    }

    const json = await cohereResponse.json();
    
    // 3. UPDATE: The response structure is simpler. The text is in `json.text`.
    const text = json.text || '';

    // The frontend expects a JSON object with a 'text' property.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    };

  } catch (err) {
    console.error('Request to Cohere failed', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error while contacting Cohere.' })
    };
  }
};