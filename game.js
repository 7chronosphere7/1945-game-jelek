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
    if (e.code === 'Space') e.preventDefault(); // Cegah scrolling browser
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

    // 2. Gambar Pulau
    islands.forEach(island => {
        ctx.fillStyle = island.color;
        ctx.beginPath();
        // Menggambar bentuk pulau yang tidak teratur menggunakan busur
        ctx.arc(island.x, island.y, island.size, 0, Math.PI * 2);
        ctx.fill();

        // Garis pantai pasir tipis
        ctx.strokeStyle = '#e2c992';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(island.x, island.y, island.size + 1, 0, Math.PI * 2);
        ctx.stroke();
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


// --- PARTICLE SYSTEM ---
const particles = [];

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
        } else if (isMouseActive) {
            // Ikuti mouse secara halus (lerp)
            this.x += (mouseX - this.x) * 0.25;
            this.y += (mouseY - this.y) * 0.25;
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
    },
    
    fire() {
        playSound('laser');
        if (this.weaponLevel === 1) {
            // 1 peluru lurus dari tengah moncong
            bullets.push(new Bullet(this.x, this.y - 25, 0, -10, true));
        } else if (this.weaponLevel === 2) {
            // 2 peluru dari kiri & kanan sayap
            bullets.push(new Bullet(this.x - 18, this.y - 10, 0, -10, true));
            bullets.push(new Bullet(this.x + 18, this.y - 10, 0, -10, true));
        } else {
            // 3 peluru: 1 lurus, 2 miring ke samping
            bullets.push(new Bullet(this.x, this.y - 25, 0, -10, true));
            bullets.push(new Bullet(this.x - 18, this.y - 10, -2, -10, true));
            bullets.push(new Bullet(this.x + 18, this.y - 10, 2, -10, true));
        }
    },
    
    draw() {
        // Berkedip saat invincible (lewati gambar setiap frame ganjil)
        if (this.invincible > 0 && Math.floor(this.invincible * 20) % 2 === 0) {
            return;
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flash putih singkat saat baru kena damage
        const isFlashing = this.hitFlashTimer > 0;
        if (isFlashing) {
            ctx.filter = 'brightness(3) saturate(0.3)';
        }
        
        // Efek Engine Thruster (api pendorong)
        const flameHeight = 10 + Math.random() * 15;
        const grad = ctx.createLinearGradient(0, 20, 0, 20 + flameHeight);
        grad.addColorStop(0, '#ffd700');
        grad.addColorStop(0.5, '#ff4500');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-6, 20);
        ctx.lineTo(0, 20 + flameHeight);
        ctx.lineTo(6, 20);
        ctx.closePath();
        ctx.fill();

        // 1. Sayap Utama (Warna Logam Pesawat Tempur)
        ctx.fillStyle = '#a6b0c3';
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(25, 0);
        ctx.lineTo(20, 8);
        ctx.lineTo(-20, 8);
        ctx.closePath();
        ctx.fill();
        
        // Garis merah hiasan sayap
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-23, 1, 6, 2);
        ctx.fillRect(17, 1, 6, 2);

        // 2. Badan Utama
        ctx.fillStyle = '#7e8a9f';
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(8, -12);
        ctx.lineTo(8, 20);
        ctx.lineTo(-8, 20);
        ctx.lineTo(-8, -12);
        ctx.closePath();
        ctx.fill();

        // 3. Ekor/Sayap Belakang
        ctx.fillStyle = '#68758b';
        ctx.beginPath();
        ctx.moveTo(-10, 16);
        ctx.lineTo(10, 16);
        ctx.lineTo(8, 22);
        ctx.lineTo(-8, 22);
        ctx.closePath();
        ctx.fill();

        // 4. Kaca Kokpit (Biru Glass)
        ctx.fillStyle = '#00f3ff';
        ctx.beginPath();
        ctx.ellipse(0, -5, 4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Kilauan Kokpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-1, -7, 1.5, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 5. Baling-Baling (Propeller)
        ctx.save();
        ctx.translate(0, -25);
        ctx.rotate(this.propellerAngle);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();
        
        // Pemutar Baling-Baling Tengah
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
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
    constructor(x, y, vx, vy, isPlayerOwned) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.isPlayerOwned = isPlayerOwned;
        this.width = isPlayerOwned ? 4 : 6;
        this.height = isPlayerOwned ? 15 : 12;
        this.color = isPlayerOwned ? '#00f3ff' : '#ff0055';
    }
    
    update(dt) {
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
    }
    
    draw() {
        ctx.save();
        
        // Trail/jejak peluru memanjang ke arah belakang gerakan
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 0.1) {
            const trailLen = Math.min(20, speed * 1.8);
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
        // Berikan efek bayangan menyala
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
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
        
        // Mengatur atribut berdasarkan tipe & kesulitan
        const diffMultiplier = difficulty === 'easy' ? 0.75 : (difficulty === 'hard' ? 1.5 : 1);
        
        if (type === 'small') {
            this.width = 36;
            this.height = 36;
            this.health = 10 * diffMultiplier;
            this.maxHealth = this.health;
            this.speed = (2.5 + Math.random() * 2) * (difficulty === 'hard' ? 1.2 : 1);
            this.points = 100;
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
            // Terbang lurus ke bawah
            this.y += this.speed * dt * 60;
        } else if (this.type === 'medium') {
            // Bergerak sinusoidal/gelombang
            this.y += this.speed * dt * 60;
            this.angle += this.waveFrequency * dt * 60;
            this.x = this.centerX + Math.sin(this.angle) * this.waveAmplitude * 10;
        } else if (this.type === 'boss') {
            // Turun sampai posisi tertentu, lalu bolak-balik horizontal
            if (this.y < 120) {
                this.y += this.speed * dt * 60;
            } else {
                this.x += this.speed * this.direction * dt * 60 * 1.5;
                if (this.x < 80) {
                    this.x = 80;
                    this.direction = 1;
                } else if (this.x > GAME_WIDTH - 80) {
                    this.x = GAME_WIDTH - 80;
                    this.direction = -1;
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
        
        // Flash putih saat kena damage
        if (this.hitFlash > 0) {
            ctx.filter = 'brightness(2.5) saturate(0.4)';
        }
        
        if (this.type === 'small') {
            // --- Gambar Pesawat Tempur Kecil (Warna Hijau Militer/Abu Gelap) ---
            ctx.fillStyle = '#4c6444';
            
            // Sayap
            ctx.beginPath();
            ctx.moveTo(-18, -4);
            ctx.lineTo(18, -4);
            ctx.lineTo(15, 2);
            ctx.lineTo(-15, 2);
            ctx.closePath();
            ctx.fill();

            // Badan
            ctx.fillStyle = '#394d33';
            ctx.beginPath();
            ctx.moveTo(0, 18);
            ctx.lineTo(6, -10);
            ctx.lineTo(-6, -10);
            ctx.closePath();
            ctx.fill();
            
            // Kokpit
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(0, -2, 3, 0, Math.PI * 2);
            ctx.fill();

            // Health bar (hanya saat terluka)
            this.drawHealthBar();

        } else if (this.type === 'medium') {
            // --- Gambar Bomber Sedang (Warna Abu Baja dengan Aksen Jingga) ---
            ctx.fillStyle = '#5c6b73';
            
            // Sayap Lebar
            ctx.beginPath();
            ctx.moveTo(-28, -8);
            ctx.lineTo(28, -8);
            ctx.lineTo(24, 0);
            ctx.lineTo(-24, 0);
            ctx.closePath();
            ctx.fill();
            
            // Mesin Kiri & Kanan di Sayap
            ctx.fillStyle = '#ff7b00';
            ctx.fillRect(-16, -12, 6, 12);
            ctx.fillRect(10, -12, 6, 12);

            // Badan
            ctx.fillStyle = '#3d4a50';
            ctx.beginPath();
            ctx.moveTo(0, 24);
            ctx.lineTo(10, -18);
            ctx.lineTo(-10, -18);
            ctx.closePath();
            ctx.fill();
            
            // Kokpit Oranye
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.ellipse(0, -6, 4, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Health bar (hanya saat terluka)
            this.drawHealthBar();
            
        } else if (this.type === 'boss') {
            // --- Gambar Pembom Raksasa (Boss Pesawat) ---
            ctx.fillStyle = '#2b2d42';
            
            // Sayap Raksasa
            ctx.beginPath();
            ctx.moveTo(-60, -15);
            ctx.lineTo(60, -15);
            ctx.lineTo(50, 5);
            ctx.lineTo(-50, 5);
            ctx.closePath();
            ctx.fill();
            
            // 4 Buah Mesin Propeller Musuh
            ctx.fillStyle = '#8d99ae';
            ctx.fillRect(-45, -25, 8, 20);
            ctx.fillRect(-20, -25, 8, 20);
            ctx.fillRect(12, -25, 8, 20);
            ctx.fillRect(37, -25, 8, 20);

            // Badan Boss
            ctx.fillStyle = '#1d1e2c';
            ctx.beginPath();
            ctx.moveTo(0, 50);
            ctx.lineTo(25, -40);
            ctx.lineTo(-25, -40);
            ctx.closePath();
            ctx.fill();
            
            // Aksen Sayap Merah Menyala
            ctx.fillStyle = '#ef233c';
            ctx.fillRect(-55, -8, 12, 4);
            ctx.fillRect(43, -8, 12, 4);
            
            // Jendela Kokpit Merah Komandan
            ctx.fillStyle = '#d90429';
            ctx.beginPath();
            ctx.arc(0, -15, 10, Math.PI, 0);
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
            
            // Teks skor melayang
            spawnFloatingText(this.x, this.y, `+${this.points}`,
                this.type === 'boss' ? '#ffd700' : '#ffffff');
            
            // Hitstop & screen shake saat kill
            if (this.type === 'boss') {
                hitstop = 0.3;
                screenShake = 24;
            } else if (this.type === 'medium') {
                hitstop = 0.05;
                screenShake = Math.max(screenShake, 8);
            }
            
            // Dapatkan skor
            score += this.points;
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
        this.type = type; // 'weapon', 'health', 'shield'
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
        
        if (this.type === 'weapon') {
            color = '#00f3ff';
            symbol = 'W';
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
    let type = 'weapon';
    if (rand < 0.35) {
        type = 'health';
    } else if (rand < 0.70) {
        type = 'shield';
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
                // Tabrakan terjadi!
                bullets.splice(bIdx, 1);
                const isDestroyed = enemy.takeDamage(10); // Tiap peluru memberikan damage 10
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
                // Musuh biasa hancur langsung
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
            
            if (p.type === 'weapon') {
                player.weaponLevel = Math.min(3, player.weaponLevel + 1);
            } else if (p.type === 'health') {
                player.health = Math.min(player.maxHealth, player.health + 30);
            } else if (p.type === 'shield') {
                player.shield = 100;
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
        checkCollisions();
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
    
    // Gambar Peluru & Musuh & Powerup
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    powerUps.forEach(p => p.draw());
    
    player.draw();
    drawParticles();
    drawFloatingTexts();
    
    ctx.restore();
    
    // Sinkronisasi Bar UI HUD secara berkala
    document.getElementById('health-bar').style.width = `${(player.health / player.maxHealth) * 100}%`;
    document.getElementById('shield-bar').style.width = `${player.shield}%`;
    
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
