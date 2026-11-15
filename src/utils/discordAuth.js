// Authentification OAuth2 Discord (configuration via .env uniquement)

export function getDiscordClientId() {
  return (import.meta.env.VITE_DISCORD_CLIENT_ID || '').trim();
}

export function getDiscordLoginUrl() {
  const clientId = getDiscordClientId();
  if (!clientId) return null;
  const currentUrl = new URL(window.location.href);
  const redirectUri = encodeURIComponent(`${currentUrl.origin}${currentUrl.pathname}`);
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=token&scope=identify%20guilds&redirect_uri=${redirectUri}`;
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
