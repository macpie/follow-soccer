// Design tokens from the handoff "Design Tokens" section. The accent purple #5F26FC
// is the single accent in light mode (#8B66FF in dark).

const LIGHT = {
  pg: '#EFEFF2', sf: '#FFFFFF', sf2: '#F6F6F9', tx: '#0E0E14', sub: '#6B6B78', faint: '#9A9AA6',
  bd: '#E6E6EC', bd2: '#DCDCE4',
  accent: '#5F26FC', accentSoft: 'rgba(95,38,252,0.10)', live: '#E5202B', good: '#1F9D55', warn: '#D9820B',
  shadow: '0 18px 48px rgba(20,16,40,0.14)',
}

const DARK = {
  pg: '#08080C', sf: '#14141C', sf2: '#1D1D28', tx: '#F4F4F7', sub: '#9A9AAA', faint: '#6E6E80',
  bd: 'rgba(255,255,255,0.10)', bd2: 'rgba(255,255,255,0.16)',
  accent: '#8B66FF', accentSoft: 'rgba(139,102,255,0.18)', live: '#FF4D57', good: '#34C77B', warn: '#F2A33C',
  shadow: '0 18px 50px rgba(0,0,0,0.55)',
}

export const theme = (dark) => (dark ? DARK : LIGHT)
