/* Icônes de page : bibliothèque, sélecteur (Emoji / Icons / Upload). */

/* ---------- Icônes de page (emoji, icône Notion colorée ou image) ---------- */
// Valeur stockée : un emoji ("🏃"), "icon:<nom>:<couleur>" ou "img:<data-url>".
const ICON_COLORS = {
  gray: '#787774', brown: '#9f6b53', orange: '#d9730d', yellow: '#cb912f', green: '#448361',
  blue: '#337ea9', purple: '#9065b0', pink: '#c14c8a', red: '#d44c47',
};
const ICONSET = {
  routine: '<path d="M5.5 13a6.5 6.5 0 0 1 12-3.5"/><path d="M18.5 4.5v5h-5"/><circle cx="6" cy="18" r="2.2"/><circle cx="17.5" cy="18" r="2.2" fill="currentColor"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  star: '<path d="M12 3l2.8 6 6.2.5-4.7 4.1 1.5 6.4L12 16.6 6.2 20l1.5-6.4L3 9.5 9.2 9z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  book: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM8 7h7"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>',
  rocket: '<path d="M12 3c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10z"/><circle cx="12" cy="10" r="1.8"/><path d="M9 16l-2 4 3-1M15 16l2 4-3-1"/>',
  mountain: '<path d="M3 20l6-10 4 6 3-4 5 8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20h16M7 20v-6M12 20V8M17 20V10"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  gear: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.9.7 1.5 1.6 1.5 2.6V17h4v-.5c0-1 .6-1.9 1.5-2.6A6 6 0 0 0 12 3z"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  piano: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M7.5 4v9M12 4v9M16.5 4v9M7.5 13v7M12 13v7M16.5 13v7"/>',
  run: '<circle cx="14" cy="4.5" r="1.8"/><path d="M9 21l3-6-3-3 4-4 3 4h3M12 15l3 1 1 5M6 11l3-3"/>',
  dumbbell: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15zM5 19l8-8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  home: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  factory: '<path d="M3 21V10l5 3v-3l5 3v-3l5 3V4h3v17z"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.9 3.1-6 7-6s7 2.1 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 5 1.6 5 5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4c0 3 2 4 4 4M16 6h4c0 3-2 4-4 4M12 13v4M9 21h6v-4H9z"/>',
  fire: '<path d="M12 21c-4 0-6-3-6-6 0-4 4-6 4-10 3 2 4 4 4 6 1-1 2-2 2-4 2 2 2 5 2 8 0 3-2 6-6 6z"/>',
  coffee: '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 2v3M12 2v3"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13" r="3.5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1.5-2 0-3.5 1-1 7 1 7-4a9 9 0 0 0-9-8.5z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="14.5" cy="7" r="1.2" fill="currentColor"/>',
  doc: '<path d="M6 3h8l4 4v14H6zM14 3v4h4"/>',
  checklist: '<path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9"/>',
  loop: '<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>',
  graduation: '<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  bug: '<rect x="7" y="8" width="10" height="12" rx="5"/><path d="M12 8V5M9 5l1.5 2M15 5l-1.5 2M3 12h4M17 12h4M3 17h4M17 17h4"/>',
  building: '<rect x="4" y="3" width="10" height="18"/><path d="M14 9h6v12h-6M7 7h1M10 7h1M7 11h1M10 11h1M7 15h1M10 15h1"/>',
  cake: '<path d="M4 21V13h16v8zM4 17c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5M12 13V9M12 6a1 1 0 0 1 0-2"/>',
  car: '<path d="M3 16v-4l2-5h14l2 5v4zM3 16v2M21 16v2"/><circle cx="7.5" cy="16" r="1.5"/><circle cx="16.5" cy="16" r="1.5"/>',
  cart: '<path d="M3 4h2l2.5 11h11L21 7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z"/>',
  crown: '<path d="M3 18l2-10 5 5 2-7 2 7 5-5 2 10z"/>',
  diamond: '<path d="M6 4h12l3 5-9 11L3 9zM3 9h18M9 4l3 5 3-5M12 9v11"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  envelope: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  feather: '<path d="M20 4c-9 0-14 5-14 14l-2 2M6 18l8-8M9 15h6c3-2 5-6 5-11"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  gift: '<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8c-2 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-3 3-5 3"/>',
  hammer: '<path d="M14 4l6 6-3 3-6-6zM11 7L3 15l3 3 8-8"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-9 9"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  laptop: '<rect x="5" y="5" width="14" height="10" rx="1"/><path d="M2 19h20l-2-4H4z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  magnet: '<path d="M5 3v9a7 7 0 0 0 14 0V3h-4v9a3 3 0 0 1-6 0V3zM5 7h4M15 7h4"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 11L6 3h4l2 5 2-5h4l-2.5 8"/>',
  megaphone: '<path d="M3 10v4h3l8 5V5L6 10zM18 9a4 4 0 0 1 0 6M6 14l1 6h3l-1-5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
  paper: '<path d="M22 2L2 10l8 3 3 8zM10 13l12-11"/>',
  paw: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15" cy="7" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M8 18c0-3 2-5 4-5s5 2 5 5-3 3-4.5 2-2-1-4.5 0-.5-2 0-2z"/>',
  plane: '<path d="M2 13l8-2 5-8h2l-2 8 6 1 2-2h1l-1 4 1 4h-1l-2-2-6 1 2 8h-2l-5-8-8-2z"/>',
  plant: '<path d="M12 21v-9M12 12c0-4 3-7 7-7 0 4-3 7-7 7zM12 15c0-3-2-5-5-5 0 3 2 5 5 5M7 21h10"/>',
  printer: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01"/>',
  receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6"/>',
  recycle: '<path d="M7 19H4l3-5M17 19h3l-3-5M9 5l3-3 3 3M12 2v6M7 14l-3 5M17 14l3 5"/>',
  scissors: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5l12 9M8 16.5l12-9"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  ship: '<path d="M3 16l2 4h14l2-4zM5 16V10h14v6M12 10V3M8 10V6h8v4"/>',
  shirt: '<path d="M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.3 2 4 2s3-.5 4-2"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/>',
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  stack: '<rect x="4" y="4" width="16" height="4" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/><rect x="4" y="16" width="16" height="4" rx="1"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8zM7.5 8.5v.01"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  thumb: '<path d="M7 21H4V10h3zM7 10l4-7c1.5 0 2.5 1 2.5 2.5L13 9h6a2 2 0 0 1 2 2.3l-1.3 7.2A2 2 0 0 1 17.7 21H7"/>',
  timer2: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6M19 5l1.5 1.5"/>',
  tools: '<path d="M14 7l3-3 3 3-3 3M14 7L4 17l3 3 10-10M17 10l-3-3"/>',
  train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4"/><circle cx="9" cy="14" r=".8" fill="currentColor"/><circle cx="15" cy="14" r=".8" fill="currentColor"/>',
  tree: '<path d="M12 22v-5M12 2l6 8h-3l4 6H5l4-6H6z"/>',
  umbrella: '<path d="M3 12a9 9 0 0 1 18 0zM12 12v7a2 2 0 0 1-4 0"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
  wallet: '<path d="M4 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 6l11-3v3M16 13h4"/>',
  water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5v.01"/>',
  wrench: '<path d="M15 4a5 5 0 0 0-5 6.5L3 17.5 6.5 21l7-7A5 5 0 0 0 20 9l-3 3-3-1-1-3z"/>',
  yoga: '<circle cx="12" cy="4.5" r="1.8"/><path d="M12 7v6M6 10l6 3 6-3M8 21l4-8 4 8M5 21h14"/>',
  zap: '<circle cx="12" cy="12" r="9"/><path d="M13 6l-4 7h4l-1 5 4-7h-4z"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 11h8"/>',
  atom: '<circle cx="12" cy="12" r="1.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M5 10v4M8 10v4M11 10v4"/>',
  bike: '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l4-8h5l3 8M10 8l2 8h-6M14 5h3"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z"/>',
  brush: '<path d="M20 3L10 13M7 14c-2 0-3 1.5-3 3.5S3 21 3 21s5 0 6-2 0-5-2-5z"/>',
  chess: '<path d="M8 21h8M9 18h6l-1-6h-4zM10 12V9h4v3M12 3v4M10 5h4"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/>',
  flask: '<path d="M9 3h6M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 14h10"/>',
  guitar: '<path d="M19 3l2 2-6 6M14 10a3 3 0 0 0-4 0c-1 1-1 2-2.5 2.5S4 13 4 16s3 5 5 5 3-1.5 3.5-3.5S13 15 14 14a3 3 0 0 0 0-4z"/><circle cx="10" cy="15" r="1.3"/>',
  handshake: '<path d="M2 11l4-4 4 2 3-2 4 1 5 3M2 11l6 6 2-1 2 2 2-1 2 1 4-5M9 14l2 2M12 13l2 2"/>',
  infinity: '<path d="M7 16a4 4 0 1 1 0-8c3 0 7 8 10 8a4 4 0 1 0 0-8c-3 0-7 8-10 8z"/>',
  moneybag: '<path d="M9 4h6l-2 3h-2zM8 8h8c3 3 4 6 4 9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4c0-3 1-6 4-9zM12 11v7M10 12.5c0-1 4-1 4 .5s-4 1.5-4 3 4 1.5 4 .5"/>',
  percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  pizza: '<path d="M12 21L3 5a15 15 0 0 1 18 0z"/><circle cx="10" cy="9" r="1" fill="currentColor"/><circle cx="14" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/>',
  robot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13v.01M15 13v.01M9 16h6M2 12v3M22 12v3"/><circle cx="12" cy="3.5" r="1"/>',
  sailboat: '<path d="M3 18h18l-2 3H5zM12 3v13M12 4l7 11h-7M12 7l-5 8h5"/>',
  seedling: '<path d="M12 21v-8M12 13c0-4-3-6-7-6 0 4 3 6 7 6zM12 11c0-4 3-7 7-7 0 4-3 7-7 7"/>',
  soccer: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 5h-5L8 10zM12 7V3M16 10l4-1M14.5 15l2 4M9.5 15l-2 4M8 10l-4-1"/>',
  swim: '<circle cx="17" cy="6" r="2"/><path d="M2 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1M6 14l5-5 3 2 3-2"/>',
  telescope: '<path d="M3 10l14-6 2 5L5 15zM10 13l-3 8M11 13l4 8M17 4l2-1 2 5-2 1"/>',
  ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14 7v10" stroke-dasharray="0"/>',
  translate: '<path d="M3 5h10M8 3v2c0 4-2 7-5 9M5 9c1 2 3 4 6 5M13 21l4-10 4 10M14.5 18h5"/>',
  trophy2: '<path d="M7 3h10v6a5 5 0 0 1-10 0zM12 14v4M8 21h8"/>',
  users2: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  weight: '<path d="M6 8h12l2 13H4zM12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
};
const EMOJI_LIST = [
  ['🎯','cible objectif target'],['🏃','course running sport'],['🎹','piano musique'],['💼','travail pro job'],['🏭','usine factory'],
  ['☀️','soleil matin sun'],['🌱','pousse habitude grow'],['🚀','fusée lancement rocket'],['📚','livres lecture book'],['🧠','cerveau apprendre brain'],
  ['💪','force muscle'],['🧘','méditation calme yoga'],['✍️','écrire write'],['🎨','art dessin'],['🛠️','outils tools'],['💡','idée idea'],
  ['🌍','monde world'],['❤️','coeur love'],['🏔️','montagne mountain'],['⛵','voile bateau'],['🎸','guitare musique'],['📈','croissance chart'],
  ['🧩','puzzle'],['🧭','boussole compass'],['🏆','trophée victoire'],['🔥','feu motivation fire'],['⭐','étoile star'],['✅','fait done check'],
  ['📅','calendrier date'],['⏰','réveil alarme'],['🏋️','haltère sport'],['🚴','vélo bike'],['🏊','natation swim'],['🥗','salade nutrition'],
  ['💤','sommeil sleep'],['🗣️','parler langue'],['🇯🇵','japon japonais'],['📝','note notes'],['💻','ordinateur code'],['📊','statistiques data'],
  ['🎓','diplôme étude'],['💰','argent money'],['🏠','maison home'],['👨‍👩‍👧','famille family'],['🤝','accord partenariat'],['🎤','micro parler'],
  ['📷','photo camera'],['🎬','film vidéo'],['✈️','voyage avion'],['🌊','vague mer'],['🌳','arbre nature'],['🍎','pomme santé'],
  ['⚡','énergie éclair'],['🔑','clé key'],['🧪','expérience test'],['🔬','science recherche'],['📦','livraison colis'],['⚙️','process réglage'],
  ['🧹','ménage rangement'],['🎮','jeu game'],['♟️','échecs stratégie'],['🌙','nuit lune'],['☕','café coffee'],['🍳','cuisine cooking'],
];
const RECENT_KEY = 'kata-recent-icons';
// Icône de page vide (comme Notion quand aucune icône n'est choisie)
const DEFAULT_PAGE_ICON = '<svg class="nicon page-default" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"><path d="M5.5 2.75h5.9l3.85 3.85v9.4a1.25 1.25 0 0 1-1.25 1.25h-8.5A1.25 1.25 0 0 1 4.25 16V4A1.25 1.25 0 0 1 5.5 2.75z"/><path d="M11.25 2.9v3.1a.75.75 0 0 0 .75.75h3.1M7.25 10.25h5.5M7.25 13.25h5.5"/></svg>';

function iconHTML(val, cls = '') {
  if (!val) return '';
  if (val.startsWith('icon:')) {
    const [, name, color] = val.split(':');
    if (!ICONSET[name]) return '';
    return `<svg class="nicon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:${ICON_COLORS[color] || ICON_COLORS.gray}">${ICONSET[name]}</svg>`;
  }
  if (val.startsWith('img:')) return `<img class="nicon ${cls}" src="${esc(val.slice(4))}" alt="">`;
  return `<span class="emoji ${cls}">${esc(val)}</span>`;
}

let iconPickerState = null;
function closeIconPicker() { $('#iconPicker')?.remove(); iconPickerState = null; }

// Sélecteur d'icône façon Notion : onglets Emoji / Icons / Upload, filtre, aléatoire, couleur, récents.
function openIconPicker(anchor, onPick) {
  closeIconPicker();
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) {}
  const st = iconPickerState = { tab: 'icons', color: 'gray', q: '', onPick };
  const el = document.createElement('div');
  el.className = 'ip';
  el.id = 'iconPicker';
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - 416)) + 'px';
  el.style.top = Math.min(r.bottom + 6, innerHeight - 420) + 'px';

  const pick = val => {
    recent = [val, ...recent.filter(v => v !== val)].slice(0, 24);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch (e) {}
    closeIconPicker();
    onPick(val);
  };
  const cell = val => `<button data-val="${esc(val)}" title="${esc(val.startsWith('icon:') ? val.split(':')[1] : val)}">${iconHTML(val)}</button>`;

  const render = () => {
    const q = st.q.toLowerCase();
    let body = '';
    if (st.tab === 'emoji') {
      const list = EMOJI_LIST.filter(([e, k]) => !q || k.includes(q)).map(([e]) => e);
      const rec = recent.filter(v => !v.startsWith('icon:') && !v.startsWith('img:'));
      body = `${!q && rec.length ? `<div class="ip-label">Recent</div><div class="ip-grid">${rec.map(cell).join('')}</div>` : ''}
        <div class="ip-label">Emoji</div><div class="ip-grid">${list.map(cell).join('') || ''}</div>`;
    } else if (st.tab === 'icons') {
      const names = Object.keys(ICONSET).filter(n => !q || n.includes(q));
      const rec = recent.filter(v => v.startsWith('icon:'));
      body = `${!q && rec.length ? `<div class="ip-label">Recent</div><div class="ip-grid">${rec.map(cell).join('')}</div>` : ''}
        <div class="ip-label">Icons</div><div class="ip-grid">${names.map(n => cell(`icon:${n}:${st.color}`)).join('')}</div>`;
    } else {
      body = `<div class="ip-upload"><label>Choisir une image<input type="file" accept="image/*" hidden id="ipFile"></label><p>L'image est réduite à 128 px et stockée avec la page.</p></div>`;
    }
    el.innerHTML = `
      <div class="ip-tabs">
        ${['emoji', 'icons', 'upload'].map(t => `<button data-tab="${t}" class="${st.tab === t ? 'on' : ''}">${{ emoji: 'Emoji', icons: 'Icons', upload: 'Upload' }[t]}</button>`).join('')}
        <span class="spacer"></span>
        <button data-remove>Remove</button>
      </div>
      ${st.tab !== 'upload' ? `
        <div class="ip-search">
          <label class="field">${icon('search')}<input id="ipFilter" placeholder="Filter…" value="${esc(st.q)}" autocomplete="off"></label>
          <button class="ip-sq" data-random title="Aléatoire">${icon('shuffle')}</button>
          ${st.tab === 'icons' ? `<button class="ip-sq" data-colors title="Couleur"><span class="dot" style="background:${ICON_COLORS[st.color]}"></span></button>` : ''}
        </div>
        <div class="ip-colors" id="ipColors" hidden>${Object.entries(ICON_COLORS).map(([k, c]) => `<button data-color="${k}" class="${st.color === k ? 'on' : ''}" style="background:${c}" title="${k}"></button>`).join('')}</div>` : ''}
      <div class="ip-body">${body}</div>`;
    const f = $('#ipFilter');
    if (f) { f.oninput = () => { st.q = f.value; const pos = f.selectionStart; render(); const nf = $('#ipFilter'); nf.focus(); nf.setSelectionRange(pos, pos); }; }
    const file = $('#ipFile');
    if (file) file.onchange = () => {
      const fl = file.files[0];
      if (!fl) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
        pick('img:' + c.toDataURL('image/png'));
      };
      img.src = URL.createObjectURL(fl);
    };
  };
  el.onclick = e => {
    e.stopPropagation();
    const t = e.target.closest('[data-tab],[data-remove],[data-random],[data-colors],[data-color],[data-val]');
    if (!t) return;
    const d = t.dataset;
    if (d.tab) { st.tab = d.tab; st.q = ''; return render(); }
    if ('remove' in d) { closeIconPicker(); return onPick(null); }
    if ('colors' in d) { $('#ipColors').hidden = !$('#ipColors').hidden; return; }
    if (d.color) { st.color = d.color; return render(); }
    if ('random' in d) {
      if (st.tab === 'emoji') return pick(EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)][0]);
      const names = Object.keys(ICONSET);
      return pick(`icon:${names[Math.floor(Math.random() * names.length)]}:${st.color}`);
    }
    if (d.val) pick(d.val);
  };
  render();
  $('#ipFilter')?.focus();
}
