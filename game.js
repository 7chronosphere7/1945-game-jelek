// --- KONFIGURASI GAME & STATE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'START'; // START, PLAY, GAMEOVER, VICTORY
let score = 0;
let stage = 1;
let difficulty = 'easy'; // easy, normal, hard
let screenShake = 0;
let shakeX = 0;
let shakeY = 0;
let isMuted = false;
let hitstop = 0; // Detik. Saat > 0, update logika game dibekukan (freeze-frame) untuk impact
let screenInvertFlash = 0; // Efek flash negatif full screen
let ultimateShockwave = null; // Status visual shockwave dari ultimate bomb
const floatingTexts = []; // Teks skor melayang saat musuh dihancurkan

// Penanganan Canvas agar responsif
const GAME_WIDTH = 512;
const GAME_HEIGHT = 768;

function resizeCanvas() {
    // Menyesuaikan rasio aspek game
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Set resolusi internal canvas
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- SISTEM SUARA (WEB AUDIO API SYNTHESIS) ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;

    try {
        const now = audioCtx.currentTime;
        
        if (type === 'laser') {
            // Suara Tembakan Laser
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'laser_heavy') {
            // Suara Laser Berat (Piercing)
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'missile') {
            // Suara Luncuran Misil (Whoosh)
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'plasma') {
            // Suara Plasma Blast
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
            gainNode.gain.setValueAtTime(0.18, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'ultimate') {
            // Suara Mega Bomb Shockwave
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.linearRampToValueAtTime(10, now + 1.0);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 1.0);
        } else if (type === 'explosion_small') {
            // Ledakan Musuh Kecil
            const bufferSize = audioCtx.sampleRate * 0.1; // 0.1 detik
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.1);
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            noise.start(now);
            noise.stop(now + 0.15);
        } else if (type === 'explosion_large') {
            // Ledakan Pemain / Boss
            const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 detik
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, now);
            filter.frequency.exponentialRampToValueAtTime(40, now + 0.5);
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.6, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            noise.start(now);
            noise.stop(now + 0.5);
        } else if (type === 'powerup') {
            // Mengambil Item Power-up
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(300, now);
            osc1.frequency.setValueAtTime(450, now + 0.08);
            osc1.frequency.setValueAtTime(600, now + 0.16);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(600, now);
            osc2.frequency.setValueAtTime(900, now + 0.08);
            osc2.frequency.setValueAtTime(1200, now + 0.16);
            
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.25);
            osc2.stop(now + 0.25);
        }
    } catch (e) {
        console.warn('Gagal memutar audio:', e);
    }
}

// --- INPUT HANDLER ---
const keys = {};
let mouseX = GAME_WIDTH / 2;
let mouseY = GAME_HEIGHT - 100;
let isMouseActive = false;

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        e.preventDefault(); // Cegah scrolling browser
        if (player.hyperCharge >= 100 && gameState === 'PLAY') {
            triggerUltimate();
        }
    }
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') && gameState === 'PLAY') {
        triggerUltimate();
    }
    isMouseActive = false;
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handlePointerMove(e) {
    initAudio();
    isMouseActive = true;
    const coords = getCanvasCoordinates(e);
    mouseX = Math.max(0, Math.min(GAME_WIDTH, coords.x));
    mouseY = Math.max(0, Math.min(GAME_HEIGHT, coords.y));
}

canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('touchmove', (e) => {
    handlePointerMove(e);
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('mousedown', () => { isMouseActive = true; });
canvas.addEventListener('touchstart', (e) => {
    initAudio();
    isMouseActive = true;
    const coords = getCanvasCoordinates(e);
    mouseX = coords.x;
    mouseY = coords.y;
}, { passive: true });


// --- ASET LATAR BELAKANG PARALLAX ---
const stars = []; // Menggunakan partikel debu angkasa/awan kecil
const islands = [];
const clouds = [];

// Inisialisasi latar belakang
function initBackground() {
    islands.length = 0;
    clouds.length = 0;
    
    // Buat beberapa pulau di awal
    for (let i = 0; i < 5; i++) {
        islands.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            size: 40 + Math.random() * 60,
            speed: 0.5,
            color: `hsl(${100 + Math.random() * 20}, 40%, ${30 + Math.random() * 10}%)`
        });
    }
    
    // Buat beberapa awan
    for (let i = 0; i < 4; i++) {
        clouds.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            size: 80 + Math.random() * 70,
            speed: 1.5 + Math.random() * 1.5,
            opacity: 0.15 + Math.random() * 0.15
        });
    }
}

function updateBackground(dt) {
    // Update pulau
    islands.forEach(island => {
        island.y += island.speed * dt * 60;
        if (island.y > GAME_HEIGHT + island.size) {
            island.y = -island.size;
            island.x = Math.random() * GAME_WIDTH;
        }
    });

    // Update awan
    clouds.forEach(cloud => {
        cloud.y += cloud.speed * dt * 60;
        if (cloud.y > GAME_HEIGHT + cloud.size) {
            cloud.y = -cloud.size;
            cloud.x = Math.random() * GAME_WIDTH;
        }
    });
}

function drawBackground() {
    // 1. Warna Dasar Laut
    ctx.fillStyle = '#0f2038';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Grid garis laut modern untuk mensimulasikan gerak maju parallax
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSpacing = 64;
    const scrollOffset = (stageTimer * 30) % gridSpacing;
    for (let y = scrollOffset; y < GAME_HEIGHT; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
    }

    // 2. Gambar Pulau dengan Tebing 3D (sisi bayangan tebing bawah-kanan)
    islands.forEach(island => {
        // Tebing 3D
        ctx.fillStyle = '#1b2c15';
        ctx.beginPath();
        ctx.arc(island.x + 5, island.y + 7, island.size, 0, Math.PI * 2);
        ctx.fill();

        // Daratan Pulau
        ctx.fillStyle = island.color;
        ctx.beginPath();
        ctx.arc(island.x, island.y, island.size, 0, Math.PI * 2);
        ctx.fill();

        // Garis pantai pasir tipis
        ctx.strokeStyle = '#e2c992';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(island.x, island.y, island.size + 1, 0, Math.PI * 2);
        ctx.stroke();
    });

    // 2.5 Gambar Bayangan Awan di permukaan (Altitude z=80)
    clouds.forEach(cloud => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.beginPath();
        const sOff = 32; // Offset bayangan
        ctx.arc(cloud.x + sOff, cloud.y + sOff * 1.2, cloud.size * 1.05, 0, Math.PI * 2);
        ctx.arc(cloud.x + sOff + cloud.size * 0.4, cloud.y + sOff * 1.2 - cloud.size * 0.2, cloud.size * 0.8, 0, Math.PI * 2);
        ctx.arc(cloud.x + sOff - cloud.size * 0.4, cloud.y + sOff * 1.2 - cloud.size * 0.2, cloud.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
    });

    // 3. Gambar Awan (Parallax)
    clouds.forEach(cloud => {
        ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 0.4, cloud.y - cloud.size * 0.2, cloud.size * 0.8, 0, Math.PI * 2);
        ctx.arc(cloud.x - cloud.size * 0.4, cloud.y - cloud.size * 0.2, cloud.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
    });
}


// --- SISTEM BAYANGAN 3D ELEVASI (ALTITUDE SHADOWS) ---
function drawEntityShadows() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    
    // 1. Bayangan Pemain (Ketinggian z=35)
    if (gameState === 'PLAY' && !(player.invincible > 0 && Math.floor(player.invincible * 20) % 2 === 0)) {
        ctx.save();
        const pz = 35;
        ctx.translate(player.x + pz * 0.35, player.y + pz * 0.45);
        if (player.rollAngle) {
            ctx.scale(Math.cos(player.rollAngle), 1);
            ctx.rotate(player.rollAngle * 0.25);
        }
        
        // Sayap F-22
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-28, 5);
        ctx.lineTo(-24, 11);
        ctx.lineTo(-8, 5);
        ctx.lineTo(8, 5);
        ctx.lineTo(24, 11);
        ctx.lineTo(28, 5);
        ctx.closePath();
        ctx.fill();
        
        // Twin tail fins F-22
        ctx.beginPath();
        ctx.moveTo(-5, 12); ctx.lineTo(-15, 23); ctx.lineTo(-11, 25); ctx.lineTo(-2, 15);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, 12); ctx.lineTo(14, 23); ctx.lineTo(10, 25); ctx.lineTo(2, 15);
        ctx.closePath(); ctx.fill();

        // Badan F-22
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(5, -17);
        ctx.lineTo(6, 18);
        ctx.lineTo(-6, 18);
        ctx.lineTo(-5, -17);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    // 2. Bayangan Musuh
    enemies.forEach(e => {
        ctx.save();
        let ez = 25;
        if (e.type === 'medium') ez = 30;
        if (e.type === 'boss') ez = 50;
        
        ctx.translate(e.x + ez * 0.35, e.y + ez * 0.45);
        if (e.rollAngle) {
            ctx.scale(Math.cos(e.rollAngle), 1);
            ctx.rotate(e.rollAngle * 0.25);
        }
        
        if (e.type === 'small') {
            // Bayangan Stealth Drone
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(-18, 4);
            ctx.lineTo(-12, 8);
            ctx.lineTo(0, 2);
            ctx.lineTo(12, 8);
            ctx.lineTo(18, 4);
            ctx.closePath();
            ctx.fill();
        } else if (e.type === 'medium') {
            // Bayangan Jet Tempur Su-57
            // Sayap
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(-28, -2);
            ctx.lineTo(-22, 6);
            ctx.lineTo(-8, 2);
            ctx.lineTo(8, 2);
            ctx.lineTo(22, 6);
            ctx.lineTo(28, -2);
            ctx.closePath();
            ctx.fill();
            // Badan
            ctx.beginPath();
            ctx.moveTo(0, -22);
            ctx.lineTo(5, -12);
            ctx.lineTo(6, 14);
            ctx.lineTo(-6, 14);
            ctx.lineTo(-5, -12);
            ctx.closePath();
            ctx.fill();
        } else if (e.type === 'boss') {
            // Bayangan Pembom B-2 Spirit
            ctx.beginPath();
            ctx.moveTo(0, -42);
            ctx.lineTo(-65, -10);
            ctx.lineTo(-45, 12);
            ctx.lineTo(-30, 2);
            ctx.lineTo(0, 16);
            ctx.lineTo(30, 2);
            ctx.lineTo(45, 12);
            ctx.lineTo(65, -10);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    });
    
    // 3. Bayangan Peluru
    bullets.forEach(b => {
        if (b.type === 'laser') return;
        const bz = b.isPlayerOwned ? 15 : 12;
        ctx.fillRect(b.x - b.width / 2 + bz * 0.35, b.y - b.height / 2 + bz * 0.45, b.width, b.height);
    });
    
    // 4. Bayangan Item Powerup (z=8)
    powerUps.forEach(p => {
        ctx.save();
        const pz = 8;
        ctx.translate(p.x + pz * 0.35, p.y + pz * 0.45);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx.restore();
    });
    
    ctx.restore();
}


// --- PARTICLE SYSTEM ---
const particles = [];
const vaporTrails = [];

function spawnExplosion(x, y, color, count = 15, baseSize = 3) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * baseSize + 2,
            color: color,
            alpha: 1,
            decay: 0.02 + Math.random() * 0.03
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.alpha -= p.decay * dt * 60;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function updateVaporTrails(dt) {
    for (let i = vaporTrails.length - 1; i >= 0; i--) {
        const vt = vaporTrails[i];
        vt.alpha -= vt.decay * dt * 60;
        if (vt.alpha <= 0) {
            vaporTrails.splice(i, 1);
        }
    }
}

function drawVaporTrails() {
    ctx.save();
    vaporTrails.forEach(vt => {
        ctx.fillStyle = `rgba(240, 248, 255, ${vt.alpha})`;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
        ctx.shadowBlur = vt.size * 2;
        ctx.beginPath();
        ctx.arc(vt.x, vt.y, vt.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}


// --- FLOATING SCORE TEXT ---
function spawnFloatingText(x, y, text, color = '#ffd700') {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        alpha: 1,
        vy: -1.2,
        scale: 1.3
    });
}

function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy * dt * 60;
        ft.vy *= 0.94; // Melambat seiring waktu
        ft.scale += (1 - ft.scale) * 0.2; // Menyusut ke skala normal
        ft.alpha -= 0.02 * dt * 60;
        if (ft.alpha <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

function drawFloatingTexts() {
    floatingTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.translate(ft.x, ft.y);
        ctx.scale(ft.scale, ft.scale);
        ctx.font = 'bold 16px Rajdhani';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeText(ft.text, 0, 0);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
    });
}


// --- ENTITAS ---

// 1. PEMAIN (PLAYER)
const player = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 100,
    width: 50,
    height: 50,
    speed: 6,
    health: 100,
    maxHealth: 100,
    shield: 0, // Nilai 0 sampai 100
    weaponLevel: 1, // 1: Tembak 1, 2: Tembak 2, 3: Tembak 3
    weaponType: 'spread', // 'spread', 'laser', 'missile', 'plasma'
    hyperCharge: 0, // 0 - 100
    comboCount: 0,
    comboTimer: 0,
    rollAngle: 0,
    targetRoll: 0,
    fireCooldown: 0,
    fireRate: 0.18, // Detik per tembakan
    propellerAngle: 0,
    invincible: 0, // Timer invincibility frames (detik). > 0 = kebal & berkedip
    hitFlashTimer: 0, // Timer kedip putih saat baru kena damage
    
    update(dt) {
        // Kurangi timer invincibility & hit flash
        if (this.invincible > 0) this.invincible -= dt;
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        
        // Kontrol keyboard
        let dx = 0;
        let dy = 0;
        if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
        if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
        if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
        if (keys['KeyS'] || keys['ArrowDown']) dy = 1;
        
        if (!isMouseActive && (dx !== 0 || dy !== 0)) {
            // Normalisasi agar pergerakan diagonal tidak lebih cepat
            const length = Math.sqrt(dx * dx + dy * dy);
            this.x += (dx / length) * this.speed * dt * 60;
            this.y += (dy / length) * this.speed * dt * 60;
            this.targetRoll = dx * 0.45;
        } else if (isMouseActive) {
            // Ikuti mouse secara halus (lerp)
            const prevX = this.x;
            this.x += (mouseX - this.x) * 0.25;
            this.y += (mouseY - this.y) * 0.25;
            
            // Hitung target kemiringan berdasarkan kecepatan pergeseran mouse
            const diffX = mouseX - prevX;
            this.targetRoll = Math.max(-0.45, Math.min(0.45, diffX * 0.08));
        } else {
            this.targetRoll = 0;
        }
        
        // Interpolasi kemiringan secara halus
        this.rollAngle += (this.targetRoll - this.rollAngle) * 0.18 * dt * 60;
        
        // Update Combo Timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
            }
        }
        
        // Batasi gerakan di dalam canvas
        this.x = Math.max(this.width / 2, Math.min(GAME_WIDTH - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(GAME_HEIGHT - this.height / 2, this.y));
        
        // Update Propeller
        this.propellerAngle += 0.5 * dt * 60;
        
        // Kurangi shield secara otomatis seiring waktu jika aktif
        if (this.shield > 0) {
            this.shield -= 2 * dt;
            if (this.shield < 0) this.shield = 0;
        }
        
        // Tembakan otomatis / manual
        if (this.fireCooldown > 0) {
            this.fireCooldown -= dt;
        }
        
        if (this.fireCooldown <= 0 && (isMouseActive || keys['Space'])) {
            this.fire();
            this.fireCooldown = this.fireRate;
        }

        // 1. Spawning Vapor Trails (di ujung sayap saat rollAngle tajam)
        if (Math.abs(this.rollAngle) > 0.08) {
            const cosR = Math.cos(this.rollAngle);
            const sinRot = Math.sin(this.rollAngle * 0.25);
            const cosRot = Math.cos(this.rollAngle * 0.25);
            
            // Ujung sayap kiri (lx = -28)
            const leftX = this.x + (-28) * cosR * cosRot;
            const leftY = this.y + (-28) * cosR * sinRot;
            
            // Ujung sayap kanan (lx = 28)
            const rightX = this.x + 28 * cosR * cosRot;
            const rightY = this.y + 28 * cosR * sinRot;
            
            vaporTrails.push({ x: leftX, y: leftY, alpha: 0.55, decay: 0.025, size: 2.2 });
            vaporTrails.push({ x: rightX, y: rightY, alpha: 0.55, decay: 0.025, size: 2.2 });
        }
        
        // 2. Spawning Engine Exhaust Heat haze particles
        if (Math.random() < 0.45) {
            let thrustY = 1.0;
            if (keys['KeyW'] || keys['ArrowUp']) thrustY = 1.6;
            else if (keys['KeyS'] || keys['ArrowDown']) thrustY = 0.55;
            
            const cosR = Math.cos(this.rollAngle);
            const sinRot = Math.sin(this.rollAngle * 0.25);
            const cosRot = Math.cos(this.rollAngle * 0.25);
            
            [-4, 4].forEach(lx => {
                const ly = 18;
                const px = lx * cosR;
                const py = ly;
                const worldX = this.x + px * cosRot - py * sinRot;
                const worldY = this.y + px * sinRot + py * cosRot;
                
                particles.push({
                    x: worldX,
                    y: worldY,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: 3 + Math.random() * 2 * thrustY,
                    size: Math.random() * 3 + 2,
                    color: Math.random() < 0.3 ? '#00f3ff' : (Math.random() < 0.7 ? '#ff7b00' : 'rgba(255, 255, 255, 0.1)'),
                    alpha: 0.5,
                    decay: 0.08 + Math.random() * 0.04
                });
            });
        }
    },
    
    fire() {
        if (this.weaponType === 'spread') {
            playSound('laser');
            if (this.weaponLevel === 1) {
                bullets.push(new Bullet(this.x, this.y - 25, 0, -10, true, 'spread'));
            } else if (this.weaponLevel === 2) {
                bullets.push(new Bullet(this.x - 12, this.y - 15, -1.2, -10, true, 'spread'));
                bullets.push(new Bullet(this.x + 12, this.y - 15, 1.2, -10, true, 'spread'));
            } else {
                bullets.push(new Bullet(this.x, this.y - 25, 0, -10, true, 'spread'));
                bullets.push(new Bullet(this.x - 18, this.y - 10, -2, -10, true, 'spread'));
                bullets.push(new Bullet(this.x + 18, this.y - 10, 2, -10, true, 'spread'));
                bullets.push(new Bullet(this.x - 30, this.y - 5, -3.5, -9, true, 'spread'));
                bullets.push(new Bullet(this.x + 30, this.y - 5, 3.5, -9, true, 'spread'));
            }
        } else if (this.weaponType === 'laser') {
            playSound('laser_heavy');
            if (this.weaponLevel === 1) {
                bullets.push(new Bullet(this.x, this.y - 25, 0, -14, true, 'laser', 15));
            } else if (this.weaponLevel === 2) {
                bullets.push(new Bullet(this.x - 16, this.y - 15, 0, -15, true, 'laser', 12));
                bullets.push(new Bullet(this.x + 16, this.y - 15, 0, -15, true, 'laser', 12));
            } else {
                bullets.push(new Bullet(this.x, this.y - 25, 0, -16, true, 'laser', 15));
                bullets.push(new Bullet(this.x - 20, this.y - 15, 0, -16, true, 'laser', 11));
                bullets.push(new Bullet(this.x + 20, this.y - 15, 0, -16, true, 'laser', 11));
            }
        } else if (this.weaponType === 'missile') {
            playSound('missile');
            if (this.weaponLevel === 1) {
                bullets.push(new Bullet(this.x - 18, this.y - 10, -2, -4, true, 'missile', 12));
                bullets.push(new Bullet(this.x + 18, this.y - 10, 2, -4, true, 'missile', 12));
            } else if (this.weaponLevel === 2) {
                bullets.push(new Bullet(this.x - 20, this.y - 10, -3, -3, true, 'missile', 12));
                bullets.push(new Bullet(this.x + 20, this.y - 10, 3, -3, true, 'missile', 12));
                bullets.push(new Bullet(this.x - 10, this.y - 15, -1, -5, true, 'missile', 12));
                bullets.push(new Bullet(this.x + 10, this.y - 15, 1, -5, true, 'missile', 12));
            } else {
                bullets.push(new Bullet(this.x - 24, this.y, -4, -2, true, 'missile', 12));
                bullets.push(new Bullet(this.x + 24, this.y, 4, -2, true, 'missile', 12));
                bullets.push(new Bullet(this.x - 16, this.y - 10, -2, -4, true, 'missile', 12));
                bullets.push(new Bullet(this.x + 16, this.y - 10, 2, -4, true, 'missile', 12));
                bullets.push(new Bullet(this.x - 8, this.y - 20, -0.5, -6, true, 'missile', 12));
                bullets.push(new Bullet(this.x + 8, this.y - 20, 0.5, -6, true, 'missile', 12));
            }
        } else if (this.weaponType === 'plasma') {
            playSound('plasma');
            if (this.weaponLevel === 1) {
                bullets.push(new Bullet(this.x, this.y - 25, 0, -6, true, 'plasma', 25, 70));
            } else if (this.weaponLevel === 2) {
                bullets.push(new Bullet(this.x, this.y - 25, 0, -6.5, true, 'plasma', 45, 100));
            } else {
                bullets.push(new Bullet(this.x, this.y - 25, 0, -7, true, 'plasma', 40, 80));
                bullets.push(new Bullet(this.x - 22, this.y - 10, -1.2, -6, true, 'plasma', 25, 60));
                bullets.push(new Bullet(this.x + 22, this.y - 10, 1.2, -6, true, 'plasma', 25, 60));
            }
        }
    },
    
    draw() {
        // Berkedip saat invincible (lewati gambar setiap frame ganjil)
        if (this.invincible > 0 && Math.floor(this.invincible * 20) % 2 === 0) {
            return;
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.rollAngle) {
            ctx.scale(Math.cos(this.rollAngle), 1);
            ctx.rotate(this.rollAngle * 0.25);
        }
        
        // Flash putih singkat saat baru kena damage
        const isFlashing = this.hitFlashTimer > 0;
        if (isFlashing) {
            ctx.filter = 'brightness(3) saturate(0.3)';
        }
        
        // 1. Api Afterburner Jet Kembar
        let thrustY = 1.0;
        if (keys['KeyW'] || keys['ArrowUp']) thrustY = 1.6;
        else if (keys['KeyS'] || keys['ArrowDown']) thrustY = 0.55;
        
        const flameHeight = (12 + Math.random() * 16) * thrustY;
        
        [-4, 4].forEach(ex => {
            const flameGrad = ctx.createLinearGradient(ex, 18, ex, 18 + flameHeight);
            flameGrad.addColorStop(0, '#00f3ff'); // Biru neon di pangkal
            flameGrad.addColorStop(0.3, '#ffaa00'); // Kuning oranye
            flameGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = flameGrad;
            ctx.beginPath();
            ctx.moveTo(ex - 3.5, 18);
            ctx.lineTo(ex, 18 + flameHeight);
            ctx.lineTo(ex + 3.5, 18);
            ctx.closePath();
            ctx.fill();
        });

        // 2. Sayap Utama (Delta wing stealth - F-22 Raptor)
        let wingGrad = ctx.createLinearGradient(-28, 0, 28, 0);
        wingGrad.addColorStop(0, '#4a545e');
        wingGrad.addColorStop(0.5, '#7b8a99');
        wingGrad.addColorStop(1, '#4a545e');
        ctx.fillStyle = wingGrad;
        
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-28, 5);
        ctx.lineTo(-24, 11);
        ctx.lineTo(-8, 5);
        ctx.lineTo(8, 5);
        ctx.lineTo(24, 11);
        ctx.lineTo(28, 5);
        ctx.closePath();
        ctx.fill();
        
        // Hiasan Specular Glare pada Sayap
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-25, 6);
        ctx.lineTo(25, 6);
        ctx.stroke();

        // 3. Twin Stabilizers (Ekor Kembar)
        ctx.fillStyle = '#39424c';
        ctx.beginPath();
        ctx.moveTo(-5, 12);
        ctx.lineTo(-15, 23);
        ctx.lineTo(-11, 25);
        ctx.lineTo(-2, 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(5, 12);
        ctx.lineTo(14, 23);
        ctx.lineTo(10, 25);
        ctx.lineTo(2, 15);
        ctx.closePath();
        ctx.fill();

        // 4. Badan Utama Jet
        let bodyGrad = ctx.createLinearGradient(-6, 0, 6, 0);
        bodyGrad.addColorStop(0, '#3f4954');
        bodyGrad.addColorStop(0.5, '#687787');
        bodyGrad.addColorStop(1, '#3f4954');
        ctx.fillStyle = bodyGrad;
        
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(5, -17);
        ctx.lineTo(6, 18);
        ctx.lineTo(-6, 18);
        ctx.lineTo(-5, -17);
        ctx.closePath();
        ctx.fill();

        // 5. Specular Canopy / Kaca Kokpit Emas/Biru reflektif
        let copGrad = ctx.createLinearGradient(0, -14, 0, 4);
        copGrad.addColorStop(0, '#00e5ff');
        copGrad.addColorStop(0.4, '#0077ff');
        copGrad.addColorStop(1, '#001133');
        ctx.fillStyle = copGrad;
        ctx.beginPath();
        ctx.ellipse(0, -5, 3.5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Kilauan Kokpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-1, -7, 1.2, 4.5, -0.15, 0, Math.PI * 2);
        ctx.fill();
        
        // 6. Efek Shield jika aktif
        if (this.shield > 0) {
            ctx.strokeStyle = `rgba(0, 243, 255, ${0.3 + (this.shield / 100) * 0.7})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, 36, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    },
    
    takeDamage(dmg) {
        // Abaikan damage jika sedang invincible (i-frames)
        if (this.invincible > 0) return;
        
        if (this.shield > 0) {
            // Shield menyerap kerusakan terlebih dahulu
            this.shield -= dmg * 0.75;
            if (this.shield < 0) {
                this.health += this.shield; // sisa damage kena health
                this.shield = 0;
            }
        } else {
            this.health -= dmg;
        }
        
        // Aktifkan invincibility frames & hit flash
        this.invincible = 1.2;
        this.hitFlashTimer = 0.15;
        
        // Screen shake berarah (dorong ke atas)
        screenShake = 14;
        shakeX = (Math.random() - 0.5) * 8;
        shakeY = 6;
        
        // Hitstop singkat untuk impact
        hitstop = Math.max(hitstop, 0.06);
        
        spawnExplosion(this.x, this.y, '#ff4500', 10, 4);
        
        if (this.health <= 0) {
            this.health = 0;
            playSound('explosion_large');
            spawnExplosion(this.x, this.y, '#ff3300', 40, 8);
            spawnExplosion(this.x, this.y, '#ffd700', 30, 6);
            screenShake = 28;
            hitstop = 0.25;
            gameOver();
        }
    }
};

// 2. PELURU (BULLETS)
class Bullet {
    constructor(x, y, vx, vy, isPlayerOwned, type, damage, splashRadius) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.isPlayerOwned = isPlayerOwned;
        this.type = type || 'normal';
        this.damage = damage || 10;
        this.splashRadius = splashRadius || (this.type === 'plasma' ? 70 : 0);
        this.target = null; // Target pelacakan untuk homing missile
        
        // Tentukan ukuran dan warna berdasarkan tipe
        if (!isPlayerOwned) {
            this.width = 6;
            this.height = 12;
            this.color = '#ff0055'; // Peluru musuh selalu merah berpendar
        } else {
            if (this.type === 'spread') {
                this.width = 5;
                this.height = 14;
                this.color = '#00f3ff'; // Biru cyan
            } else if (this.type === 'laser') {
                this.width = 7;
                this.height = 36; // Laser bolt memanjang
                this.color = '#ff0055'; // Merah neon
            } else if (this.type === 'missile') {
                this.width = 8;
                this.height = 18;
                this.color = '#39ff14'; // Hijau neon
            } else if (this.type === 'plasma') {
                this.width = 16;
                this.height = 16;
                this.color = '#b026ff'; // Ungu neon
            } else {
                this.width = 4;
                this.height = 15;
                this.color = '#00f3ff';
            }
        }
    }
    
    update(dt) {
        // Homing missile logic
        if (this.isPlayerOwned && this.type === 'missile') {
            if (!this.target || this.target.health <= 0 || this.target.y > GAME_HEIGHT) {
                // Cari musuh terdekat di layar
                let nearest = null;
                let minDist = 999999;
                enemies.forEach(e => {
                    if (e.y > -20 && e.y < GAME_HEIGHT) {
                        const dist = Math.hypot(e.x - this.x, e.y - this.y);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = e;
                        }
                    }
                });
                this.target = nearest;
            }
            
            if (this.target) {
                // Arahkan rudal menuju target secara halus
                const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                let currentAngle = Math.atan2(this.vy, this.vx);
                
                let angleDiff = targetAngle - currentAngle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                
                const turnSpeed = 0.12 * dt * 60; // turn rate per frame
                currentAngle += Math.max(-turnSpeed, Math.min(turnSpeed, angleDiff));
                
                const speed = 10; // kecepatan gerak rudal
                this.vx = Math.cos(currentAngle) * speed;
                this.vy = Math.sin(currentAngle) * speed;
            }
            
            // Efek asap ekor rudal
            if (Math.random() < 0.35) {
                particles.push({
                    x: this.x - this.vx * 1.2,
                    y: this.y - this.vy * 1.2,
                    vx: -this.vx * 0.1 + (Math.random() - 0.5) * 0.4,
                    vy: -this.vy * 0.1 + (Math.random() - 0.5) * 0.4,
                    size: Math.random() * 2.5 + 1.5,
                    color: 'rgba(150, 150, 150, 0.4)',
                    alpha: 0.7,
                    decay: 0.035
                });
            }
        }
        
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
    }
    
    draw() {
        ctx.save();
        
        if (this.isPlayerOwned && this.type === 'plasma') {
            // Gambar bola plasma ungu berpendar
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Inti putih
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }
        
        if (this.isPlayerOwned && this.type === 'missile') {
            // Gambar tubuh rudal mini
            ctx.save();
            ctx.translate(this.x, this.y);
            const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
            ctx.rotate(angle);
            
            // Body hijau
            ctx.fillStyle = '#39ff14';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            
            // Moncong merah
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, -this.height / 2);
            ctx.lineTo(0, -this.height / 2 - 5);
            ctx.lineTo(this.width / 2, -this.height / 2);
            ctx.closePath();
            ctx.fill();
            
            // Sirip
            ctx.fillStyle = '#155e0d';
            ctx.fillRect(-this.width / 2 - 2, this.height / 2 - 3, 2, 3);
            ctx.fillRect(this.width / 2, this.height / 2 - 3, 2, 3);
            
            ctx.restore();
            ctx.restore();
            return;
        }

        // Tembakan biasa (Spread, Laser, Normal)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 0.1) {
            const trailLen = Math.min(this.type === 'laser' ? 35 : 20, speed * 1.8);
            const tx = -this.vx / speed * trailLen;
            const ty = -this.vy / speed * trailLen;
            const grad = ctx.createLinearGradient(this.x, this.y, this.x + tx, this.y + ty);
            grad.addColorStop(0, this.color);
            grad.addColorStop(1, 'transparent');
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = grad;
            ctx.fillRect(
                this.x - this.width / 2 + (tx < 0 ? tx : 0),
                this.y - this.height / 2 + (ty < 0 ? ty : 0),
                Math.abs(tx) + this.width,
                Math.abs(ty) + this.height
            );
            ctx.globalAlpha = 1;
        }
        
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.type === 'laser' ? 12 : 8;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        ctx.restore();
    }
    
    isOutOfBounds() {
        return this.y < -20 || this.y > GAME_HEIGHT + 20 || this.x < -20 || this.x > GAME_WIDTH + 20;
    }
}
const bullets = [];

// 3. MUSUH (ENEMIES)
class Enemy {
    constructor(type) {
        this.type = type; // 'small', 'medium', 'boss'
        this.x = Math.random() * (GAME_WIDTH - 60) + 30;
        this.y = -50;
        this.width = 40;
        this.height = 40;
        this.fireCooldown = 1 + Math.random() * 2;
        this.hitFlash = 0; // Timer kedip putih saat kena damage
        this.rollAngle = 0; // Sudut kemiringan 3D
        
        // Mengatur atribut berdasarkan tipe & kesulitan
        const diffMultiplier = difficulty === 'easy' ? 0.75 : (difficulty === 'hard' ? 1.5 : 1);
        
        if (type === 'small') {
            this.width = 36;
            this.height = 36;
            this.health = 10 * diffMultiplier;
            this.maxHealth = this.health;
            this.speed = (2.5 + Math.random() * 2) * (difficulty === 'hard' ? 1.2 : 1);
            this.points = 100;
            // Parameter gerakan meliuk 3D
            this.driftSpeed = 0.4 + Math.random() * 1.0;
            this.driftFreq = 0.02 + Math.random() * 0.02;
            this.driftOffset = Math.random() * Math.PI * 2;
        } else if (type === 'medium') {
            this.width = 56;
            this.height = 56;
            this.health = 35 * diffMultiplier;
            this.maxHealth = this.health;
            this.speed = 1.5 * (difficulty === 'hard' ? 1.2 : 1);
            this.points = 300;
            this.waveFrequency = 0.02 + Math.random() * 0.02;
            this.waveAmplitude = 2 + Math.random() * 3;
            this.centerX = this.x;
            this.angle = Math.random() * Math.PI;
        } else if (type === 'boss') {
            this.x = GAME_WIDTH / 2;
            this.y = -100;
            this.width = 120;
            this.height = 100;
            this.health = 400 * diffMultiplier;
            this.maxHealth = this.health;
            this.speed = 1.0;
            this.points = 2500;
            this.direction = 1; // Bergerak ke samping
            this.fireCooldown = 1.5;
            this.phase = 1;
        }
    }
    
    update(dt) {
        const diffMultiplier = difficulty === 'hard' ? 1.3 : 1;
        
        // Kurangi timer hit flash
        if (this.hitFlash > 0) this.hitFlash -= dt;
        
        if (this.type === 'small') {
            // Terbang berliuk ke bawah
            this.y += this.speed * dt * 60;
            const driftAngle = this.driftOffset + this.y * this.driftFreq;
            this.x += Math.sin(driftAngle) * this.driftSpeed * dt * 60;
            this.rollAngle = Math.cos(driftAngle) * 0.25;
        } else if (this.type === 'medium') {
            // Bergerak sinusoidal/gelombang
            this.y += this.speed * dt * 60;
            this.angle += this.waveFrequency * dt * 60;
            this.x = this.centerX + Math.sin(this.angle) * this.waveAmplitude * 10;
            this.rollAngle = Math.cos(this.angle) * 0.35;
            
            // Efek vapor trail sayap saat membelok
            if (Math.abs(this.rollAngle) > 0.12 && Math.random() < 0.3) {
                vaporTrails.push({ x: this.x - 28, y: this.y, alpha: 0.45, decay: 0.03, size: 1.8 });
                vaporTrails.push({ x: this.x + 28, y: this.y, alpha: 0.45, decay: 0.03, size: 1.8 });
            }
        } else if (this.type === 'boss') {
            // Turun sampai posisi tertentu, lalu bolak-balik horizontal
            if (this.y < 120) {
                this.y += this.speed * dt * 60;
                this.rollAngle = 0;
            } else {
                this.x += this.speed * this.direction * dt * 60 * 1.5;
                if (this.x < 80) {
                    this.x = 80;
                    this.direction = 1;
                } else if (this.x > GAME_WIDTH - 80) {
                    this.x = GAME_WIDTH - 80;
                    this.direction = -1;
                }
                this.rollAngle = this.direction * 0.15;
                
                // Efek vapor trail sayap boss saat berbelok horizontal
                if (Math.random() < 0.2) {
                    vaporTrails.push({ x: this.x - 65, y: this.y, alpha: 0.4, decay: 0.02, size: 2.4 });
                    vaporTrails.push({ x: this.x + 65, y: this.y, alpha: 0.4, decay: 0.02, size: 2.4 });
                }
            }
        }
        
        // Tembakan musuh
        if (this.y > 0 && this.y < GAME_HEIGHT - 100) {
            this.fireCooldown -= dt;
            if (this.fireCooldown <= 0) {
                this.fire();
                // Reset cooldown
                if (this.type === 'small') {
                    this.fireCooldown = 2 + Math.random() * 3;
                } else if (this.type === 'medium') {
                    this.fireCooldown = 1.5 + Math.random() * 2;
                } else if (this.type === 'boss') {
                    this.fireCooldown = 0.8 / diffMultiplier;
                }
            }
        }
    }
    
    fire() {
        if (this.type === 'small') {
            // Tembak 1 peluru lurus ke bawah
            bullets.push(new Bullet(this.x, this.y + 18, 0, 5, false));
        } else if (this.type === 'medium') {
            // Tembak 2 peluru lurus
            bullets.push(new Bullet(this.x - 12, this.y + 20, 0, 6, false));
            bullets.push(new Bullet(this.x + 12, this.y + 20, 0, 6, false));
        } else if (this.type === 'boss') {
            // Tembakan Boss yang menantang
            if (this.health > this.maxHealth * 0.5) {
                // FASE 1: Menyebar 3 peluru
                bullets.push(new Bullet(this.x, this.y + 40, 0, 5, false));
                bullets.push(new Bullet(this.x - 30, this.y + 30, -1.5, 4.5, false));
                bullets.push(new Bullet(this.x + 30, this.y + 30, 1.5, 4.5, false));
            } else {
                // FASE 2: Firing pattern lingkaran spiral lambat
                for (let i = -2; i <= 2; i++) {
                    bullets.push(new Bullet(this.x + i * 15, this.y + 40, i * 1.5, 5, false));
                }
            }
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.rollAngle) {
            ctx.scale(Math.cos(this.rollAngle), 1);
            ctx.rotate(this.rollAngle * 0.25);
        }
        
        // Flash putih saat kena damage
        if (this.hitFlash > 0) {
            ctx.filter = 'brightness(2.5) saturate(0.4)';
        }
        
        if (this.type === 'small') {
            // --- Gambar Stealth Delta Drone ---
            ctx.fillStyle = '#2d3748'; // Abu-abu gelap
            
            // Sayap Delta Tajam
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(-18, 4);
            ctx.lineTo(-12, 8);
            ctx.lineTo(0, 2);
            ctx.lineTo(12, 8);
            ctx.lineTo(18, 4);
            ctx.closePath();
            ctx.fill();
            
            // Sensor mata merah neon (optik drone)
            ctx.fillStyle = '#ff003c';
            ctx.shadowColor = '#ff003c';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(0, -4, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // Reset pendaran

            // Health bar (hanya saat terluka)
            this.drawHealthBar();

        } else if (this.type === 'medium') {
            // --- Gambar Jet Tempur Modern Bermesin Ganda (Su-57 Style) ---
            // Sayap Utama
            let mGrad = ctx.createLinearGradient(-28, 0, 28, 0);
            mGrad.addColorStop(0, '#334155');
            mGrad.addColorStop(0.5, '#475569');
            mGrad.addColorStop(1, '#334155');
            ctx.fillStyle = mGrad;
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(-28, -2);
            ctx.lineTo(-22, 6);
            ctx.lineTo(-8, 2);
            ctx.lineTo(8, 2);
            ctx.lineTo(22, 6);
            ctx.lineTo(28, -2);
            ctx.closePath();
            ctx.fill();

            // Kilauan Specular pada Sayap
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-25, 0);
            ctx.lineTo(25, 0);
            ctx.stroke();

            // Lubang Mesin Jet Kembar di Belakang
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-8, 12, 4, 6);
            ctx.fillRect(4, 12, 4, 6);
            // Efek Api Afterburner Jingga Kecil
            const eHt = 6 + Math.random() * 8;
            ctx.fillStyle = '#ff7b00';
            ctx.fillRect(-7.5, 18, 3, eHt);
            ctx.fillRect(4.5, 18, 3, eHt);

            // Badan Utama Jet
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(0, -22);
            ctx.lineTo(5, -12);
            ctx.lineTo(6, 14);
            ctx.lineTo(-6, 14);
            ctx.lineTo(-5, -12);
            ctx.closePath();
            ctx.fill();
            
            // Kokpit Oranye Reflektif
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.ellipse(0, -6, 3, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Rudal Merah di Ujung Sayap
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-28, -4, 2, 8);
            ctx.fillRect(26, -4, 2, 8);
            
            // Health bar (hanya saat terluka)
            this.drawHealthBar();
            
        } else if (this.type === 'boss') {
            // --- Gambar Sayap Terbang Raksasa Siluman (B-2 Spirit Style) ---
            let bGrad = ctx.createLinearGradient(-60, 0, 60, 0);
            bGrad.addColorStop(0, '#0f172a'); // Hitam karbon
            bGrad.addColorStop(0.5, '#1e293b'); // Abu-abu gelap metalik
            bGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = bGrad;
            
            ctx.beginPath();
            ctx.moveTo(0, -42); // Moncong hidung depan siluman
            ctx.lineTo(-65, -10); // Sayap kiri luar
            ctx.lineTo(-45, 12); // Bagian belakang bergerigi
            ctx.lineTo(-30, 2);
            ctx.lineTo(0, 16); // Bagian ekor tengah
            ctx.lineTo(30, 2);
            ctx.lineTo(45, 12);
            ctx.lineTo(65, -10); // Sayap kanan luar
            ctx.closePath();
            ctx.fill();
            
            // Detail Garis Panel Geometris Merah Neon (High-tech)
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(-40, -5); ctx.lineTo(-15, -20); ctx.lineTo(15, -20); ctx.lineTo(40, -5);
            ctx.moveTo(-25, 0); ctx.lineTo(-10, -10); ctx.lineTo(10, -10); ctx.lineTo(25, 0);
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset
            
            // 4 Buah Pendorong Jet Siluman Tersembunyi di Punggung Pesawat (Mengarah ke Atas/Maju)
            const bFlameHt = 8 + Math.random() * 10;
            [-32, -18, 14, 28].forEach(ex => {
                let fGrad = ctx.createLinearGradient(ex, -22, ex, -22 - bFlameHt);
                fGrad.addColorStop(0, '#ef4444');
                fGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = fGrad;
                ctx.fillRect(ex, -26, 4, bFlameHt);
            });
            
            // Jendela Kokpit Merah Neon Komandan
            ctx.fillStyle = '#d90429';
            ctx.beginPath();
            ctx.ellipse(0, -22, 5, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Menggambar Bar Nyawa Boss di atas badannya sendiri
            ctx.restore(); // Butuh koordinat absolut
            ctx.save();
            const barWidth = 100;
            const barHeight = 6;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - barWidth / 2, this.y - 60, barWidth, barHeight);
            
            const healthRatio = Math.max(0, this.health / this.maxHealth);
            ctx.fillStyle = '#ef233c';
            ctx.fillRect(this.x - barWidth / 2, this.y - 60, barWidth * healthRatio, barHeight);
        }
        
        ctx.restore();
    }
    
    // Health bar muncul di atas musuh saat terluka (koordinat lokal/ter-translasi)
    drawHealthBar() {
        if (this.health >= this.maxHealth) return; // Sembunyi saat full HP
        
        const ratio = Math.max(0, this.health / this.maxHealth);
        const bw = this.width * 0.8;
        const bh = 4;
        const bx = -bw / 2;
        const by = -this.height / 2 - 8;
        
        // Latar belakang gelap
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(bx, by, bw, bh);
        
        // Isi bar dengan warna dinamis (hijau -> kuning -> merah)
        let barColor;
        if (ratio > 0.5) {
            barColor = '#39ff14'; // Hijau
        } else if (ratio > 0.25) {
            barColor = '#ffaa00'; // Jingga/Kuning
        } else {
            barColor = '#ff3333'; // Merah
        }
        ctx.fillStyle = barColor;
        ctx.fillRect(bx, by, bw * ratio, bh);
        
        // Bingkai tipis
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
    }
    
    takeDamage(dmg) {
        this.health -= dmg;
        this.hitFlash = 0.08; // Kedip putih singkat
        
        // Hit spark kecil arah ke atas
        spawnExplosion(this.x, this.y - this.height / 4, '#ffffff', 4, 2);
        
        // Hitstop mini saat boss kena damage
        if (this.type === 'boss') {
            hitstop = Math.max(hitstop, 0.02);
        }
        
        if (this.health <= 0) {
            playSound(this.type === 'boss' ? 'explosion_large' : 'explosion_small');
            
            // Spawn partikel berdasarkan ukuran musuh
            const pCount = this.type === 'boss' ? 80 : (this.type === 'medium' ? 25 : 12);
            const pSize = this.type === 'boss' ? 8 : (this.type === 'medium' ? 4 : 3);
            spawnExplosion(this.x, this.y, '#ff4c00', pCount, pSize);
            spawnExplosion(this.x, this.y, '#ffcc00', pCount * 0.7, pSize - 1);
            
            // Tambah Combo Multiplier & Hyper Charge
            player.comboCount++;
            player.comboTimer = 2.5; // Combo aktif selama 2.5 detik
            
            let hyperGain = 2.5;
            if (this.type === 'medium') hyperGain = 6.0;
            if (this.type === 'boss') hyperGain = 15.0;
            player.hyperCharge = Math.min(100, player.hyperCharge + hyperGain);
            
            const earnedPoints = this.points * player.comboCount;
            
            // Teks skor melayang dengan combo
            const scoreColor = player.comboCount > 1 ? '#ffd700' : '#ffffff';
            const scoreText = player.comboCount > 1 ? `+${earnedPoints} (x${player.comboCount})` : `+${earnedPoints}`;
            spawnFloatingText(this.x, this.y, scoreText, scoreColor);
            
            // Hitstop & screen shake saat kill
            if (this.type === 'boss') {
                hitstop = 0.3;
                screenShake = 24;
            } else if (this.type === 'medium') {
                hitstop = 0.05;
                screenShake = Math.max(screenShake, 8);
            }
            
            // Dapatkan skor
            score += earnedPoints;
            updateHUD();
            
            // Peluang menjatuhkan Power-up
            let dropChance = 0.15; // 15% dari musuh kecil
            if (this.type === 'medium') dropChance = 0.5; // 50% dari bomber sedang
            if (this.type === 'boss') dropChance = 1.0; // 100% dari boss (opsional jika game berlanjut)
            
            if (Math.random() < dropChance) {
                spawnPowerUp(this.x, this.y);
            }
            
            if (this.type === 'boss') {
                victory();
            }
            
            return true; // Hancur
        }
        return false;
    }
}
const enemies = [];

// 4. POWER-UP ITEMS
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'weapon_spread', 'weapon_laser', 'weapon_missile', 'weapon_plasma', 'health', 'shield'
        this.width = 25;
        this.height = 25;
        this.speed = 1.5;
        this.angle = 0;
    }
    
    update(dt) {
        this.y += this.speed * dt * 60;
        this.angle += 0.05 * dt * 60;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        let color = '#fff';
        let symbol = '?';
        
        if (this.type === 'weapon_spread') {
            color = '#00f3ff';
            symbol = 'W';
        } else if (this.type === 'weapon_laser') {
            color = '#ff0055';
            symbol = 'L';
        } else if (this.type === 'weapon_missile') {
            color = '#39ff14';
            symbol = 'M';
        } else if (this.type === 'weapon_plasma') {
            color = '#b026ff';
            symbol = 'P';
        } else if (this.type === 'health') {
            color = '#39ff14';
            symbol = 'H';
        } else if (this.type === 'shield') {
            color = '#ffd700';
            symbol = 'S';
        }
        
        // Kotak Berpendar
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Simbol Teks
        ctx.fillStyle = '#0a0e17';
        ctx.font = 'bold 14px Rajdhani';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, 0, 1);
        
        ctx.restore();
    }
}
const powerUps = [];

function spawnPowerUp(x, y) {
    const rand = Math.random();
    let type = 'health';
    
    if (rand < 0.20) {
        type = 'health';
    } else if (rand < 0.40) {
        type = 'shield';
    } else {
        const wTypes = ['weapon_spread', 'weapon_laser', 'weapon_missile', 'weapon_plasma'];
        type = wTypes[Math.floor(Math.random() * wTypes.length)];
    }
    powerUps.push(new PowerUp(x, y, type));
}


// --- TIMING & SYSTEM SPAWNING ---
let spawnTimer = 0;
let stageTimer = 0;
let bossSpawned = false;

function updateSpawning(dt) {
    stageTimer += dt;
    
    // Alur Level (Stage):
    // Stage 1 (0s - 30s): Musuh kecil saja.
    // Stage 2 (30s - 65s): Mulai muncul musuh medium.
    // Stage 3 (65s+): Muncul Boss.
    
    let currentStage = 1;
    if (stageTimer > 65) {
        currentStage = 3;
    } else if (stageTimer > 30) {
        currentStage = 2;
    }
    
    if (currentStage !== stage) {
        stage = currentStage;
        updateHUD();
    }
    
    // Logika Pemanggilan Boss
    if (stage === 3 && !bossSpawned) {
        bossSpawned = true;
        enemies.push(new Enemy('boss'));
        return;
    }
    
    if (bossSpawned) return; // Jangan spawn musuh biasa jika boss sudah keluar
    
    // Timer Spawn Musuh Biasa
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        // Tentukan jenis musuh yang dispawn
        if (stage === 1) {
            enemies.push(new Enemy('small'));
            spawnTimer = 1.2 + Math.random() * 1.5;
        } else if (stage === 2) {
            if (Math.random() < 0.3) {
                enemies.push(new Enemy('medium'));
            } else {
                enemies.push(new Enemy('small'));
            }
            spawnTimer = 0.9 + Math.random() * 1.2;
        }
    }
}


// --- COLLISION DETECTION ---
function checkCollisions() {
    // 1. Peluru Pemain Menabrak Musuh
    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
        const bullet = bullets[bIdx];
        if (!bullet.isPlayerOwned) continue;
        
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
            const enemy = enemies[eIdx];
            
            if (
                bullet.x + bullet.width / 2 > enemy.x - enemy.width / 2 &&
                bullet.x - bullet.width / 2 < enemy.x + enemy.width / 2 &&
                bullet.y + bullet.height / 2 > enemy.y - enemy.height / 2 &&
                bullet.y - bullet.height / 2 < enemy.y + enemy.height / 2
            ) {
                // Penanganan Laser (Piercing: tembus musuh)
                if (bullet.type === 'laser') {
                    bullet.hitEnemies = bullet.hitEnemies || [];
                    if (bullet.hitEnemies.includes(enemy)) {
                        continue; // Lewati musuh yang sudah terkena peluru laser ini
                    }
                    bullet.hitEnemies.push(enemy);
                    const isDestroyed = enemy.takeDamage(bullet.damage);
                    if (isDestroyed) {
                        enemies.splice(eIdx, 1);
                    }
                    continue; // Peluru laser tidak musnah
                }

                // Penanganan Plasma (AoE Explosion)
                if (bullet.type === 'plasma') {
                    // Berikan damage area ke musuh lain di sekitarnya
                    enemies.forEach(e => {
                        if (e !== enemy) {
                            const dist = Math.hypot(e.x - bullet.x, e.y - bullet.y);
                            if (dist <= bullet.splashRadius) {
                                e.takeDamage(bullet.damage * 0.7); // 70% damage splash
                            }
                        }
                    });
                    // Efek partikel ledakan plasma besar
                    spawnExplosion(bullet.x, bullet.y, '#b026ff', 24, 6);
                }

                // Peluru hancur setelah benturan (non-laser)
                bullets.splice(bIdx, 1);
                
                const isDestroyed = enemy.takeDamage(bullet.damage);
                if (isDestroyed) {
                    enemies.splice(eIdx, 1);
                }
                break;
            }
        }
    }
    
    // 2. Peluru Musuh Menabrak Pemain
    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
        const bullet = bullets[bIdx];
        if (bullet.isPlayerOwned) continue;
        
        if (
            bullet.x + bullet.width / 2 > player.x - player.width / 2 &&
            bullet.x - bullet.width / 2 < player.x + player.width / 2 &&
            bullet.y + bullet.height / 2 > player.y - player.height / 2 &&
            bullet.y - bullet.height / 2 < player.y + player.height / 2
        ) {
            bullets.splice(bIdx, 1);
            player.takeDamage(15);
        }
    }
    
    // 3. Tabrakan Fisik Pemain Menabrak Musuh (Crash)
    for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = enemies[eIdx];
        if (
            player.x + player.width / 3 > enemy.x - enemy.width / 2 &&
            player.x - player.width / 3 < enemy.x + enemy.width / 2 &&
            player.y + player.height / 3 > enemy.y - enemy.height / 2 &&
            player.y - player.height / 3 < enemy.y + enemy.height / 2
        ) {
            player.takeDamage(enemy.type === 'boss' ? 50 : 30);
            
            if (enemy.type !== 'boss') {
                const isDestroyed = enemy.takeDamage(999);
                if (isDestroyed) {
                    enemies.splice(eIdx, 1);
                }
            }
        }
    }
    
    // 4. Pemain Mengambil Power-up
    for (let pIdx = powerUps.length - 1; pIdx >= 0; pIdx--) {
        const p = powerUps[pIdx];
        if (
            player.x + player.width / 2 > p.x - p.width / 2 &&
            player.x - player.width / 2 < p.x + p.width / 2 &&
            player.y + player.height / 2 > p.y - p.height / 2 &&
            player.y - player.height / 2 < p.y + p.height / 2
        ) {
            playSound('powerup');
            
            if (p.type.startsWith('weapon_')) {
                const wType = p.type.replace('weapon_', '');
                if (player.weaponType === wType) {
                    player.weaponLevel = Math.min(3, player.weaponLevel + 1);
                    spawnFloatingText(player.x, player.y - 30, `LV. ${player.weaponLevel} UP!`, '#00f3ff');
                } else {
                    player.weaponType = wType;
                    player.weaponLevel = 1;
                    spawnFloatingText(player.x, player.y - 30, `${wType.toUpperCase()}!`, '#ffaa00');
                }
            } else if (p.type === 'health') {
                player.health = Math.min(player.maxHealth, player.health + 30);
                spawnFloatingText(player.x, player.y - 30, '+30 HP', '#39ff14');
            } else if (p.type === 'shield') {
                player.shield = 100;
                spawnFloatingText(player.x, player.y - 30, 'SHIELD MAX', '#ffd700');
            }
            
            powerUps.splice(pIdx, 1);
            updateHUD();
        }
    }
}


// --- MAIN GAME LOOP ---
let lastTime = 0;

function gameLoop(time) {
    if (gameState !== 'PLAY') return;
    
    const dt = Math.min(0.1, (time - lastTime) / 1000); // Batasi dt agar tidak bug saat lag tab browser
    lastTime = time;
    
    // Hitstop: bekukan logika game sebentar untuk efek impact (freeze-frame)
    const frozen = hitstop > 0;
    if (frozen) hitstop -= dt;
    
    // 1. Logika Update (dilewati saat hitstop aktif)
    if (!frozen) {
        updateBackground(dt);
        player.update(dt);
        
        // Update Peluru
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].update(dt);
            if (bullets[i].isOutOfBounds()) {
                bullets.splice(i, 1);
            }
        }
        
        // Update Musuh
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update(dt);
            // Hapus jika keluar batas bawah layar
            if (enemies[i].y > GAME_HEIGHT + 100) {
                enemies.splice(i, 1);
            }
        }
        
        // Update Powerup
        for (let i = powerUps.length - 1; i >= 0; i--) {
            powerUps[i].update(dt);
            if (powerUps[i].y > GAME_HEIGHT + 50) {
                powerUps.splice(i, 1);
            }
        }
        
        updateSpawning(dt);
        updateParticles(dt);
        updateVaporTrails(dt);
        checkCollisions();
        
        // Update Shockwave
        if (ultimateShockwave) {
            ultimateShockwave.radius += ultimateShockwave.speed * dt * 60;
            if (ultimateShockwave.radius >= ultimateShockwave.maxRadius) {
                ultimateShockwave = null;
            }
        }
        
        // Update screen invert duration
        if (screenInvertFlash > 0) {
            screenInvertFlash -= dt;
        }
    }
    
    // Floating text tetap diupdate agar muncul saat hitstop
    updateFloatingTexts(dt);
    
    // 2. Logika Menggambar (Rendering)
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Terapkan Screen Shake (decay eksponensial + komponen terarah)
    ctx.save();
    if (screenShake > 0.1) {
        // Komponen terarah (dari arah damage) meluruh halus
        const dirDecay = Math.pow(0.82, dt * 60);
        shakeX *= dirDecay;
        shakeY *= dirDecay;
        // Komponen acak berdasarkan magnitudo
        const rx = (Math.random() - 0.5) * screenShake;
        const ry = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX + rx, shakeY + ry);
        screenShake *= Math.pow(0.85, dt * 60);
    } else {
        screenShake = 0;
        shakeX = 0;
        shakeY = 0;
    }
    
    drawBackground();
    drawEntityShadows();
    drawVaporTrails();
    
    // Gambar Peluru & Musuh & Powerup
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    powerUps.forEach(p => p.draw());
    
    player.draw();
    drawParticles();
    
    // Gambar Ultimate Shockwave Ring
    if (ultimateShockwave) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.8)';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(ultimateShockwave.x, ultimateShockwave.y, ultimateShockwave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    
    drawFloatingTexts();
    
    ctx.restore();
    
    // Efek inversi warna layar Mega Bomb
    if (screenInvertFlash > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.globalCompositeOperation = 'difference';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.restore();
    }
    
    // Sinkronisasi Bar UI HUD secara berkala
    document.getElementById('health-bar').style.width = `${(player.health / player.maxHealth) * 100}%`;
    document.getElementById('shield-bar').style.width = `${player.shield}%`;
    document.getElementById('hyper-bar').style.width = `${player.hyperCharge}%`;
    
    const isHyperReady = player.hyperCharge >= 100;
    document.getElementById('hyper-bar').classList.toggle('ready', isHyperReady);
    document.getElementById('hyper-label').classList.toggle('ready', isHyperReady);
    document.getElementById('hyper-label').textContent = isHyperReady ? 'HYPER READY! [SHIFT]' : 'HYPER DRIVE [SHIFT]';
    
    document.getElementById('weapon-val').textContent = `${player.weaponType.toUpperCase()} (LV. ${player.weaponLevel})`;
    
    const comboEl = document.getElementById('combo-container');
    if (player.comboCount > 1) {
        comboEl.classList.remove('hidden');
        document.getElementById('combo-val').textContent = `x${player.comboCount}`;
    } else {
        comboEl.classList.add('hidden');
    }
    
    requestAnimationFrame(gameLoop);
}

// --- HUD & SCREEN MANAGEMENT ---
function updateHUD() {
    document.getElementById('score-val').textContent = String(score).padStart(6, '0');
    
    let textStage = 'STAGE 1';
    if (stage === 2) textStage = 'STAGE 2';
    if (stage === 3) textStage = 'BOSS STAGE';
    document.getElementById('stage-val').textContent = textStage;
}

function startGame() {
    // Membaca pengaturan kesulitan
    const diffRadio = document.querySelector('input[name="difficulty"]:checked');
    difficulty = diffRadio ? diffRadio.value : 'easy';
    
    // Reset Data State
    score = 0;
    stage = 1;
    stageTimer = 0;
    spawnTimer = 0;
    bossSpawned = false;
    screenShake = 0;
    shakeX = 0;
    shakeY = 0;
    hitstop = 0;
    
    player.health = player.maxHealth;
    player.shield = 0;
    player.weaponLevel = 1;
    player.weaponType = 'spread';
    player.hyperCharge = 0;
    player.comboCount = 0;
    player.comboTimer = 0;
    player.rollAngle = 0;
    player.targetRoll = 0;
    screenInvertFlash = 0;
    ultimateShockwave = null;
    player.invincible = 0;
    player.hitFlashTimer = 0;
    player.x = GAME_WIDTH / 2;
    player.y = GAME_HEIGHT - 120;
    
    bullets.length = 0;
    enemies.length = 0;
    powerUps.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;
    
    // Hubungkan HUD
    updateHUD();
    initBackground();
    
    // Ubah UI Tampilan
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    
    gameState = 'PLAY';
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function victory() {
    gameState = 'VICTORY';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('victory-score').textContent = score;
    document.getElementById('victory-screen').classList.remove('hidden');
}

// --- ULTIMATE MEGA BOMB SYSTEM ---
function triggerUltimate() {
    if (player.hyperCharge < 100) return;
    
    player.hyperCharge = 0;
    playSound('ultimate');
    
    // Set status shockwave
    ultimateShockwave = {
        x: player.x,
        y: player.y,
        radius: 10,
        maxRadius: 600,
        speed: 12
    };
    
    // Guncangan layar & hitstop masif
    screenShake = 35;
    hitstop = 0.4;
    screenInvertFlash = 0.25; // Durasi efek inversi warna
    
    // Hapus seluruh peluru musuh
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (!bullets[i].isPlayerOwned) {
            spawnExplosion(bullets[i].x, bullets[i].y, '#ffffff', 4, 2);
            bullets.splice(i, 1);
        }
    }
    
    // Berikan damage besar ke semua musuh aktif
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.y > -20 && e.y < GAME_HEIGHT) {
            const isDestroyed = e.takeDamage(120);
            if (isDestroyed) {
                enemies.splice(i, 1);
            }
        }
    }
    
    spawnFloatingText(player.x, player.y - 45, "MEGA SHOCKWAVE BOMB!", '#ffaa00');
}

// Handler klik pada container Hyper HUD untuk mobile/desktop tap
document.getElementById('hyper-container').addEventListener('click', () => {
    if (gameState === 'PLAY') {
        triggerUltimate();
    }
});

// --- INTERACTIVE EVENTS ---
document.getElementById('btn-play').addEventListener('click', () => {
    initAudio();
    startGame();
});

document.getElementById('btn-restart').addEventListener('click', () => {
    startGame();
});

document.getElementById('btn-victory-restart').addEventListener('click', () => {
    startGame();
});

// Kesulitan selector aktif styling
const diffLabels = document.querySelectorAll('.difficulty-options label');
diffLabels.forEach(label => {
    label.addEventListener('click', () => {
        diffLabels.forEach(l => l.classList.remove('active'));
        label.classList.add('active');
    });
});

// Suara Tombol Mute
const btnAudio = document.getElementById('btn-audio');
btnAudio.addEventListener('click', () => {
    isMuted = !isMuted;
    btnAudio.textContent = isMuted ? '🔇' : '🔊';
    initAudio();
});
