// Authentification OAuth2 Discord (configuration via .env + échange sécurisé côté serveur)

export function getDiscordClientId() {
  return (import.meta.env.VITE_DISCORD_CLIENT_ID || '').trim();
}

export function getDiscordRedirectUri() {
  const currentUrl = new URL(window.location.href);
  return `${currentUrl.origin}${currentUrl.pathname}`;
}

export function getDiscordLoginUrl() {
  const clientId = getDiscordClientId();
  if (!clientId) return null;
  const redirectUri = encodeURIComponent(getDiscordRedirectUri());
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&scope=identify%20guilds&redirect_uri=${redirectUri}`;
}

export async function exchangeDiscordCodeForToken(code) {
  const res = await fetch('/api/discord-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      redirectUri: getDiscordRedirectUri()
    })
  });

  if (!res.ok) {
    throw new Error(`Erreur échange OAuth Discord (${res.status})`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function fetchDiscordUserProfile(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    throw new Error(`Erreur API Discord (${res.status})`);
  }

  const data = await res.json();

  let avatarUrl = '/discord-logo.gif';
  if (data.avatar) {
    const format = data.avatar.startsWith('a_') ? 'gif' : 'png';
    avatarUrl = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${format}?size=256`;
  } else {
    const defaultIndex = (parseInt(data.discriminator || '0', 10) || parseInt(data.id.slice(-4), 10)) % 5;
    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }

  return {
    id: data.id,
    username: data.global_name || data.username,
    discordTag: data.discriminator && data.discriminator !== '0' ? `#${data.discriminator}` : `@${data.username}`,
    avatarUrl,
    rawAvatar: data.avatar,
    email: data.email || null,
    joinedAt: new Date().toLocaleDateString('fr-FR'),
    accessToken
  };
}
