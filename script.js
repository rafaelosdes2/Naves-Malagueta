// Perguntas do 4º/5º Ano (Idade: 10 anos)
const questions = [
    { q: "Quanto é 6 x 4?", correct: 24, options: [20, 24, 28, 30] },
    { q: "Quanto é 35 + 15?", correct: 50, options: [40, 45, 50, 55] },
    { q: "Quanto é 80 - 25?", correct: 55, options: [50, 55, 60, 65] },
    { q: "Metade de 30 é...?", correct: 15, options: [10, 12, 15, 20] },
    { q: "Quanto é 7 x 5?", correct: 35, options: [30, 32, 35, 40] },
    { q: "Quanto é 100 - 45?", correct: 55, options: [45, 50, 55, 60] },
    { q: "O triplo de 9 é...?", correct: 27, options: [18, 24, 27, 36] }
];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('game-container');
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');

let currentQ = 0;
let score = 0;
let lives = 3;
let combo = 1;
let asteroids = [];
let bullets = [];
let particles = [];
let stars = [];
let gameActive = false;
let animationId = null;

// Controles da Nave
const ship = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 40,
    height: 40,
    speed: 7,
    dx: 0
};

// Teclado & Mouse
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && gameActive) {
        e.preventDefault();
        shoot();
    }
});

window.addEventListener('keyup', (e) => keys[e.code] = false);

canvas.addEventListener('mousemove', (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    ship.x = (e.clientX - rect.left) * (canvas.width / rect.width);
});

canvas.addEventListener('click', () => {
    if (gameActive) shoot();
});

btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);

// Criar fundo estrelado
for (let i = 0; i < 60; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2
    });
}

function playAudio(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'shoot') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'hit') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'explode') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        }
    } catch(e) {}
}

// Classe do Meteoro com Física Real
class Asteroid {
    constructor(value, isCorrect, x, y) {
        this.value = value;
        this.isCorrect = isCorrect;
        this.radius = 38;
        this.x = x;
        this.y = y;
        
        // Velocidades com componentes X e Y
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = Math.random() * 0.4 + 0.5;
        
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.03;

        // Vértices irregulares para parecer meteoro de verdade
        this.vertices = [];
        const numPoints = 8;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const dist = this.radius * (0.8 + Math.random() * 0.4);
            this.vertices.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist
            });
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Desenho do corpo Rochoso
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = "#3a4454";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#00f0ff";
        ctx.stroke();

        ctx.restore();

        // Texto do Valor (Fixo para fácil leitura)
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Fredoka, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.value, this.x, this.y);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotSpeed;

        // Colisão com as paredes laterais (Quica)
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -1;
        } else if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -1;
        }
    }
}

// Classe do Projetil (Laser)
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.speed = 12;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ff0080";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ff0080";
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    update() {
        this.y -= this.speed;
    }
}

// Partículas para Explosões
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 4 + 2;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.alpha = 1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.04;
    }
}

// Sistema de Colisão Elastic (Quicar sem sobrepor)
function handleAsteroidCollisions() {
    for (let i = 0; i < asteroids.length; i++) {
        for (let j = i + 1; j < asteroids.length; j++) {
            const a1 = asteroids[i];
            const a2 = asteroids[j];

            const dx = a2.x - a1.x;
            const dy = a2.y - a1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = a1.radius + a2.radius;

            if (dist < minDist) {
                // Afastar para não sobrepor
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                a1.x -= nx * overlap * 0.5;
                a1.y -= ny * overlap * 0.5;
                a2.x += nx * overlap * 0.5;
                a2.y += ny * overlap * 0.5;

                // Trocar e rebater velocidades
                const kx = a1.vx - a2.vx;
                const ky = a1.vy - a2.vy;
                const p = 2 * (nx * kx + ny * ky) / 2;

                a1.vx -= p * nx;
                a1.vy -= p * ny;
                a2.vx += p * nx;
                a2.vy += p * ny;
            }
        }
    }
}

function shoot() {
    bullets.push(new Bullet(ship.x, ship.y - 20));
    playAudio('shoot');
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 25; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);

    // Corpo da Nave
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-18, 18);
    ctx.lineTo(0, 10);
    ctx.lineTo(18, 18);
    ctx.closePath();
    ctx.fillStyle = "#00f0ff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Propulsor / Fogo
    ctx.beginPath();
    ctx.moveTo(-8, 14);
    ctx.lineTo(0, 26 + Math.random() * 6);
    ctx.lineTo(8, 14);
    ctx.fillStyle = "#ff0080";
    ctx.fill();

    ctx.restore();
}

function startGame() {
    if (animationId) cancelAnimationFrame(animationId);

    currentQ = 0;
    score = 0;
    lives = 3;
    combo = 1;
    gameActive = true;
    particles = [];
    bullets = [];

    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');

    updateHUD();
    nextQuestion();
    animate();
}

function nextQuestion() {
    if (currentQ >= questions.length) {
        endGame(true);
        return;
    }

    document.getElementById('question').textContent = questions[currentQ].q;
    asteroids = [];

    const qData = questions[currentQ];
    const opts = [...qData.options];

    // Posicionar meteoros sem sobrepor
    opts.forEach((opt, idx) => {
        let x, y, overlap;
        let attempts = 0;
        
        do {
            overlap = false;
            x = Math.random() * (canvas.width - 160) + 80;
            y = -60 - (idx * 80); // Nascem encadeados acima da tela

            for (let a of asteroids) {
                if (Math.hypot(x - a.x, y - a.y) < 90) {
                    overlap = true;
                    break;
                }
            }
            attempts++;
        } while (overlap && attempts < 100);

        asteroids.push(new Asteroid(opt, opt === qData.correct, x, y));
    });
}

function updateHUD() {
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('combo').textContent = combo;
}

function endGame(win) {
    gameActive = false;
    endScreen.classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('end-title').textContent = win ? "MISSÃO CUMPRIDA! 🏆" : "NAVE DESTRUÍDA! 💥";
}

// Loop Principal
function animate() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mover Estrelas de Fundo
    ctx.fillStyle = "#ffffff";
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Mover Nave via Teclado
    if (keys['ArrowLeft'] || keys['KeyA']) ship.x -= ship.speed;
    if (keys['ArrowRight'] || keys['KeyD']) ship.x += ship.speed;
    ship.x = Math.max(25, Math.min(canvas.width - 25, ship.x));

    drawShip();

    // Atualizar Balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update();
        b.draw();

        if (b.y < -10) {
            bullets.splice(i, 1);
            continue;
        }

        // Colisão Bala x Meteoro
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const a = asteroids[j];
            if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius) {
                createExplosion(a.x, a.y, a.isCorrect ? "#00f0ff" : "#ff0080");
                bullets.splice(i, 1);

                if (a.isCorrect) {
                    playAudio('hit');
                    score += 10 * combo;
                    combo++;
                    currentQ++;
                    updateHUD();
                    nextQuestion();
                } else {
                    playAudio('explode');
                    container.classList.add('shake');
                    setTimeout(() => container.classList.remove('shake'), 200);
                    lives--;
                    combo = 1;
                    updateHUD();
                    asteroids.splice(j, 1);

                    if (lives <= 0) endGame(false);
                }
                break;
            }
        }
    }

    // Resolver colisões física entre os meteoros
    handleAsteroidCollisions();

    // Atualizar e desenhar Meteoros
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        a.update();
        a.draw();

        // Se o meteoro correto passar pela nave
        if (a.y > canvas.height + 40) {
            if (a.isCorrect) {
                lives--;
                combo = 1;
                updateHUD();
                if (lives <= 0) {
                    endGame(false);
                    return;
                } else {
                    currentQ++;
                    nextQuestion();
                    break;
                }
            } else {
                asteroids.splice(i, 1);
            }
        }
    }

    // Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    animationId = requestAnimationFrame(animate);
}
