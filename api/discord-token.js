export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, redirectUri } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const clientId = process.env.VITE_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!code || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing OAuth parameters' });
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(400).json({ error: tokenData.error_description || 'Discord token exchange failed' });
    }

    return res.status(200).json({ access_token: tokenData.access_token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
