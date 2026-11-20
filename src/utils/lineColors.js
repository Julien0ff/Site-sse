// Couleur de texte lisible sur la couleur d'une ligne (numéro dans la girouette)
export function textOnLineColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  // Contraste avec le blanc vs avec un quasi-noir : on garde le meilleur
  const withWhite = 1.05 / (lum + 0.05);
  const withDark = (lum + 0.05) / 0.0525;
  return withWhite >= withDark ? '#ffffff' : '#0a0612';
}
