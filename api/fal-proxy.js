const FAL_KEY = process.env.FAL_KEY || '95edfbc1-f5a6-4194-a0ae-f3b33d323e98:1f0e93252530a8d848275297b976fc53';
const FAL_SUBMIT = 'https://queue.fal.run/fal-ai/flux/schnell';
const FAL_QUEUE = 'https://queue.fal.run/fal-ai/flux';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function pollUntilComplete(requestId) {
  for (let i = 0; i < 60; i++) {
    const statusRes = await fetch(FAL_QUEUE + '/requests/' + requestId + '/status', {
      headers: { 'Authorization': 'Key ' + FAL_KEY }
    });
    const statusText = await statusRes.text();
    let statusData = {};
    try { statusData = statusText ? JSON.parse(statusText) : {}; } catch (e) {
      throw new Error('fal.ai status: ' + (statusText?.slice(0, 80) || e.message));
    }
    if (statusData.status === 'COMPLETED') {
      const resultRes = await fetch(FAL_QUEUE + '/requests/' + requestId, {
        headers: { 'Authorization': 'Key ' + FAL_KEY }
      });
      const resultText = await resultRes.text();
      let resultData = {};
      try { resultData = resultText ? JSON.parse(resultText) : {}; } catch (e) {
        throw new Error('fal.ai result: ' + (resultText?.slice(0, 80) || e.message));
      }
      return resultData.response || resultData;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('Timeout');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const { prompt } = body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }
  try {
    const submitRes = await fetch(FAL_SUBMIT, {
      method: 'POST',
      headers: {
        'Authorization': 'Key ' + FAL_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: prompt.trim() })
    });
    const submitText = await submitRes.text();
    let submitData = {};
    try { submitData = submitText ? JSON.parse(submitText) : {}; } catch (_) {}
    if (!submitData.request_id) {
      return res.status(500).json({ error: submitData.detail || submitData.message || submitText?.slice(0, 100) || 'Submit failed' });
    }
    const response = await pollUntilComplete(submitData.request_id);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
};
