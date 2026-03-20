// ===== SEA CONQUEROR v2.0 — GAME ENGINE =====
// All game state, logic, and UI management

// ===== WEB AUDIO ENGINE =====
const AudioEngine = {
  ctx: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  currentMusic: null,
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.4,
  sfxVolume: 0.7,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
    } catch(e) { console.log('Audio not supported'); }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  playTone(freq, type = 'sine', duration = 0.3, vol = 0.3, delay = 0) {
    if (!this.ctx || !this.sfxEnabled) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.type = type;
      osc.frequency.value = freq;
      const now = this.ctx.currentTime + delay;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch(e) {}
  },

  playCannonShot() {
    if (!this.ctx || !this.sfxEnabled) return;
    // Low boom
    this.playTone(80, 'sawtooth', 0.5, 0.6);
    this.playTone(60, 'square', 0.4, 0.4, 0.05);
    this.playNoise(0.3, 0.5, 0.5);
  },

  playExplosion() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.playTone(100, 'sawtooth', 0.8, 0.8);
    this.playNoise(0.5, 0.8, 0.7);
    this.playTone(50, 'square', 0.6, 0.5, 0.1);
  },

  playNoise(duration = 0.3, vol = 0.5, time = 0) {
    if (!this.ctx) return;
    try {
      const bufSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      const now = this.ctx.currentTime + time;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      src.start(now);
    } catch(e) {}
  },

  playCoin() {
    this.playTone(880, 'sine', 0.15, 0.4);
    this.playTone(1320, 'sine', 0.1, 0.3, 0.08);
  },

  playLevelUp() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.playTone(n, 'sine', 0.3, 0.5, i * 0.15));
  },

  playClick() {
    this.playTone(600, 'sine', 0.08, 0.3);
  },

  playSuccess() {
    this.playTone(440, 'sine', 0.15, 0.4);
    this.playTone(550, 'sine', 0.15, 0.4, 0.1);
    this.playTone(660, 'sine', 0.2, 0.5, 0.2);
  },

  playDanger() {
    this.playTone(200, 'sawtooth', 0.3, 0.5);
    this.playTone(150, 'sawtooth', 0.3, 0.4, 0.2);
  },

  playHit() {
    this.playTone(300, 'square', 0.2, 0.5);
    this.playNoise(0.15, 0.4);
  },

  startAmbientMusic(type = 'calm') {
    if (!this.ctx || !this.musicEnabled) return;
    this.stopMusic();
    // Procedural ambient: layered oscillators
    if (type === 'battle') {
      this._playBattleMusic();
    } else {
      this._playCalmMusic();
    }
  },

  stopMusic() {
    if (this.currentMusic) {
      try { this.currentMusic.forEach(n => n.stop && n.stop()); } catch(e) {}
      this.currentMusic = null;
    }
  },

  _playCalmMusic() {
    if (!this.ctx) return;
    const nodes = [];
    const notes = [130, 164, 196, 220, 261];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.02 + Math.random() * 0.02;
      // Slow LFO
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.frequency.value = 0.1 + i * 0.05;
      lfoGain.gain.value = 0.01;
      lfo.start();
      osc.start();
      nodes.push(osc, lfo);
    });
    this.currentMusic = nodes;
  },

  _playBattleMusic() {
    if (!this.ctx) return;
    const nodes = [];
    const melody = [196, 220, 174, 196, 164, 174, 196, 220];
    let time = this.ctx.currentTime;
    const loop = () => {
      if (!this.currentMusic) return;
      melody.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const t = time + i * 0.25;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.03, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
        nodes.push(osc);
      });
      time += melody.length * 0.25;
    };
    loop();
    const interval = setInterval(() => {
      if (!this.currentMusic) { clearInterval(interval); return; }
      loop();
    }, melody.length * 250);
    this.currentMusic = nodes;
    this.currentMusic._interval = interval;
  },

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  },

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }
};

// ===== GAME STATE =====
const GameState = {
  playerName: '',
  gold: 250000,
  wood: 150000,
  gems: 580,
  level: 12,
  exp: 6500,
  expToNext: 10000,
  kills: 0,
  wins: 0,
  losses: 0,

  ship: {
    name: 'Sea Breeze',
    cannon: 2,
    hull: 2,
    sail: 1,
    crew: 1,
    keel: 0,
  },

  upgrades: {
    cannon: [0,0,0,0,0],
    hull: [0,0,0,0,0],
    sail: [0,0,0,0,0],
    crew: [0,0,0,0,0],
    keel: [0,0,0,0,0],
  },

  battle: {
    active: false,
    mode: 'normal',
    playerHP: 100,
    playerMaxHP: 100,
    enemyHP: 100,
    enemyMaxHP: 100,
    selectedAmmo: 0,
    score: 0,
    kills: 0,
    startTime: 0,
    weather: 'sunny',
    weatherIndex: 0,
    cannonCooldown: false,
    bossMode: false,
    powerupActive: null,
    damageMultiplier: 1,
  },

  arena: {
    wave: 0,
    bestWave: 7,
    gold: 0,
    exp: 0,
    kills: 0,
    damage: 0,
  },

  treasure: {
    grid: [],
    digsLeft: 4,
    found: 0,
    playedToday: false,
    lastPlayDate: null,
  },

  questState: {},

  dungeonProgress: {},

  loginStreak: 3,
  lastLoginDay: null,
  loginRewardsClaimed: {},

  settings: {
    music: 40,
    sfx: 70,
    language: 'tr',
  },

  battlePass: {
    season: 1,
    exp: 2400,
    tier: 4,
    premium: false,
  },

  crew: [
    { name: 'Kör Nişancı Jack', role: 'topcu', bonus: 'reload', value: 15, rarity: 'rare', active: true },
    { name: 'Hızlı Rüzgar Maria', role: 'dumenci', bonus: 'speed', value: 20, rarity: 'uncommon', active: false },
    { name: 'Cerrah Nico', role: 'cerrah', bonus: 'heal', value: 2, rarity: 'epic', active: false },
  ],

  pets: [
    { name: 'Papağan Rico', type: 'papagan', bonus: 'gold', value: 10, active: true, emoji: '🦜' },
    { name: 'Maymun Max', type: 'maymun', bonus: 'exp', value: 15, active: false, emoji: '🐒' },
  ],

  prevScreen: 'menu',
};

// ===== SAVE / LOAD =====
function saveGame() {
  try {
    const d = {
      playerName: GameState.playerName,
      gold: GameState.gold,
      wood: GameState.wood,
      gems: GameState.gems,
      level: GameState.level,
      exp: GameState.exp,
      expToNext: GameState.expToNext,
      kills: GameState.kills,
      wins: GameState.wins,
      losses: GameState.losses,
      ship: GameState.ship,
      upgrades: GameState.upgrades,
      arena: { bestWave: GameState.arena.bestWave },
      treasure: {
        playedToday: GameState.treasure.playedToday,
        lastPlayDate: GameState.treasure.lastPlayDate,
      },
      loginStreak: GameState.loginStreak,
      lastLoginDay: GameState.lastLoginDay,
      questState: GameState.questState,
      dungeonProgress: GameState.dungeonProgress,
      battlePass: GameState.battlePass,
      settings: GameState.settings,
    };
    localStorage.setItem('seaConqueror_save', JSON.stringify(d));
  } catch(e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem('seaConqueror_save');
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(GameState, data);
    // Restore nested
    if (data.ship) GameState.ship = data.ship;
    if (data.upgrades) GameState.upgrades = data.upgrades;
    if (data.arena) { GameState.arena.bestWave = data.arena.bestWave || 0; }
    if (data.settings) GameState.settings = { ...GameState.settings, ...data.settings };
    return true;
  } catch(e) { return false; }
}

// ===== USED NAMES =====
let usedNames = new Set();
try {
  const saved = localStorage.getItem('seaConqueror_names');
  if (saved) usedNames = new Set(JSON.parse(saved));
} catch(e) {}
function saveNames() {
  try { localStorage.setItem('seaConqueror_names', JSON.stringify([...usedNames])); } catch(e) {}
}

// ===== SCREEN MANAGEMENT =====
function showScreen(name) {
  AudioEngine.resume();
  AudioEngine.playClick();
  const current = document.querySelector('.screen.active');
  if (current) {
    GameState.prevScreen = current.id.replace('screen-', '');
    current.classList.remove('active');
  }
  const next = document.getElementById('screen-' + name);
  if (next) next.classList.add('active');

  if (name === 'hub') initHub();
  if (name === 'upgrade') initUpgradeScreen();
  if (name === 'treasure') initTreasureGrid();
  if (name === 'challenge') initChallenge();
  if (name === 'profile') initProfile();
  if (name === 'dungeon') initDungeonScreen();
  if (name === 'battlepass') initBattlePass();
  if (name === 'crew') initCrewScreen();
  if (name === 'settings') {
    document.getElementById('settingsPlayerName').textContent = GameState.playerName || 'KAPTAN';
    applySavedSettings();
  }
  if (name === 'arena') {
    document.getElementById('arenaWave').textContent = GameState.arena.wave;
    document.getElementById('arenaBestWave').textContent = GameState.arena.bestWave;
    updateArenaDisplay();
  }
  // Music switching
  if (name === 'battle') {
    AudioEngine.startAmbientMusic('battle');
  } else if (name === 'hub' || name === 'menu') {
    AudioEngine.startAmbientMusic('calm');
  }
}

function goBackFromSettings() { showScreen(GameState.prevScreen || 'menu'); }

// ===== STARS =====
function initStars() {
  const sf = document.getElementById('starfield');
  if (!sf) return;
  for (let i = 0; i < 120; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 3 + 1;
    star.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*60}%;animation-duration:${2+Math.random()*4}s;animation-delay:${Math.random()*3}s;`;
    sf.appendChild(star);
  }
}

// ===== NAME SELECTION =====
const RESERVED = new Set(['admin','system','kaptan','captain','sea','breeze','god','mod']);

function checkName() {
  const val = document.getElementById('nameInput').value.trim();
  const statusEl = document.getElementById('nameStatus');
  if (!val) { statusEl.textContent = ''; statusEl.className = 'name-status'; return; }
  if (val.length < 3) { statusEl.textContent = '⚠️ En az 3 karakter gerekli'; statusEl.className = 'name-status err'; return; }
  if (val.length > 20) { statusEl.textContent = '⚠️ En fazla 20 karakter'; statusEl.className = 'name-status err'; return; }
  if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ0-9_\s]+$/.test(val)) { statusEl.textContent = '⚠️ Geçersiz karakter'; statusEl.className = 'name-status err'; return; }
  const lc = val.toLowerCase().replace(/\s/g,'');
  if (RESERVED.has(lc)) { statusEl.textContent = '❌ Bu isim kullanılamaz'; statusEl.className = 'name-status err'; return; }
  if (usedNames.has(lc)) { statusEl.textContent = '❌ Bu isim zaten alınmış!'; statusEl.className = 'name-status err'; return; }
  statusEl.textContent = '✓ Bu isim kullanılabilir!'; statusEl.className = 'name-status ok';
}

function confirmName() {
  const val = document.getElementById('nameInput').value.trim();
  if (!val || val.length < 3) { showToast('Geçerli bir kaptan adı gir!', 'warning'); return; }
  const lc = val.toLowerCase().replace(/\s/g,'');
  if (usedNames.has(lc)) { showToast('Bu isim zaten alınmış!', 'danger'); return; }
  usedNames.add(lc);
  saveNames();
  GameState.playerName = val.toUpperCase();
  saveGame();
  AudioEngine.playSuccess();
  showToast(`⚓ Hoş geldin, Kaptan ${GameState.playerName}!`, 'success');
  checkDailyLogin();
  showScreen('hub');
}

function startGame() {
  AudioEngine.resume();
  if (!GameState.playerName) {
    showScreen('name');
  } else {
    checkDailyLogin();
    showScreen('hub');
  }
}

// ===== HUB =====
function initHub() {
  loadGame();
  document.getElementById('hubPlayerName').textContent = GameState.playerName || 'KAPTAN';
  document.getElementById('hubLevel').textContent = GameState.level;
  const expPct = (GameState.exp / GameState.expToNext * 100).toFixed(0);
  document.getElementById('expBarMini').style.width = expPct + '%';
  document.getElementById('expText').textContent = `${GameState.exp.toLocaleString()}/${GameState.expToNext.toLocaleString()} EXP`;
  document.getElementById('goldDisplay').textContent = GameState.gold.toLocaleString();
  document.getElementById('woodDisplay').textContent = GameState.wood.toLocaleString();
  document.getElementById('gemDisplay').textContent = GameState.gems.toLocaleString();
  updateHubShipSVG();
  document.getElementById('shipNameDisplay').textContent = GameState.ship.name;
  updateShipStats();
  initQuestList();
}

function showHubSection(sec) {
  document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
  event.target.closest('.sidebar-nav-btn').classList.add('active');
  ['overview','quests','ship','crew'].forEach(s => {
    const el = document.getElementById('hub-' + s);
    if (el) el.classList.toggle('hidden', s !== sec);
  });
  if (sec === 'ship') updateHubShipSVG();
}

function updateShipStats() {
  const cannon = getStatValue('cannon');
  const hull = getStatValue('hull');
  const sail = getStatValue('sail');
  const crew = getStatValue('crew');

  const setBar = (id, val) => {
    const bar = document.getElementById(id);
    const valEl = document.getElementById(id + 'Val');
    if (bar) bar.style.width = val + '%';
    if (valEl) valEl.textContent = val;
  };
  setBar('statCannon', cannon);
  setBar('statHull', hull);
  setBar('statSail', sail);
  setBar('statCrew', crew);
}

function getStatValue(type) {
  const level = GameState.ship[type] || 0;
  return Math.min(100, 15 + level * 20);
}

// ===== SVG SHIP VISUAL =====
function getShipSVG(size = 80, forBattle = false) {
  const cannon = GameState.ship.cannon || 0;
  const hull = GameState.ship.hull || 0;
  const sail = GameState.ship.sail || 0;
  const totalLevel = cannon + hull + sail;

  // Colors based on upgrades
  const hullColor = hull >= 3 ? '#4a5a6a' : hull >= 1 ? '#5c3d1e' : '#6b4423';
  const hullHighlight = hull >= 3 ? '#607080' : '#7a5030';
  const sailColor = sail >= 3 ? '#e8dcc8' : sail >= 1 ? '#d4c4a0' : '#c8b888';
  const metalColor = hull >= 3 ? '#8899aa' : '#8a8070';

  // Cannon count based on cannon upgrade
  const cannonCount = Math.min(6, 2 + cannon);
  const isGalleon = totalLevel >= 10;
  const isFrigate = totalLevel >= 5;

  const shipH = isGalleon ? size * 0.9 : isFrigate ? size * 0.8 : size * 0.7;
  const w = isGalleon ? size * 1.1 : isFrigate ? size * 1.0 : size * 0.85;

  let cannonsHTML = '';
  for (let i = 0; i < cannonCount; i++) {
    const y = -8 + i * 14 - (cannonCount - 1) * 7;
    const cannonColor = cannon >= 3 ? '#333' : cannon >= 1 ? '#555' : '#666';
    const cannonLen = cannon >= 3 ? 16 : cannon >= 1 ? 13 : 10;
    cannonsHTML += `<rect x="18" y="${50 + y}" width="${cannonLen}" height="5" rx="2" fill="${cannonColor}"/>`;
  }

  const mastCount = isGalleon ? 3 : isFrigate ? 2 : 1;
  let mastsHTML = '';
  const mastPositions = isGalleon ? [30, 55, 75] : isFrigate ? [35, 65] : [50];
  mastPositions.slice(0, mastCount).forEach((mx, mi) => {
    const mastH = isGalleon ? 70 : isFrigate ? 55 : 45;
    const sailW = isGalleon ? (mi === 1 ? 44 : 32) : isFrigate ? (mi === 0 ? 38 : 28) : 36;
    mastsHTML += `
      <line x1="${mx}" y1="25" x2="${mx}" y2="${25+mastH}" stroke="#4a3020" stroke-width="3"/>
      <line x1="${mx-sailW/2}" y1="${35 - mi*5}" x2="${mx+sailW/2}" y2="${35 - mi*5}" stroke="#4a3020" stroke-width="1.5"/>
      <path d="M${mx-sailW/2},${35 - mi*5} Q${mx},${55 - mi*5} ${mx+sailW/2},${35 - mi*5}" 
            fill="${sailColor}" stroke="#b0a070" stroke-width="1.5" opacity="0.95"/>
    `;
    if (isGalleon && mi === 1) {
      mastsHTML += `
        <line x1="${mx-sailW/2+5}" y1="${48}" x2="${mx+sailW/2-5}" y2="${48}" stroke="#4a3020" stroke-width="1"/>
        <path d="M${mx-sailW/2+5},${48} Q${mx},${63} ${mx+sailW/2-5},${48}" 
              fill="${sailColor}" stroke="#b0a070" stroke-width="1" opacity="0.85"/>
      `;
    }
  });

  const hullW = isGalleon ? 95 : isFrigate ? 82 : 70;
  const hullXOff = (100 - hullW) / 2;

  return `<svg width="${size*1.4}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Masts & Sails -->
    ${mastsHTML}
    <!-- Hull -->
    <path d="M${hullXOff},55 L${hullXOff+8},85 L${100-hullXOff-8},85 L${100-hullXOff},55 Z" 
          fill="${hullColor}" stroke="${hullHighlight}" stroke-width="1.5"/>
    <!-- Hull shading -->
    <path d="M${hullXOff+5},62 L${hullXOff+10},80 L${100-hullXOff-10},80 L${100-hullXOff-5},62 Z" 
          fill="${hullHighlight}" opacity="0.3"/>
    <!-- Metal stripes if upgraded hull -->
    ${hull >= 2 ? `<path d="M${hullXOff+3},68 L${100-hullXOff-3},68" stroke="${metalColor}" stroke-width="2.5" opacity="0.7"/>` : ''}
    ${hull >= 4 ? `<path d="M${hullXOff+4},74 L${100-hullXOff-4},74" stroke="${metalColor}" stroke-width="2" opacity="0.6"/>` : ''}
    <!-- Cannons -->
    ${cannonsHTML}
    <!-- Waterline -->
    <path d="M${hullXOff},83 Q50,88 ${100-hullXOff},83" stroke="#2a6080" stroke-width="2" fill="none" opacity="0.6"/>
    <!-- Flag -->
    <path d="M${mastPositions[0]},25 L${mastPositions[0]+14},28 L${mastPositions[0]},31 Z" 
          fill="${isGalleon ? '#cc2222' : '#c9a227'}" opacity="0.9"/>
    <!-- Porthole lights -->
    ${hull >= 1 ? `<circle cx="${hullXOff+15}" cy="68" r="2.5" fill="#f0c040" opacity="0.6"/>` : ''}
    ${hull >= 2 ? `<circle cx="${100-hullXOff-15}" cy="68" r="2.5" fill="#f0c040" opacity="0.6"/>` : ''}
  </svg>`;
}

function getEnemyShipSVG(size = 70, isBoss = false) {
  if (isBoss) {
    return `<svg width="${size*1.5}" height="${size}" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Boss ship - Galleon style, dark -->
      <line x1="30" y1="20" x2="30" y2="90" stroke="#2a1a0a" stroke-width="4"/>
      <line x1="60" y1="15" x2="60" y2="90" stroke="#2a1a0a" stroke-width="4"/>
      <line x1="90" y1="22" x2="90" y2="90" stroke="#2a1a0a" stroke-width="3"/>
      <!-- Sails dark red -->
      <path d="M5,30 Q30,55 55,30" fill="#4a0a0a" stroke="#8a1a1a" stroke-width="2"/>
      <path d="M35,25 Q60,50 85,25" fill="#4a0a0a" stroke="#8a1a1a" stroke-width="2"/>
      <path d="M70,30 Q90,50 110,30" fill="#330808" stroke="#8a1a1a" stroke-width="1.5"/>
      <!-- Upper sails -->
      <path d="M15,35 Q30,48 45,35" fill="#3a0808" stroke="#8a1a1a" stroke-width="1.5"/>
      <path d="M45,30 Q60,43 75,30" fill="#3a0808" stroke="#8a1a1a" stroke-width="1.5"/>
      <!-- Hull -->
      <path d="M5,60 L12,88 L108,88 L115,60 Z" fill="#1a1010" stroke="#3a2020" stroke-width="2"/>
      <!-- Armor stripes -->
      <path d="M8,68 L112,68" stroke="#4a3030" stroke-width="3"/>
      <path d="M9,75 L111,75" stroke="#4a3030" stroke-width="2.5"/>
      <!-- Skull flag -->
      <path d="M60,15 L75,18 L60,21 Z" fill="#cc2222"/>
      <circle cx="67" cy="19" r="3" fill="#fff" opacity="0.8"/>
      <!-- Many cannons -->
      ${[0,1,2,3,4].map(i => `<rect x="110" y="${52+i*8}" width="14" height="5" rx="2" fill="#222"/>`).join('')}
      ${[0,1,2,3,4].map(i => `<rect x="-4" y="${52+i*8}" width="14" height="5" rx="2" fill="#222"/>`).join('')}
    </svg>`;
  }
  return `<svg width="${size*1.3}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <line x1="35" y1="22" x2="35" y2="88" stroke="#3a2010" stroke-width="3"/>
    <line x1="65" y1="26" x2="65" y2="88" stroke="#3a2010" stroke-width="3"/>
    <path d="M8,32 Q35,56 62,32" fill="#3a0a0a" stroke="#7a1a1a" stroke-width="1.5"/>
    <path d="M38,28 Q65,52 92,28" fill="#3a0a0a" stroke="#7a1a1a" stroke-width="1.5"/>
    <path d="M10,62 L18,87 L82,87 L90,62 Z" fill="#1c1010" stroke="#3a2010" stroke-width="1.5"/>
    <path d="M13,70 L87,70" stroke="#4a2a2a" stroke-width="2.5"/>
    <path d="M35,22 L47,25 L35,28 Z" fill="#cc2222"/>
    <rect x="87" y="60" width="12" height="4" rx="1.5" fill="#333"/>
    <rect x="87" y="70" width="12" height="4" rx="1.5" fill="#333"/>
  </svg>`;
}

function updateHubShipSVG() {
  const el = document.getElementById('hubShipSVG');
  if (el) el.innerHTML = getShipSVG(100);
  const upEl = document.getElementById('upgradeShipSVG');
  if (upEl) upEl.innerHTML = getShipSVG(90);
}

// ===== QUEST SYSTEM =====
const QUESTS = [
  // Story quests
  { id:'q1', name:'İlk Kan', icon:'⚔️', desc:'3 düşman gemiyi batır', type:'kills', target:3, gold:500, exp:200, chain: 'q1b' },
  { id:'q1b', name:'Deniz Kurdu', icon:'🐺', desc:'10 düşman gemi batır', type:'kills', target:10, gold:2000, exp:800 },
  { id:'q2', name:'Patron Avcısı', icon:'💀', desc:'1 patron gemisi yok et', type:'boss', target:1, gold:2000, exp:800 },
  { id:'q3', name:'Hazine Avcısı', icon:'🗝️', desc:'Hazine avında 5 hazine bul', type:'treasure', target:5, gold:1000, exp:400 },
  { id:'q4', name:'Arena Kahramanı', icon:'🏟️', desc:"Arena'da 5. dalgaya ulaş", type:'arena', target:5, gold:1500, exp:600 },
  { id:'q5', name:'Meydan Okuyan', icon:'⚡', desc:'Günlük meydan okumayı tamamla', type:'challenge', target:1, gold:3000, exp:1200 },
  { id:'q6', name:'Gemi Tamircisi', icon:'⚙️', desc:'Herhangi bir parçayı 3 kez geliştir', type:'upgrade', target:3, gold:800, exp:300 },
  { id:'q7', name:'Denizci', icon:'🌊', desc:'Fırtınalı havada savaş kazan', type:'weather', target:1, gold:2500, exp:1000 },
  { id:'q8', name:'Varlıklı', icon:'💰', desc:'100,000 altın biriktir', type:'gold', target:100000, gold:1000, exp:500 },
  // Dungeon quests
  { id:'d1', name:'Lanetli Liman', icon:'🏴‍☠️', desc:"Hayalet liman zindanını tamamla", type:'dungeon', target:1, gold:3000, exp:1500 },
  { id:'d2', name:'Kraken Yuvası', icon:'🦑', desc:"Kraken'in yuvasını temizle", type:'dungeon', target:1, gold:5000, exp:2500 },
  { id:'d3', name:'Savaş Gemileri', icon:'⚓', desc:'5 savaş gemisiyle dövüş', type:'kills', target:5, gold:1800, exp:700 },
  { id:'d4', name:'Kale Fatihi', icon:'🏰', desc:'3 kule yık', type:'tower', target:3, gold:2200, exp:900 },
  { id:'d5', name:'Fırtına Savaşçısı', icon:'⛈️', desc:'Fırtınada 3 savaş kazan', type:'weather', target:3, gold:3500, exp:1500 },
  { id:'d6', name:'Zengin Tüccar', icon:'🛒', desc:'Ticaret ile 50,000 altın kazan', type:'gold', target:50000, gold:4000, exp:2000 },
  // Daily refresh quests
  { id:'dq1', name:'Günlük Savaş', icon:'🗡️', desc:'Bugün 1 savaş kazan', type:'daily_kills', target:1, gold:200, exp:100, daily:true },
  { id:'dq2', name:'Günlük Toplama', icon:'📦', desc:'Bugün 3 sandık aç', type:'daily_chest', target:3, gold:300, exp:150, daily:true },
  { id:'dq3', name:'Günlük Arena', icon:'🥊', desc:'Arenada 3 dalga geç', type:'daily_arena', target:3, gold:400, exp:200, daily:true },
];

// Initialize quest states
QUESTS.forEach(q => {
  if (!GameState.questState[q.id]) {
    GameState.questState[q.id] = {
      current: q.id === 'q1' ? 3 : q.id === 'q5' ? 1 : q.id === 'q8' ? 100000 : 0,
      state: q.id === 'q1' || q.id === 'q5' || q.id === 'q8' ? 'completed' : 'active'
    };
  }
});

function initQuestList() {
  const container = document.getElementById('questList');
  if (!container) return;
  container.innerHTML = '';

  const sorted = [...QUESTS].sort((a, b) => {
    const sa = GameState.questState[a.id]?.state || 'active';
    const sb = GameState.questState[b.id]?.state || 'active';
    if (sa === 'completed' && sb !== 'completed') return -1;
    if (sa !== 'completed' && sb === 'completed') return 1;
    if (sa === 'claimed' && sb !== 'claimed') return 1;
    return 0;
  });

  sorted.forEach(q => {
    const qs = GameState.questState[q.id] || { current: 0, state: 'active' };
    const pct = Math.min(100, (qs.current / q.target * 100));
    const isCompleted = qs.state === 'completed';
    const isClaimed = qs.state === 'claimed';

    const div = document.createElement('div');
    div.className = `quest-item ${isCompleted ? 'completed' : ''} ${isClaimed ? 'claimed' : ''} ${q.daily ? 'daily-quest' : ''}`;
    div.innerHTML = `
      <div class="quest-icon">${q.icon}</div>
      <div class="quest-info">
        <div class="quest-name">${q.name}${q.daily ? ' <span style="font-size:9px;background:rgba(41,160,66,0.3);padding:1px 5px;border-radius:3px;color:var(--green-bright)">GÜNLÜK</span>' : ''}</div>
        <div style="font-family:'IM Fell English',serif;font-style:italic;font-size:11px;color:rgba(212,184,150,0.5);margin-bottom:4px">${q.desc}</div>
        <div class="quest-progress-bar">
          <div class="quest-progress-fill" style="width:${pct}%"></div>
        </div>
        <div style="font-size:10px;color:rgba(212,184,150,0.4);margin-top:3px">${qs.current}/${q.target}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <div class="quest-rewards">
          <span class="reward-tag">🪙 +${q.gold.toLocaleString()}</span>
          <span class="reward-tag">⚡ +${q.exp}</span>
        </div>
        ${isCompleted ? `<button class="collect-btn" onclick="collectQuest('${q.id}',${q.gold},${q.exp})">TOPLA ✓</button>` : ''}
        ${isClaimed ? `<span style="font-size:11px;color:rgba(40,160,66,0.6)">✓ Alındı</span>` : ''}
      </div>
    `;
    container.appendChild(div);
  });
}

function collectQuest(id, gold, exp) {
  const qs = GameState.questState[id];
  if (!qs || qs.state !== 'completed') return;
  qs.state = 'claimed';
  addGold(gold);
  addExp(exp);
  AudioEngine.playCoin();
  const q = QUESTS.find(q => q.id === id);
  showToast(`✓ ${q?.name}: +${gold.toLocaleString()} Altın, +${exp} EXP`, 'success');
  // Activate chain quest if exists
  if (q?.chain) {
    const chainQs = GameState.questState[q.chain];
    if (chainQs && chainQs.state === 'locked') chainQs.state = 'active';
  }
  initQuestList();
  saveGame();
}

function collectAllQuests() {
  const completedQuests = QUESTS.filter(q => GameState.questState[q.id]?.state === 'completed');
  if (!completedQuests.length) { showToast('Tamamlanmış görev yok!', 'warning'); return; }

  let totalGold = 0, totalExp = 0;
  completedQuests.forEach(q => {
    totalGold += q.gold;
    totalExp += q.exp;
    GameState.questState[q.id].state = 'claimed';
  });

  addGold(totalGold);
  addExp(totalExp);
  AudioEngine.playSuccess();

  const modal = document.getElementById('collectAllModal');
  const container = document.getElementById('collectAllRewards');
  container.innerHTML = `
    <div class="reward-item"><span class="r-icon">🪙</span><div><div class="r-val">+${totalGold.toLocaleString()}</div><div class="r-label">ALTIN</div></div></div>
    <div class="reward-item"><span class="r-icon">⚡</span><div><div class="r-val">+${totalExp.toLocaleString()}</div><div class="r-label">EXP</div></div></div>
    <div class="reward-item"><span class="r-icon">📜</span><div><div class="r-val">${completedQuests.length}</div><div class="r-label">GÖREV</div></div></div>
    <div class="reward-item"><span class="r-icon">🏆</span><div><div class="r-val">TÜMÜ</div><div class="r-label">TOPLANDΙ</div></div></div>
  `;
  modal.classList.remove('hidden');
  initQuestList();
  saveGame();
}

function updateQuestProgress(type, amount = 1) {
  QUESTS.forEach(q => {
    const qs = GameState.questState[q.id];
    if (!qs || qs.state !== 'active') return;
    if (q.type === type) {
      qs.current = Math.min(q.target, (qs.current || 0) + amount);
      if (qs.current >= q.target) {
        qs.state = 'completed';
        showToast(`🎯 Görev tamamlandı: ${q.name}!`, 'success');
        AudioEngine.playSuccess();
      }
    }
  });
}

// ===== DUNGEON SYSTEM =====
const DUNGEONS = [
  {
    id: 'ghost_port',
    name: 'Lanetli Liman',
    icon: '🏴‍☠️',
    desc: 'Hayalet korsanlarla dolu terk edilmiş bir liman...',
    difficulty: 1,
    waves: 3,
    enemies: ['Hayalet Sloop', 'Lanetli Brig', 'Korsan Fırkateyn'],
    bossName: 'Kaptan İskelet',
    rewards: { gold: 3000, exp: 1500, gems: 50 },
    bg: 'linear-gradient(180deg,#0a1520 0%,#050c15 100%)',
    unlockLevel: 1,
  },
  {
    id: 'kraken_lair',
    name: "Kraken'in Yuvası",
    icon: '🦑',
    desc: 'Derin denizlerin karanlığından dev bir yaratık sizi bekliyor...',
    difficulty: 3,
    waves: 5,
    enemies: ['Derin Deniz Brig', 'Köpekbalığı Fırkateyn', 'Deniz Canavarı', 'Dev Kraken Kolu', 'Krakena'],
    bossName: 'Büyük Krakena',
    rewards: { gold: 5000, exp: 2500, gems: 100 },
    bg: 'linear-gradient(180deg,#050a20 0%,#020510 100%)',
    unlockLevel: 5,
  },
  {
    id: 'naval_fortress',
    name: 'Deniz Kalesi',
    icon: '🏰',
    desc: 'Düşman donanması kalelerini korumak için savaşıyor...',
    difficulty: 2,
    waves: 4,
    enemies: ['Devriye Gemisi', 'Savaş Fırkateyn', 'Zırhlı Galleon', 'Kale Topu'],
    bossName: 'Amiral Keldor',
    rewards: { gold: 4000, exp: 2000, gems: 75 },
    bg: 'linear-gradient(180deg,#1a2030 0%,#0a1020 100%)',
    unlockLevel: 3,
  },
  {
    id: 'storm_sea',
    name: 'Fırtına Denizi',
    icon: '⛈️',
    desc: 'Ebedi fırtınanın gücü bu denizcileri bitmez güçle donatmış...',
    difficulty: 4,
    waves: 6,
    enemies: ['Fırtına Korsan', 'Şimşek Gemisi', 'Kasırga Galleon', 'Fırtına Devi', 'Şimşek Topu', 'Fırtına Ejderi'],
    bossName: 'Lord Fırtına',
    rewards: { gold: 8000, exp: 4000, gems: 150 },
    bg: 'linear-gradient(180deg,#040810 0%,#020408 100%)',
    unlockLevel: 8,
  },
];

let currentDungeon = null;
let dungeonWave = 0;
let dungeonActive = false;

function initDungeonScreen() {
  const container = document.getElementById('dungeonList');
  if (!container) return;
  container.innerHTML = '';

  DUNGEONS.forEach(d => {
    const cleared = GameState.dungeonProgress[d.id]?.cleared;
    const locked = GameState.level < d.unlockLevel;
    const stars = GameState.dungeonProgress[d.id]?.stars || 0;
    const starsHTML = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

    const div = document.createElement('div');
    div.className = `dungeon-card ${cleared ? 'cleared' : ''} ${locked ? 'locked' : ''}`;
    div.innerHTML = `
      <div class="dungeon-icon">${d.icon}</div>
      <div class="dungeon-info">
        <div class="dungeon-name">${d.name}</div>
        <div class="dungeon-desc">${d.desc}</div>
        <div class="dungeon-difficulty">${'⚡'.repeat(d.difficulty)}</div>
        <div class="dungeon-stars">${starsHTML}</div>
      </div>
      <div class="dungeon-rewards">
        <div>🪙 ${d.rewards.gold.toLocaleString()}</div>
        <div>💎 ${d.rewards.gems}</div>
        <button class="dungeon-enter-btn ${locked ? 'locked' : ''}" 
          onclick="${locked ? '' : `enterDungeon('${d.id}')`}"
          ${locked ? 'disabled' : ''}>
          ${locked ? `🔒 Seviye ${d.unlockLevel}` : cleared ? '🔄 Tekrar Gir' : '⚔️ GİR'}
        </button>
      </div>
    `;
    container.appendChild(div);
  });
}

function enterDungeon(id) {
  currentDungeon = DUNGEONS.find(d => d.id === id);
  if (!currentDungeon) return;
  dungeonWave = 0;
  dungeonActive = true;

  // Show dungeon info modal
  const modal = document.getElementById('dungeonInfoModal');
  document.getElementById('dungeonModalName').textContent = currentDungeon.name;
  document.getElementById('dungeonModalDesc').textContent = currentDungeon.desc;
  document.getElementById('dungeonModalDiff').innerHTML = '⚡'.repeat(currentDungeon.difficulty);
  document.getElementById('dungeonModalWaves').textContent = currentDungeon.waves;
  document.getElementById('dungeonModalBoss').textContent = currentDungeon.bossName;
  document.getElementById('dungeonModalGold').textContent = currentDungeon.rewards.gold.toLocaleString();
  document.getElementById('dungeonModalGems').textContent = currentDungeon.rewards.gems;
  modal.classList.remove('hidden');
}

function startDungeonBattle() {
  closeModal('dungeonInfoModal');
  dungeonWave++;
  const isBossWave = dungeonWave >= currentDungeon.waves;
  const enemyName = isBossWave ? currentDungeon.bossName : (currentDungeon.enemies[dungeonWave - 1] || 'Düşman');

  GameState.battle.mode = isBossWave ? 'boss' : 'dungeon';
  GameState.battle.bossMode = isBossWave;
  GameState.battle.playerMaxHP = 100 + getStatValue('hull');
  GameState.battle.playerHP = GameState.battle.playerMaxHP;
  GameState.battle.enemyMaxHP = isBossWave ? 600 + dungeonWave * 50 : 80 + dungeonWave * 40;
  GameState.battle.enemyHP = GameState.battle.enemyMaxHP;
  GameState.battle.score = 0;
  GameState.battle.kills = 0;
  GameState.battle.active = true;
  GameState.battle.startTime = Date.now();

  document.getElementById('bossNameDisplay').textContent = `${isBossWave ? '💀 PATRON: ' : '🌊 DALGA ' + dungeonWave + ': '}${enemyName}`;
  document.getElementById('enemyShip').innerHTML = getEnemyShipSVG(65, isBossWave);
  document.getElementById('playerShip').innerHTML = getShipSVG(65, true);
  document.getElementById('questTrackerText').textContent = `Zindan: ${currentDungeon.name} - Dalga ${dungeonWave}/${currentDungeon.waves}`;
  document.getElementById('dungeonWaveInfo').textContent = `Zindan ${dungeonWave}/${currentDungeon.waves}`;
  document.getElementById('dungeonWaveInfo').style.display = 'block';

  updateBattleHUD();
  showScreen('battle');

  clearInterval(battleTimerInterval);
  battleTimerInterval = setInterval(updateBattleTimer, 1000);
  clearInterval(autoFireInterval);
  autoFireInterval = setInterval(enemyFire, isBossWave ? 2000 : 3000);
  schedulePowerup();
  AudioEngine.startAmbientMusic('battle');
}

function dungeonVictoryCheck() {
  if (dungeonWave < currentDungeon.waves) {
    // Next wave
    setTimeout(() => {
      const modal = document.getElementById('dungeonNextModal');
      document.getElementById('dungeonNextWave').textContent = dungeonWave + 1;
      document.getElementById('dungeonTotalWaves').textContent = currentDungeon.waves;
      modal.classList.remove('hidden');
    }, 1000);
  } else {
    // Dungeon complete!
    if (!GameState.dungeonProgress[currentDungeon.id]) {
      GameState.dungeonProgress[currentDungeon.id] = {};
    }
    GameState.dungeonProgress[currentDungeon.id].cleared = true;
    GameState.dungeonProgress[currentDungeon.id].stars = 3; // simplify: always 3 stars first clear

    addGold(currentDungeon.rewards.gold);
    addExp(currentDungeon.rewards.exp);
    GameState.gems += currentDungeon.rewards.gems;

    updateQuestProgress('dungeon');
    AudioEngine.playLevelUp();

    const modal = document.getElementById('dungeonCompleteModal');
    document.getElementById('dcDungeonName').textContent = currentDungeon.name;
    document.getElementById('dcGold').textContent = '+' + currentDungeon.rewards.gold.toLocaleString();
    document.getElementById('dcExp').textContent = '+' + currentDungeon.rewards.exp.toLocaleString();
    document.getElementById('dcGems').textContent = '+' + currentDungeon.rewards.gems;
    modal.classList.remove('hidden');
    saveGame();
    dungeonActive = false;
  }
}

// ===== BATTLE SYSTEM =====
const AMMO_TYPES = [
  { name:'Gülle', icon:'💣', damage:30, cooldown:2000 },
  { name:'Zincir', icon:'🔗', damage:20, cooldown:1500, slow:true },
  { name:'Saçma', icon:'🍇', damage:15, cooldown:1000, multi:true },
  { name:'Ateşli', icon:'🔥', damage:25, cooldown:2500, burn:true },
  { name:'Bomba', icon:'💥', damage:50, cooldown:4000 },
];

const WEATHER_TYPES = [
  { name:'GÜNEŞLI', icon:'☀️', class:'', speedMod:1, fireMod:1, skyBg:'linear-gradient(180deg,#1a3a6a 0%,#0d2a4a 50%,#0a1e35 100%)' },
  { name:'SISLI', icon:'🌫️', class:'fog', speedMod:0.8, fireMod:1.5, skyBg:'linear-gradient(180deg,#2a3040 0%,#1a2030 50%,#0d1520 100%)' },
  { name:'FIRTINALI', icon:'⛈️', class:'storm', speedMod:0.7, fireMod:1.2, skyBg:'linear-gradient(180deg,#0a1020 0%,#060c18 50%,#040810 100%)' },
  { name:'GECE', icon:'🌙', class:'', speedMod:1, fireMod:1, skyBg:'linear-gradient(180deg,#020510 0%,#050a18 50%,#020510 100%)' },
];

let battleTimerInterval = null;
let autoFireInterval = null;
let powerupTimeout = null;

function startBattle(mode = 'normal') {
  GameState.battle.mode = mode;
  GameState.battle.bossMode = mode === 'boss';
  GameState.battle.damageMultiplier = 1;

  const isBoss = mode === 'boss';
  GameState.battle.playerMaxHP = 100 + getStatValue('hull');
  GameState.battle.playerHP = GameState.battle.playerMaxHP;
  GameState.battle.enemyMaxHP = isBoss ? 500 : (80 + Math.random() * 60 | 0);
  GameState.battle.enemyHP = GameState.battle.enemyMaxHP;
  GameState.battle.score = 0;
  GameState.battle.kills = 0;
  GameState.battle.active = true;
  GameState.battle.startTime = Date.now();

  document.getElementById('bossNameDisplay').textContent = isBoss ? '💀 PATRON — KRAKENE ÖFKESI' : '🚢 DÜŞMAN GEMİSİ';
  document.getElementById('enemyShip').innerHTML = getEnemyShipSVG(65, isBoss);
  document.getElementById('playerShip').innerHTML = getShipSVG(65, true);
  document.getElementById('dungeonWaveInfo').style.display = 'none';
  document.getElementById('questTrackerText').textContent = isBoss ? 'Patronu yok et!' : '3 Düşman Gemi Batar — 0/3';

  // Random weather
  GameState.battle.weatherIndex = Math.floor(Math.random() * WEATHER_TYPES.length);
  applyWeather(WEATHER_TYPES[GameState.battle.weatherIndex]);

  updateBattleHUD();
  showScreen('battle');

  clearInterval(battleTimerInterval);
  battleTimerInterval = setInterval(updateBattleTimer, 1000);
  clearInterval(autoFireInterval);
  autoFireInterval = setInterval(enemyFire, isBoss ? 2500 : 3500);
  schedulePowerup();
  showToast(isBoss ? '💀 PATRON SAVAŞI BAŞLADI!' : '⚔️ Savaş Başladı!', 'danger');
}

function startChallengeBattle() {
  startBattle('challenge');
}

function updateBattleHUD() {
  const b = GameState.battle;
  const playerPct = (b.playerHP / b.playerMaxHP * 100).toFixed(1);
  const enemyPct = (b.enemyHP / b.enemyMaxHP * 100).toFixed(1);
  document.getElementById('playerHpBar').style.width = playerPct + '%';
  document.getElementById('playerHpText').textContent = `${b.playerHP|0}/${b.playerMaxHP}`;
  document.getElementById('enemyHpBar').style.width = enemyPct + '%';
  document.getElementById('enemyHpText').textContent = `${Math.max(0,b.enemyHP|0)}/${b.enemyMaxHP}`;
  document.getElementById('battleScore').textContent = b.score.toLocaleString();
  document.getElementById('killCount').textContent = b.kills;
}

function updateBattleTimer() {
  if (!GameState.battle.active) return;
  const elapsed = Math.floor((Date.now() - GameState.battle.startTime) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  document.getElementById('battleTimer').textContent = `${m}:${s}`;
}

function selectAmmo(idx) {
  GameState.battle.selectedAmmo = idx;
  document.querySelectorAll('.ammo-slot').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  AudioEngine.playClick();
}

function fireCannon() {
  if (GameState.battle.cannonCooldown) { showToast('Top dolduruluyor...', 'warning'); return; }
  if (!GameState.battle.active) return;

  AudioEngine.playCannonShot();

  const ammo = AMMO_TYPES[GameState.battle.selectedAmmo];
  const weather = WEATHER_TYPES[GameState.battle.weatherIndex];

  let dmg = ammo.damage + getStatValue('cannon') * 0.3;
  dmg = Math.floor(dmg * (0.8 + Math.random() * 0.4) * GameState.battle.damageMultiplier);

  const isCrit = Math.random() < 0.15;
  if (isCrit) dmg = Math.floor(dmg * 1.8);

  GameState.battle.enemyHP = Math.max(0, GameState.battle.enemyHP - dmg);
  GameState.battle.score += dmg * 10;

  animateProjectile(ammo);
  showDamageNumber(dmg, isCrit, false);
  updateBattleHUD();

  GameState.battle.cannonCooldown = true;
  const cd = ammo.cooldown * weather.fireMod;
  const btn = document.getElementById('fireBtn');
  btn.style.opacity = '0.5';

  // Cooldown ring animation
  const cooldownRing = document.getElementById('cooldownRing');
  if (cooldownRing) {
    cooldownRing.style.display = 'block';
    cooldownRing.style.animation = 'none';
    setTimeout(() => { cooldownRing.style.animation = `cooldownFill ${cd}ms linear forwards`; }, 50);
  }

  setTimeout(() => {
    GameState.battle.cannonCooldown = false;
    btn.style.opacity = '1';
    if (cooldownRing) cooldownRing.style.display = 'none';
  }, cd);

  if (GameState.battle.enemyHP <= 0) {
    setTimeout(battleVictory, 500);
  }
}

function enemyFire() {
  if (!GameState.battle.active) return;
  const dmg = Math.floor(15 + Math.random() * 20);
  const isCrit = Math.random() < 0.1;
  const finalDmg = isCrit ? Math.floor(dmg * 1.5) : dmg;

  GameState.battle.playerHP = Math.max(0, GameState.battle.playerHP - finalDmg);
  showDamageNumber(finalDmg, isCrit, true);
  AudioEngine.playHit();
  updateBattleHUD();

  // Flash
  const ship = document.getElementById('playerShip');
  ship.style.filter = 'brightness(2) saturate(0)';
  setTimeout(() => { ship.style.filter = ''; }, 200);

  // Shake battle scene
  const scene = document.getElementById('battleScene');
  scene.style.animation = 'none';
  setTimeout(() => { scene.style.animation = 'screenShake 0.3s ease'; }, 10);

  if (GameState.battle.playerHP <= 0) {
    setTimeout(battleDefeat, 500);
  }
}

function battleVictory() {
  GameState.battle.active = false;
  clearInterval(battleTimerInterval);
  clearInterval(autoFireInterval);
  clearTimeout(powerupTimeout);
  AudioEngine.playExplosion();

  GameState.battle.kills++;
  GameState.kills++;
  GameState.wins++;

  let goldEarned = 200 + GameState.battle.score / 100 | 0;
  let expEarned = 50 + GameState.battle.kills * 30;

  // Pet bonus
  const activePet = GameState.pets.find(p => p.active);
  if (activePet) {
    if (activePet.bonus === 'gold') goldEarned = Math.floor(goldEarned * (1 + activePet.value / 100));
    if (activePet.bonus === 'exp') expEarned = Math.floor(expEarned * (1 + activePet.value / 100));
  }

  addGold(goldEarned);
  addExp(expEarned);

  updateQuestProgress('kills');
  if (GameState.battle.weatherIndex === 2) updateQuestProgress('weather');
  if (GameState.battle.mode === 'boss') updateQuestProgress('boss');

  // Explosion animation
  const enemyShip = document.getElementById('enemyShip');
  const ex = document.createElement('div');
  ex.className = 'explosion';
  ex.textContent = '💥';
  ex.style.cssText = 'position:absolute;top:30%;right:15%;font-size:64px;animation:explodeAnim 1s ease forwards;z-index:50;pointer-events:none;';
  document.getElementById('battleScene').appendChild(ex);
  setTimeout(() => ex.remove(), 1000);

  // Check if dungeon mode
  if (GameState.battle.mode === 'dungeon' || GameState.battle.mode === 'boss') {
    if (dungeonActive) {
      dungeonVictoryCheck();
      return;
    }
  }

  const rewards = document.getElementById('victoryRewards');
  rewards.innerHTML = `
    <div class="reward-item"><span class="r-icon">🪙</span><div><div class="r-val">+${goldEarned.toLocaleString()}</div><div class="r-label">ALTIN</div></div></div>
    <div class="reward-item"><span class="r-icon">⚡</span><div><div class="r-val">+${expEarned}</div><div class="r-label">EXP</div></div></div>
    <div class="reward-item"><span class="r-icon">💀</span><div><div class="r-val">${GameState.battle.kills}</div><div class="r-label">GEMİ BATIRDI</div></div></div>
    <div class="reward-item"><span class="r-icon">🏆</span><div><div class="r-val">${GameState.battle.score.toLocaleString()}</div><div class="r-label">SKOR</div></div></div>
  `;
  document.getElementById('victoryModal').classList.remove('hidden');
  saveGame();
}

function battleDefeat() {
  GameState.battle.active = false;
  clearInterval(battleTimerInterval);
  clearInterval(autoFireInterval);
  clearTimeout(powerupTimeout);
  GameState.losses++;
  AudioEngine.playDanger();
  dungeonActive = false;
  showToast('💀 Geminiz battı! Limana dönüyorsunuz...', 'danger');
  setTimeout(() => { showScreen('hub'); }, 2000);
  saveGame();
}

function animateProjectile(ammo) {
  const scene = document.getElementById('battleScene');
  const proj = document.createElement('div');
  proj.className = 'projectile';
  proj.textContent = ammo.icon;
  proj.style.cssText = 'position:absolute;left:28%;top:45%;font-size:24px;transition:all 0.4s ease;z-index:20;pointer-events:none;';
  scene.appendChild(proj);
  setTimeout(() => {
    proj.style.left = '72%';
    proj.style.top = '38%';
    proj.style.fontSize = '16px';
    proj.style.opacity = '0.6';
  }, 50);
  setTimeout(() => {
    proj.remove();
    const hit = document.createElement('div');
    hit.style.cssText = 'position:absolute;right:14%;top:30%;font-size:32px;z-index:20;animation:explodeAnim 0.5s ease forwards;pointer-events:none;';
    hit.textContent = '💥';
    scene.appendChild(hit);
    setTimeout(() => hit.remove(), 500);
  }, 450);
}

function showDamageNumber(dmg, isCrit, isPlayer) {
  const scene = document.getElementById('battleScene');
  const num = document.createElement('div');
  const x = isPlayer ? (15 + Math.random() * 20) : (60 + Math.random() * 20);
  const y = 20 + Math.random() * 30;
  num.style.cssText = `
    position:absolute;left:${x}%;top:${y}%;
    font-family:'Cinzel Decorative',serif;
    font-size:${isCrit ? '28px' : '20px'};
    font-weight:900;
    color:${isCrit ? '#ff4400' : isPlayer ? '#cc2222' : '#f0c040'};
    text-shadow:0 0 10px currentColor;
    z-index:30;
    pointer-events:none;
    animation:floatUp 1.5s ease forwards;
  `;
  num.textContent = (isCrit ? '💥 ' : '') + '-' + dmg;
  scene.appendChild(num);
  setTimeout(() => num.remove(), 1600);
}

// ===== WEATHER SYSTEM =====
function cycleWeather() { changeWeatherCycle(); }
function changeWeatherCycle() {
  GameState.battle.weatherIndex = (GameState.battle.weatherIndex + 1) % WEATHER_TYPES.length;
  applyWeather(WEATHER_TYPES[GameState.battle.weatherIndex]);
}
function applyWeather(w) {
  document.getElementById('weatherIcon').textContent = w.icon;
  document.getElementById('weatherText').textContent = w.name;
  document.getElementById('skyBg').style.background = w.skyBg;
  const overlay = document.getElementById('weatherOverlay');
  overlay.className = 'weather-overlay ' + w.class;
  const rain = document.getElementById('rainContainer');
  rain.innerHTML = '';
  rain.classList.remove('active');
  if (w.name === 'FIRTINALI') {
    rain.classList.add('active');
    for (let i = 0; i < 80; i++) {
      const drop = document.createElement('div');
      drop.className = 'raindrop';
      drop.style.left = Math.random() * 100 + '%';
      drop.style.animationDuration = (0.5 + Math.random() * 0.5) + 's';
      drop.style.animationDelay = Math.random() * 2 + 's';
      rain.appendChild(drop);
    }
    document.getElementById('lightning').style.display = 'block';
  } else {
    document.getElementById('lightning').style.display = 'none';
  }
  if (w.name === 'SISLI') {
    overlay.style.background = 'rgba(200,210,220,0.25)';
    overlay.style.backdropFilter = 'blur(2px)';
  } else {
    overlay.style.backdropFilter = 'none';
  }
}
function updateSailLabel(val) {
  const labels = ['DURAN', 'YARIM YELKEN', 'TAM YELKEN'];
  const idx = val < 33 ? 0 : val < 66 ? 1 : 2;
  document.getElementById('sailLabel').textContent = labels[idx];
}

// ===== POWERUP SYSTEM =====
const POWERUP_TYPES = [
  { icon:'⭐', name:'Bonus Skor', effect: () => { GameState.battle.score += 500; updateBattleHUD(); } },
  { icon:'💊', name:'Can Yenile', effect: () => { GameState.battle.playerHP = Math.min(GameState.battle.playerMaxHP, GameState.battle.playerHP + 30); updateBattleHUD(); } },
  { icon:'🔥', name:'2x Hasar (10sn)', effect: () => { GameState.battle.damageMultiplier = 2; setTimeout(() => { GameState.battle.damageMultiplier = 1; }, 10000); } },
  { icon:'⚡', name:'Hız Artışı', effect: () => { showToast('⚡ Hız artışı aktif!','success'); } },
  { icon:'🛡️', name:'Kalkan Aktif', effect: () => { showToast('🛡️ 10sn hasar kalkanı!','success'); } },
  { icon:'💰', name:'Altın Yağmuru', effect: () => { addGold(500); } },
];

function schedulePowerup() {
  clearTimeout(powerupTimeout);
  powerupTimeout = setTimeout(() => {
    if (!GameState.battle.active) return;
    const container = document.getElementById('powerupContainer');
    const p = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    container.textContent = p.icon;
    container.title = p.name;
    container.dataset.powerupIdx = POWERUP_TYPES.indexOf(p);
    container.style.display = 'block';
    container.style.left = (20 + Math.random() * 60) + '%';
    container.style.top = (25 + Math.random() * 30) + '%';
    container.style.animation = 'powerupPulse 1s ease-in-out infinite';
    setTimeout(() => { container.style.display = 'none'; }, 5000);
    schedulePowerup();
  }, 10000 + Math.random() * 15000);
}

function collectPowerup() {
  const container = document.getElementById('powerupContainer');
  const idx = parseInt(container.dataset.powerupIdx) || 0;
  container.style.display = 'none';
  const p = POWERUP_TYPES[idx];
  p.effect();
  AudioEngine.playSuccess();
  showToast(`⭐ ${p.name}!`, 'success');
}

// ===== UPGRADE SYSTEM =====
const UPGRADE_DATA = {
  cannon: [
    { name:'Bronz Top MK1', desc:'Daha büyük ve güçlü toplar', bonus:'+15 Hasar', cost:{gold:2000,wood:1000}, maxLevel:3 },
    { name:'Demir Top MK2', desc:'Dökme demir toplar', bonus:'+20 Hasar, +5% Menzil', cost:{gold:5000,wood:2500}, maxLevel:3 },
    { name:'Ateşli Gülle', desc:'Yangın çıkaran özel gülleler', bonus:'+10 Hasar, Yanma', cost:{gold:12000,wood:5000}, maxLevel:3 },
    { name:'Çift Ateş Düzeni', desc:'İki top aynı anda ateşlenir', bonus:'+25% Ateş Hızı', cost:{gold:25000,wood:10000}, maxLevel:2 },
    { name:'Kraliyet Topu', desc:'En güçlü top sistemi', bonus:'+50 Hasar, 2x Menzil', cost:{gold:60000,wood:25000}, maxLevel:1 },
  ],
  hull: [
    { name:'Demir Kaplama MK1', desc:'Gövdeye demir plakalar', bonus:'+200 Can', cost:{gold:1500,wood:3000}, maxLevel:3 },
    { name:'Güçlendirilmiş Demir', desc:'Katmanlı zırh plakası', bonus:'+300 Can, +5 Zırh', cost:{gold:4000,wood:8000}, maxLevel:3 },
    { name:'Çelik Kaplama', desc:'Yüksek kalite çelik gövde', bonus:'+500 Can, +10 Zırh', cost:{gold:10000,wood:20000}, maxLevel:3 },
    { name:'Mahmuz Başlığı', desc:'Çarpma hasarı verir', bonus:'+150 Çarpma', cost:{gold:20000,wood:40000}, maxLevel:2 },
    { name:'Efsane Gövde', desc:'Kraliyet tersanesi eseri', bonus:'+1000 Can, Hasar Azalt', cost:{gold:50000,wood:100000}, maxLevel:1 },
  ],
  sail: [
    { name:'Bölünmüş Yelken', desc:'Daha fazla yelken yüzeyi', bonus:'+15% Hız', cost:{gold:2000,wood:1500}, maxLevel:3 },
    { name:'İpek Yelken', desc:'Rüzgarı daha iyi yakalar', bonus:'+20% Hız, +Manevra', cost:{gold:5000,wood:4000}, maxLevel:3 },
    { name:'Çift Katlı Yelken', desc:'Üst direkler dahil tam set', bonus:'+30% Hız', cost:{gold:12000,wood:10000}, maxLevel:3 },
    { name:'Rüzgar Şimşeği', desc:'Fırtınada bile maksimum hız', bonus:'+Fırtına Hızı', cost:{gold:25000,wood:20000}, maxLevel:2 },
    { name:'Tanrısal Yelken', desc:'Destansı beyaz yelken seti', bonus:'+50% Hız, Efsane Görsel', cost:{gold:60000,wood:50000}, maxLevel:1 },
  ],
  crew: [
    { name:'Ek Topçu', desc:'Daha hızlı top doldurma', bonus:'-20% Cooldown', cost:{gold:3000,wood:0}, maxLevel:3 },
    { name:'Tecrübeli Dümenci', desc:'Keskin dönüş yetenekleri', bonus:'+25% Dönüş Hızı', cost:{gold:4000,wood:0}, maxLevel:3 },
    { name:'Denizci Cerrah', desc:'Savaşta yavaş can yeniler', bonus:'+2 HP/sn', cost:{gold:8000,wood:0}, maxLevel:3 },
    { name:'Gözcü Kulesi', desc:'Düşmanı erken tespit', bonus:'+30% Görüş Alanı', cost:{gold:15000,wood:0}, maxLevel:2 },
    { name:'Efsane Kaptan Tayfa', desc:'Tüm istatistikler artar', bonus:'+10% Tüm Stats', cost:{gold:40000,wood:0}, maxLevel:1 },
  ],
  keel: [
    { name:'Balast Taşı', desc:'Daha dengeli seyir', bonus:'+10 Denge', cost:{gold:1000,wood:2000}, maxLevel:3 },
    { name:'Bakır Kaplama Kil', desc:'Deniz canlılarına karşı koruma', bonus:'+5 Sürat', cost:{gold:3000,wood:5000}, maxLevel:3 },
    { name:'Demir Kil', desc:'Su kesme direnci artar', bonus:'+15% Hız', cost:{gold:8000,wood:12000}, maxLevel:3 },
    { name:'Yüzdürme Sistemi', desc:'Hasar sonrası dengeyi korur', bonus:'+Denge', cost:{gold:18000,wood:25000}, maxLevel:2 },
    { name:'Efsane Kil', desc:'Mühendisliğin doruk noktası', bonus:'Max Performans', cost:{gold:45000,wood:80000}, maxLevel:1 },
  ],
};

let currentUpgradeCategory = 'cannon';

function selectUpgradeCategory(cat, btn) {
  currentUpgradeCategory = cat;
  document.querySelectorAll('.upg-cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderUpgradeItems(cat);
  updateHubShipSVG();
}

function initUpgradeScreen() {
  document.getElementById('upgradeGold').textContent = GameState.gold.toLocaleString();
  document.getElementById('upgradeWood').textContent = GameState.wood.toLocaleString();
  updateHubShipSVG();
  renderUpgradeItems(currentUpgradeCategory);
}

function renderUpgradeItems(cat) {
  const container = document.getElementById('upgradeItems');
  container.innerHTML = '';
  const items = UPGRADE_DATA[cat] || [];
  const levels = GameState.upgrades[cat] || [];
  const catIcons = { cannon:'💥', hull:'🛡️', sail:'⛵', crew:'👥', keel:'⚓' };

  items.forEach((item, i) => {
    const level = levels[i] || 0;
    const isMax = level >= item.maxLevel;
    const canAfford = GameState.gold >= item.cost.gold && GameState.wood >= item.cost.wood;
    const prevMaxed = i === 0 || (levels[i-1] || 0) >= UPGRADE_DATA[cat][i-1].maxLevel;
    const locked = !prevMaxed;
    const dots = Array.from({length: item.maxLevel}, (_, d) => `<div class="level-dot ${d < level ? 'filled' : ''}"></div>`).join('');
    const div = document.createElement('div');
    div.className = `upgrade-item-card ${isMax ? 'maxed' : ''} ${locked ? 'locked' : ''}`;
    div.style.opacity = locked ? '0.4' : '1';
    div.innerHTML = `
      <div class="upg-icon">${catIcons[cat]}</div>
      <div class="upg-details">
        <div class="upg-name">${item.name} ${level > 0 ? `<span style="color:var(--gold);font-size:11px">Sv ${level}/${item.maxLevel}</span>` : ''}</div>
        <div class="upg-desc">${item.desc}</div>
        <div class="upg-bonus">${item.bonus}</div>
        <div class="upg-level-dots">${dots}</div>
      </div>
      <div style="text-align:center;">
        ${isMax ? `<div class="upg-buy-btn maxed-btn">✓ MAX</div>` :
          locked ? `<div class="upg-buy-btn" style="opacity:0.3;cursor:not-allowed">🔒 KİLİT</div>` :
          `<div style="font-size:10px;color:rgba(212,184,150,0.5);margin-bottom:4px;">
            ${item.cost.gold > 0 ? `🪙 ${item.cost.gold.toLocaleString()}` : ''}
            ${item.cost.wood > 0 ? ` 🪵 ${item.cost.wood.toLocaleString()}` : ''}
          </div>
          <button class="upg-buy-btn" ${(!canAfford || locked) ? 'disabled' : ''} onclick="buyUpgrade('${cat}',${i})">
            ${canAfford ? '⬆️ SATIN AL' : '❌ YETERSİZ'}
          </button>`
        }
      </div>
    `;
    container.appendChild(div);
  });
}

function buyUpgrade(cat, idx) {
  const item = UPGRADE_DATA[cat][idx];
  const levels = GameState.upgrades[cat];
  const level = levels[idx] || 0;
  if (level >= item.maxLevel) { showToast('Maksimum seviye!', 'warning'); return; }
  if (GameState.gold < item.cost.gold) { showToast('Yeterli altın yok!', 'danger'); return; }
  if (GameState.wood < item.cost.wood) { showToast('Yeterli ahşap yok!', 'danger'); return; }

  GameState.gold -= item.cost.gold;
  GameState.wood -= item.cost.wood;
  levels[idx] = (levels[idx] || 0) + 1;
  GameState.ship[cat] = Math.max(GameState.ship[cat] || 0, levels[idx]);

  AudioEngine.playSuccess();
  updateHubShipSVG();
  document.getElementById('upgradeGold').textContent = GameState.gold.toLocaleString();
  document.getElementById('upgradeWood').textContent = GameState.wood.toLocaleString();
  showToast(`✓ ${item.name} geliştirme tamamlandı!`, 'success');
  updateQuestProgress('upgrade');
  renderUpgradeItems(cat);
  saveGame();
}

// ===== ARENA =====
function startArenaWave() {
  GameState.arena.wave++;
  const wave = GameState.arena.wave;
  const won = Math.random() > (0.2 + wave * 0.05);

  if (won) {
    const goldEarned = wave * 150 + Math.random() * 100 | 0;
    const expEarned = wave * 50;
    GameState.arena.gold += goldEarned;
    GameState.arena.exp += expEarned;
    GameState.arena.kills += Math.ceil(wave / 2);
    GameState.arena.damage += wave * 80 + Math.random() * 200 | 0;
    AudioEngine.playSuccess();
    if (wave > GameState.arena.bestWave) {
      GameState.arena.bestWave = wave;
      showToast(`🏆 Yeni rekor: ${wave}. Dalga!`, 'success');
    } else {
      showToast(`✓ ${wave}. Dalga tamamlandı! +${goldEarned} Altın`, 'success');
    }
    updateQuestProgress('arena');
  } else {
    AudioEngine.playDanger();
    showToast(`💀 ${wave}. Dalgada yenildiniz!`, 'danger');
    GameState.arena.wave = Math.max(0, wave - 1);
  }

  updateArenaDisplay();
  document.getElementById('arenaWave').textContent = GameState.arena.wave;
  document.getElementById('arenaBestWave').textContent = GameState.arena.bestWave;
  saveGame();
}

function updateArenaDisplay() {
  document.getElementById('arenaGoldEarned').textContent = GameState.arena.gold.toLocaleString();
  document.getElementById('arenaExpEarned').textContent = GameState.arena.exp.toLocaleString();
  document.getElementById('arenaKills').textContent = GameState.arena.kills;
  document.getElementById('arenaDealt').textContent = GameState.arena.damage.toLocaleString();
  document.getElementById('arenaGoldDisp').textContent = GameState.arena.gold.toLocaleString();
  document.getElementById('arenaExpDisp').textContent = GameState.arena.exp.toLocaleString();
}

function exitArena() {
  if (GameState.arena.gold === 0 && GameState.arena.wave === 0) { showScreen('hub'); return; }
  const modal = document.getElementById('arenaExitModal');
  const container = document.getElementById('arenaExitRewards');
  container.innerHTML = `
    <div class="reward-item"><span class="r-icon">🪙</span><div><div class="r-val">+${GameState.arena.gold.toLocaleString()}</div><div class="r-label">ALTIN KAZANILDI</div></div></div>
    <div class="reward-item"><span class="r-icon">⚡</span><div><div class="r-val">+${GameState.arena.exp.toLocaleString()}</div><div class="r-label">EXP KAZANILDI</div></div></div>
    <div class="reward-item"><span class="r-icon">🌊</span><div><div class="r-val">${GameState.arena.wave}</div><div class="r-label">ATLATILAN DALGA</div></div></div>
    <div class="reward-item"><span class="r-icon">💀</span><div><div class="r-val">${GameState.arena.kills}</div><div class="r-label">GEMİ BATIRDI</div></div></div>
  `;
  modal.classList.remove('hidden');
}

function confirmArenaExit() {
  addGold(GameState.arena.gold);
  addExp(GameState.arena.exp);
  AudioEngine.playCoin();
  closeModal('arenaExitModal');
  GameState.arena.gold = 0;
  GameState.arena.exp = 0;
  GameState.arena.kills = 0;
  GameState.arena.damage = 0;
  GameState.arena.wave = 0;
  saveGame();
  showScreen('hub');
}

// ===== TREASURE HUNT =====
const TREASURE_TYPES = [
  { type:'empty', label:'Boş', icon:'·', goldMin:0, goldMax:0 },
  { type:'bronze', label:'Bronz Sikke', icon:'🟫', rarity:'common', goldMin:50, goldMax:150 },
  { type:'silver', label:'Gümüş', icon:'⬜', rarity:'uncommon', goldMin:200, goldMax:500 },
  { type:'gold', label:'Altın Torbası', icon:'🟨', rarity:'rare', goldMin:800, goldMax:2000 },
  { type:'royal', label:'Kraliyet Hazinesi', icon:'🟪', rarity:'legendary', goldMin:5000, goldMax:15000 },
];

function initTreasureGrid() {
  document.getElementById('digsLeft').textContent = GameState.treasure.digsLeft;
  document.getElementById('treasureFound').textContent = GameState.treasure.found;
  const today = new Date().toDateString();
  const status = document.getElementById('huntStatus');
  if (GameState.treasure.playedToday && GameState.treasure.lastPlayDate === today) {
    status.textContent = 'BUGÜN OYNANDI';
    status.style.color = 'var(--red-bright)';
  } else {
    status.textContent = 'BUGÜN OYNANABİLİR ✓';
    status.style.color = 'var(--green-bright)';
  }
  if (!GameState.treasure.grid || GameState.treasure.grid.length === 0) {
    GameState.treasure.grid = generateTreasureGrid();
    GameState.treasure.digsLeft = 4;
    GameState.treasure.found = 0;
  }
  renderTreasureGrid();
}

function generateTreasureGrid() {
  const grid = Array(25).fill(null).map(() => ({ type: 'empty', revealed: false }));
  [{ type:'bronze', count:4 }, { type:'silver', count:3 }, { type:'gold', count:2 }, { type:'royal', count:1 }].forEach(p => {
    let placed = 0;
    while (placed < p.count) {
      const idx = Math.floor(Math.random() * 25);
      if (grid[idx].type === 'empty' && !grid[idx].hasItem) {
        grid[idx].type = p.type; grid[idx].hasItem = true; placed++;
      }
    }
  });
  return grid;
}

function renderTreasureGrid() {
  const container = document.getElementById('treasureGrid');
  container.innerHTML = '';
  GameState.treasure.grid.forEach((cell, i) => {
    const div = document.createElement('div');
    div.className = 'grid-cell';
    if (cell.revealed) {
      div.className += ' dug ' + cell.type;
      div.textContent = TREASURE_TYPES.find(t => t.type === cell.type)?.icon || '·';
    } else {
      div.textContent = '?';
      div.onclick = () => digAt(i);
    }
    container.appendChild(div);
  });
  document.getElementById('digsLeft').textContent = GameState.treasure.digsLeft;
  document.getElementById('treasureFound').textContent = GameState.treasure.found;
}

function digAt(idx) {
  if (GameState.treasure.digsLeft <= 0) { showToast('Kazma hakkın bitti!', 'warning'); return; }
  const cell = GameState.treasure.grid[idx];
  if (cell.revealed) return;
  cell.revealed = true;
  GameState.treasure.digsLeft--;
  AudioEngine.playClick();
  const tType = TREASURE_TYPES.find(t => t.type === cell.type);
  if (cell.type !== 'empty') {
    const gold = tType.goldMin + Math.floor(Math.random() * (tType.goldMax - tType.goldMin));
    addGold(gold);
    GameState.treasure.found++;
    AudioEngine.playCoin();
    updateQuestProgress('treasure');
    showToast(`⛏️ ${tType.label}: +${gold.toLocaleString()} Altın!`, 'success');
    if (cell.type === 'royal') showToast('🟪 KRALİYET HAZİNESİ! BÜYÜK ÖDÜL!', 'success');
  } else {
    showToast('⛏️ Boş toprak...', 'warning');
  }
  renderTreasureGrid();
  if (GameState.treasure.digsLeft <= 0) {
    const today = new Date().toDateString();
    GameState.treasure.playedToday = true;
    GameState.treasure.lastPlayDate = today;
    GameState.treasure.grid = [];
    saveGame();
    showToast('Bugünlük kazı tamamlandı! Yarın yeni harita.', 'success');
  }
}

// ===== DAILY CHALLENGE =====
const CHALLENGES = [
  { name:'ÇİFTE HASAR', icon:'⚔️', desc:'Tüm topların hasarı 2 katına çıktı!', mod:'dmg2x', rewards:'🪙 2,000 • ⚡ 500 • 🎁 Altın Sandık', mult:2 },
  { name:'CAM TOP', icon:'💎', desc:'Siz 2x hasar veriyorsunuz ama siz de 2x hasar alıyorsunuz!', mod:'glass', rewards:'🪙 3,000 • ⚡ 800', mult:1.5 },
  { name:'HIZ ŞEYTANI', icon:'⚡', desc:'Top doldurma süresi %50 azaldı!', mod:'fast', rewards:'🪙 1,500 • ⚡ 400', mult:1.2 },
  { name:'TANK MODU', icon:'🛡️', desc:'Zırh 3 katına çıktı ama hız %50 düştü!', mod:'tank', rewards:'🪙 2,500 • ⚡ 600', mult:1.5 },
  { name:'BERSERKER', icon:'🔥', desc:'Can azaldıkça hasar artar!', mod:'berserk', rewards:'🪙 4,000 • ⚡ 1,200 • 💎 10', mult:2 },
  { name:'KABUS', icon:'💀', desc:'Düşman 2x güçlü, ödüller 3x!', mod:'nightmare', rewards:'🪙 6,000 • ⚡ 2,000 • 💎 20', mult:3 },
  { name:'ALTIN SAVAŞ', icon:'💰', desc:'Tüm altın ödülleri 3 katına çıktı!', mod:'golden', rewards:'🪙 8,000 • ⚡ 1,500 • 💎 30', mult:3 },
];

function initChallenge() {
  const idx = new Date().getDay();
  const ch = CHALLENGES[idx % CHALLENGES.length];
  document.getElementById('challengeName').textContent = ch.name;
  document.getElementById('challengeDesc').textContent = ch.desc;
  document.getElementById('challengeRewards').textContent = ch.rewards;
  const badge = document.getElementById('challengeName');
  badge.style.background = `linear-gradient(135deg, rgba(${idx%2?'201,162,39':'139,26,26'},0.3), rgba(${idx%2?'100,80,20':'80,10,10'},0.5))`;
}

// ===== CHEST SYSTEM =====
const CHEST_LOOT = [
  { name:'Ahşap Malzeme', icon:'🪵', weight:40, rarity:'common', wood:500 },
  { name:'Altın Torba', icon:'👝', weight:30, rarity:'common', gold:300 },
  { name:'Kaliteli Altın', icon:'💰', weight:15, rarity:'uncommon', gold:1000 },
  { name:'Değerli Taş', icon:'💎', weight:8, rarity:'rare', gems:10 },
  { name:'Efsane Altın', icon:'🏆', weight:4, rarity:'epic', gold:5000 },
  { name:'Kraliyet Hazinesi', icon:'👑', weight:2, rarity:'legendary', gold:15000, gems:50 },
  { name:'Elmas Kolye', icon:'💍', weight:1, rarity:'legendary', gold:25000, gems:100 },
];
const RARITY_COLORS = { common:'#aaa', uncommon:'#28a042', rare:'#4a9fd4', epic:'#aa44ff', legendary:'#c9a227' };

function showChestOpening() {
  const modal = document.getElementById('chestModal');
  document.getElementById('chestVisual').textContent = '📦';
  document.getElementById('chestVisual').className = 'chest-visual';
  document.getElementById('chestRewardArea').style.display = 'none';
  document.getElementById('chestOpenBtn').style.display = 'block';
  const ra = document.getElementById('rarityBar');
  ra.innerHTML = Array(8).fill(0).map((_, i) => `<div class="rarity-dot" style="--d:${i * 0.15}s"></div>`).join('');
  modal.classList.remove('hidden');
}

function openChest() {
  const cv = document.getElementById('chestVisual');
  const ca = document.getElementById('chestRewardArea');
  const ob = document.getElementById('chestOpenBtn');
  cv.className = 'chest-visual open';
  cv.textContent = '🎁';
  ob.style.display = 'none';
  AudioEngine.playSuccess();
  setTimeout(() => {
    const totalWeight = CHEST_LOOT.reduce((s, i) => s + i.weight, 0);
    let rand = Math.random() * totalWeight;
    let item = CHEST_LOOT[0];
    for (const loot of CHEST_LOOT) {
      rand -= loot.weight;
      if (rand <= 0) { item = loot; break; }
    }
    if (item.gold) addGold(item.gold);
    if (item.wood) GameState.wood += item.wood;
    if (item.gems) GameState.gems += item.gems;
    const dots = document.querySelectorAll('.rarity-dot');
    dots.forEach(d => { d.className = `rarity-dot ${item.rarity}`; });
    ca.style.display = 'block';
    ca.querySelector('#chestRewardIcon').textContent = item.icon;
    ca.querySelector('#chestRewardName').textContent = item.name;
    const label = ca.querySelector('#chestRarityLabel');
    const rarityNames = { common:'YAYGIN', uncommon:'SİRADIŞI', rare:'NADİR', epic:'EPİK', legendary:'EFSANE' };
    label.textContent = rarityNames[item.rarity] || item.rarity;
    label.style.background = RARITY_COLORS[item.rarity] + '22';
    label.style.border = `1px solid ${RARITY_COLORS[item.rarity]}`;
    label.style.color = RARITY_COLORS[item.rarity];
    if (item.rarity === 'legendary' || item.rarity === 'epic') AudioEngine.playLevelUp();
    showToast(`📦 ${item.name} kazandın! (${label.textContent})`, 'success');
    updateResourceDisplay();
    saveGame();
  }, 1500);
}

// ===== DAILY LOGIN =====
const LOGIN_REWARDS = [
  { day:1, gold:100, exp:50, gems:0, icon:'🪙' },
  { day:2, gold:250, exp:100, gems:0, icon:'💰' },
  { day:3, gold:500, exp:200, gems:5, icon:'💎' },
  { day:4, gold:1000, exp:400, gems:0, icon:'🎁' },
  { day:5, gold:2000, exp:800, gems:10, icon:'⚓' },
  { day:6, gold:3000, exp:1200, gems:15, icon:'🏆' },
  { day:7, gold:5000, exp:2000, gems:30, icon:'👑' },
];

function checkDailyLogin() {
  const today = new Date().toDateString();
  if (GameState.lastLoginDay === today) return; // Already claimed today
  
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (GameState.lastLoginDay !== yesterday) {
    GameState.loginStreak = 0; // Streak broken
  }
  
  GameState.loginStreak = Math.min(6, GameState.loginStreak + 1);
  GameState.lastLoginDay = today;
  
  const reward = LOGIN_REWARDS[GameState.loginStreak - 1] || LOGIN_REWARDS[6];
  addGold(reward.gold);
  addExp(reward.exp);
  if (reward.gems) GameState.gems += reward.gems;
  
  showDailyLoginModal(reward);
  saveGame();
}

function showDailyLoginModal(reward) {
  // Build reward grid
  const modal = document.getElementById('dailyLoginModal');
  if (!modal) return;
  
  const grid = document.getElementById('loginRewardGrid');
  grid.innerHTML = '';
  LOGIN_REWARDS.forEach((r, i) => {
    const isCurrent = i + 1 === GameState.loginStreak;
    const isPast = i + 1 < GameState.loginStreak;
    const div = document.createElement('div');
    div.className = `login-day ${isCurrent ? 'current' : ''} ${isPast ? 'claimed' : ''}`;
    div.innerHTML = `
      <div style="font-size:20px">${r.icon}</div>
      <div style="font-size:9px;color:var(--text-gold);margin-top:2px">Gün ${r.day}</div>
      <div style="font-size:10px;color:var(--gold-light)">🪙${r.gold}</div>
    `;
    grid.appendChild(div);
  });
  
  document.getElementById('loginStreakNum').textContent = GameState.loginStreak;
  document.getElementById('loginRewardGold').textContent = '+' + reward.gold.toLocaleString();
  document.getElementById('loginRewardExp').textContent = '+' + reward.exp;
  document.getElementById('loginRewardGems').textContent = reward.gems ? '+' + reward.gems : '—';
  
  modal.classList.remove('hidden');
  AudioEngine.playCoin();
}

// ===== BATTLE PASS =====
const BATTLEPASS_TIERS = [
  { tier:1, expReq:0, freeReward:'🪙 500 Altın', premiumReward:'💎 5 Taş', freeIcon:'🪙', premIcon:'💎' },
  { tier:2, expReq:500, freeReward:'🪵 1000 Ahşap', premiumReward:'🎁 Bronz Sandık', freeIcon:'🪵', premIcon:'🎁' },
  { tier:3, expReq:1200, freeReward:'🪙 1500 Altın', premiumReward:'⚔️ Özel Top Görünümü', freeIcon:'🪙', premIcon:'⚔️' },
  { tier:4, expReq:2400, freeReward:'💎 10 Taş', premiumReward:'🎁 Gümüş Sandık', freeIcon:'💎', premIcon:'🎁' },
  { tier:5, expReq:4000, freeReward:'🪙 3000 Altın', premiumReward:'⛵ Özel Yelken Rengi', freeIcon:'🪙', premIcon:'⛵' },
  { tier:6, expReq:6000, freeReward:'🪵 5000 Ahşap', premiumReward:'💎 25 Taş', freeIcon:'🪵', premIcon:'💎' },
  { tier:7, expReq:8500, freeReward:'🎁 Altın Sandık', premiumReward:'🎁 Efsane Sandık', freeIcon:'🎁', premIcon:'🎁' },
  { tier:8, expReq:11500, freeReward:'💎 20 Taş', premiumReward:'🛡️ Özel Gemi Zırhı', freeIcon:'💎', premIcon:'🛡️' },
  { tier:9, expReq:15000, freeReward:'🪙 10000 Altın', premiumReward:'🦜 Efsane Papağan Evcil', freeIcon:'🪙', premIcon:'🦜' },
  { tier:10, expReq:20000, freeReward:'👑 Sezon Tacı', premiumReward:'⚓ Efsane Gemi Görünümü', freeIcon:'👑', premIcon:'⚓' },
];

function initBattlePass() {
  const bp = GameState.battlePass;
  const container = document.getElementById('bpTiers');
  if (!container) return;
  container.innerHTML = '';

  // Update season exp bar
  const currentTierData = BATTLEPASS_TIERS[Math.min(bp.tier, BATTLEPASS_TIERS.length - 1)];
  const nextTierData = BATTLEPASS_TIERS[Math.min(bp.tier, BATTLEPASS_TIERS.length - 1)];
  const pct = nextTierData.expReq > 0 ? Math.min(100, (bp.exp / nextTierData.expReq) * 100) : 100;
  
  const bpBar = document.getElementById('bpExpBar');
  if (bpBar) bpBar.style.width = pct + '%';
  const bpTierEl = document.getElementById('bpCurrentTier');
  if (bpTierEl) bpTierEl.textContent = bp.tier;
  const bpExpEl = document.getElementById('bpExpText');
  if (bpExpEl) bpExpEl.textContent = bp.exp.toLocaleString() + ' / ' + (nextTierData.expReq || '∞') + ' EXP';

  BATTLEPASS_TIERS.forEach((tier, i) => {
    const unlocked = bp.tier > i;
    const freeClaimed = bp.tier > i; // Simplify: auto-claimed when tier passed
    const div = document.createElement('div');
    div.className = `bp-tier ${unlocked ? 'unlocked' : ''} ${i === bp.tier - 1 ? 'current' : ''}`;
    div.innerHTML = `
      <div class="bp-tier-num">Tier ${tier.tier}</div>
      <div class="bp-track free">
        <div class="bp-icon">${tier.freeIcon}</div>
        <div class="bp-reward-name" style="font-size:10px">${tier.freeReward}</div>
        ${unlocked ? '<div class="bp-claimed">✓</div>' : ''}
      </div>
      <div class="bp-track premium ${bp.premium ? '' : 'locked'}">
        <div class="bp-icon">${tier.premIcon}</div>
        <div class="bp-reward-name" style="font-size:10px">${tier.premiumReward}</div>
        ${bp.premium && unlocked ? '<div class="bp-claimed">✓</div>' : ''}
        ${!bp.premium ? '<div style="font-size:10px;color:#888">🔒 Premium</div>' : ''}
      </div>
    `;
    container.appendChild(div);
  });
}

// ===== CREW SCREEN =====
function initCrewScreen() {
  const container = document.getElementById('crewList');
  if (!container) return;
  container.innerHTML = '';
  
  GameState.crew.forEach((c, i) => {
    const roleIcons = { topcu:'🎯', dumenci:'⚓', cerrah:'💊', gozcu:'👁️' };
    const rarityColors = { common:'#aaa', uncommon:'#28a042', rare:'#4a9fd4', epic:'#aa44ff' };
    const div = document.createElement('div');
    div.className = `crew-card ${c.active ? 'active' : ''}`;
    div.innerHTML = `
      <div class="crew-avatar">${roleIcons[c.role] || '👤'}</div>
      <div class="crew-info">
        <div class="crew-name" style="color:${rarityColors[c.rarity] || '#aaa'}">${c.name}</div>
        <div style="font-size:11px;color:rgba(212,184,150,0.5)">${c.role.toUpperCase()}</div>
        <div style="font-size:12px;color:var(--gold-light)">+${c.value}% ${c.bonus === 'reload' ? 'Hız' : c.bonus === 'speed' ? 'Hız' : c.bonus === 'heal' ? 'İyileşme' : 'Stat'}</div>
      </div>
      <button class="crew-toggle-btn ${c.active ? 'active' : ''}" onclick="toggleCrew(${i})">
        ${c.active ? '✓ AKTİF' : 'AKTİF ET'}
      </button>
    `;
    container.appendChild(div);
  });
  
  // Pets section
  const petContainer = document.getElementById('petList');
  if (petContainer) {
    petContainer.innerHTML = '';
    GameState.pets.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = `crew-card ${p.active ? 'active' : ''}`;
      div.innerHTML = `
        <div class="crew-avatar" style="font-size:28px">${p.emoji}</div>
        <div class="crew-info">
          <div class="crew-name">${p.name}</div>
          <div style="font-size:11px;color:rgba(212,184,150,0.5)">EVCİL HAYVAN</div>
          <div style="font-size:12px;color:var(--gold-light)">+${p.value}% ${p.bonus === 'gold' ? 'Altın' : 'EXP'}</div>
        </div>
        <button class="crew-toggle-btn ${p.active ? 'active' : ''}" onclick="togglePet(${i})">
          ${p.active ? '✓ AKTİF' : 'AKTİF ET'}
        </button>
      `;
      petContainer.appendChild(div);
    });
  }
}

function toggleCrew(idx) {
  GameState.crew.forEach(c => c.active = false);
  GameState.crew[idx].active = true;
  AudioEngine.playClick();
  showToast(`${GameState.crew[idx].name} mürettebata katıldı!`, 'success');
  initCrewScreen();
  saveGame();
}

function togglePet(idx) {
  GameState.pets.forEach(p => p.active = false);
  GameState.pets[idx].active = true;
  AudioEngine.playClick();
  showToast(`${GameState.pets[idx].name} aktifleştirildi!`, 'success');
  initCrewScreen();
  saveGame();
}

// ===== PROFILE =====
const ACHIEVEMENTS = [
  { id:'a1', name:'İlk Adım', desc:'İlk savaşı kazan', icon:'⚔️', unlocked:true },
  { id:'a2', name:'Çaylak Kaptan', desc:"Seviye 5'e ulaş", icon:'🎖️', unlocked:true },
  { id:'a3', name:'Gemi Tamircisi', desc:'İlk geliştirmeyi yap', icon:'⚙️', unlocked:true },
  { id:'a4', name:'Hazine Avcısı', desc:'İlk hazineyi bul', icon:'🗝️', unlocked:true },
  { id:'a5', name:'Arena Savaşçısı', desc:'5. dalgaya ulaş', icon:'🏟️', unlocked:true },
  { id:'a6', name:'Patron Avcısı', desc:'Patron yok et', icon:'💀', unlocked:false },
  { id:'a7', name:'Fırtına Savaşçısı', desc:'Fırtınada kazan', icon:'⛈️', unlocked:false },
  { id:'a8', name:'Zengin Kaptan', desc:'1M altın biriktir', icon:'💰', unlocked:false },
  { id:'a9', name:'Efsane', desc:"Seviye 50'ye ulaş", icon:'👑', unlocked:false },
  { id:'a10', name:'Kraken Katili', desc:"Krakeni yenilgiye uğrat", icon:'🦑', unlocked:false },
  { id:'a11', name:'Arena Efsanesi', desc:'20. dalgaya ulaş', icon:'🏆', unlocked:false },
  { id:'a12', name:'Zindan Kâşifi', desc:'Tüm zindanları temizle', icon:'🗺️', unlocked:false },
];

function initProfile() {
  document.getElementById('profileName').textContent = GameState.playerName || 'KAPTAN';
  document.getElementById('profileLevel').textContent = GameState.level;
  document.getElementById('profileWins').textContent = GameState.wins;
  document.getElementById('profileKills').textContent = GameState.kills;
  document.getElementById('profileBestWave').textContent = GameState.arena.bestWave;
  
  const grid = document.getElementById('achievementGrid');
  grid.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const div = document.createElement('div');
    div.className = `achievement-card ${a.unlocked ? 'unlocked' : ''}`;
    div.innerHTML = `<div class="ach-icon">${a.icon}</div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div>`;
    grid.appendChild(div);
  });
}

// ===== SETTINGS =====
function applySavedSettings() {
  const musicSlider = document.getElementById('musicSlider');
  const sfxSlider = document.getElementById('sfxSlider');
  if (musicSlider) {
    musicSlider.value = GameState.settings.music;
    document.getElementById('musicVal').textContent = GameState.settings.music;
    AudioEngine.setMusicVolume(GameState.settings.music / 100);
  }
  if (sfxSlider) {
    sfxSlider.value = GameState.settings.sfx;
    document.getElementById('sfxVal').textContent = GameState.settings.sfx;
    AudioEngine.setSfxVolume(GameState.settings.sfx / 100);
  }
}

function showSettingsTab(name, btn) {
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  ['audio','display','language','account','changelog'].forEach(t => {
    const el = document.getElementById('settings-' + t);
    if (el) el.classList.toggle('hidden', t !== name);
  });
}

function updateSlider(el, valId) {
  const val = el.value;
  document.getElementById(valId).textContent = val;
  if (valId === 'musicVal') {
    GameState.settings.music = parseInt(val);
    AudioEngine.setMusicVolume(val / 100);
  }
  if (valId === 'sfxVal') {
    GameState.settings.sfx = parseInt(val);
    AudioEngine.setSfxVolume(val / 100);
  }
  saveGame();
}

function selectLanguage(btn) {
  document.querySelectorAll('#settings-language button').forEach(b => {
    b.style.borderColor = 'rgba(255,255,255,0.08)';
    b.style.background = 'rgba(255,255,255,0.03)';
  });
  btn.style.borderColor = 'var(--gold)';
  btn.style.background = 'rgba(201,162,39,0.1)';
  showToast('Dil güncellendi!', 'success');
}

// ===== RESOURCE MANAGEMENT =====
function addGold(amount) {
  GameState.gold += amount;
  updateResourceDisplay();
}

function addExp(amount) {
  GameState.battlePass.exp += Math.floor(amount * 0.1);
  GameState.exp += amount;
  while (GameState.exp >= GameState.expToNext) {
    GameState.exp -= GameState.expToNext;
    GameState.level++;
    GameState.expToNext = Math.floor(GameState.expToNext * 1.4);
    showLevelUp(GameState.level);
  }
  // Update battle pass tier
  const bp = GameState.battlePass;
  while (bp.tier < BATTLEPASS_TIERS.length && bp.exp >= BATTLEPASS_TIERS[bp.tier]?.expReq) {
    bp.tier++;
  }
  updateResourceDisplay();
}

function updateResourceDisplay() {
  const updateEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof val === 'number' ? val.toLocaleString() : val;
  };
  updateEl('goldDisplay', GameState.gold);
  updateEl('woodDisplay', GameState.wood);
  updateEl('gemDisplay', GameState.gems);
  updateEl('hubLevel', GameState.level);
  updateEl('upgradeGold', GameState.gold);
  updateEl('upgradeWood', GameState.wood);
  const expPct = Math.min(100, (GameState.exp / GameState.expToNext * 100));
  const expBar = document.getElementById('expBarMini');
  if (expBar) expBar.style.width = expPct + '%';
  const expText = document.getElementById('expText');
  if (expText) expText.textContent = `${GameState.exp.toLocaleString()}/${GameState.expToNext.toLocaleString()} EXP`;
}

function showLevelUp(level) {
  document.getElementById('newLevelNum').textContent = level;
  document.getElementById('levelUpModal').classList.remove('hidden');
  AudioEngine.playLevelUp();
  showToast(`🎉 SEVİYE ATLADINIZ! Seviye ${level}`, 'success');
}

// ===== MODAL MANAGEMENT =====
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ===== TOAST NOTIFICATIONS =====
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success:'✓', warning:'⚠️', danger:'⚠️' };
  toast.innerHTML = `<span style="font-size:16px">${icons[type] || '✓'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  AudioEngine.init();
  initStars();
  loadGame();

  // Splash screen click — attach here so showScreen is defined
  const splash = document.getElementById('screen-splash');
  if (splash) {
    splash.addEventListener('click', () => {
      AudioEngine.resume();
      showScreen('menu');
    });
  }

  if (GameState.playerName) {
    updateResourceDisplay();
    AudioEngine.startAmbientMusic('calm');
  }

  if (!GameState.treasure.grid || GameState.treasure.grid.length === 0) {
    GameState.treasure.grid = generateTreasureGrid();
  }

  // Init quest states from saved
  QUESTS.forEach(q => {
    if (!GameState.questState[q.id]) {
      GameState.questState[q.id] = { current: 0, state: 'active' };
    }
  });
  // Pre-complete some for demo
  if (!GameState.questState['q1']) GameState.questState['q1'] = { current: 3, state: 'completed' };
  if (!GameState.questState['q5']) GameState.questState['q5'] = { current: 1, state: 'completed' };
  if (!GameState.questState['q8']) GameState.questState['q8'] = { current: 100000, state: 'completed' };

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      const battleScreen = document.getElementById('screen-battle');
      if (battleScreen && battleScreen.classList.contains('active')) {
        e.preventDefault();
        fireCannon();
      }
    }
  });

  // First click anywhere to start audio
  document.addEventListener('click', () => { AudioEngine.resume(); }, { once: true });

  // Register service worker for PWA/offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  console.log('🌊 Sea Conqueror v2.0 — Loaded!');
});

// ===== LEGACY ALIASES =====
function showDailyReward() { checkDailyLogin(); }
function claimDailyReward() { closeModal('dailyRewardModal'); }
