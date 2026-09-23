// Per-rank colors used by rank badges across the app. `main` is the strong
// accent, `light` the badge background, `dark` the badge text — kept in sync
// with the admin Reports rank-distribution card borders.
export const RANK_COLORS = {
  Star: { main: '#f59e0b', light: '#FEF3C7', dark: '#B45309' },
  Silver: { main: '#94a3b8', light: '#F1F5F9', dark: '#475569' },
  Gold: { main: '#eab308', light: '#FEF9C3', dark: '#A16207' },
  Platinum: { main: '#6366f1', light: '#E0E7FF', dark: '#4338CA' }
};

// Modifier class for .rank-badge elements (classes defined in index.css).
export const getRankClass = (rankName) =>
  (rankName && RANK_COLORS[rankName] ? `rank-badge-${rankName.toLowerCase()}` : '');

// Full className for a rank badge: "rank-badge rank-badge-gold"
export const rankBadgeClass = (rankName) => {
  const mod = getRankClass(rankName);
  return mod ? `rank-badge ${mod}` : 'rank-badge';
};