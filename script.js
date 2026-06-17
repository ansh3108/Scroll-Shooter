const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

let keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

let isClicking = false;
window.addEventListener('mousedown', () => isClicking = true);
window.addEventListener('mouseup', () => isClicking = false);

let shipX = width / 2;
window.addEventListener('mousemove', e => shipX = e.clientX);

let lastScroll = 25000;
window.scrollTo(0, 25000);

let shipY = height - 100;
let vy = 0;
let score = 0;
let lives = 3;
let wave = 1;
let frame = 0;
let shake = 0;
let bossActive = false;

let bullets = [];
let enemies = [];
let particles = [];

const stars = Array.from({length: 150}, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    s: Math.random() * 2 + 1,
    speed: Math.random() * 0.8 + 0.2
}));

function spawnEnemy() {
    if (Math.random() < 0.6 && !bossActive) {
        enemies.push({
            type: 'fighter',
            x: Math.random() * (width - 60) + 30,
            y: -50,
            hp: 1 + Math.floor(wave / 3),
            t: Math.random() * 100
        });
    } else if (!bossActive) {
        enemies.push({
            type: 'asteroid',
            x: Math.random() > 0.5 ? -30 : width + 30,
            y: Math.random() * (height / 2),
            hp: 3,
            vx: Math.random() > 0.5 ? 2 : -2,
            vy: 1 + Math.random(),
            rot: 0,
            rs: (Math.random() - 0.5) * 0.1
        });
    }
}

function spawnBoss() {
    bossActive = true;
    enemies.push({
        type: 'boss',
        x: width / 2,
        y: -100,
        hp: 40 + (wave * 5),
        t: 0
    });
}

function explode(x, y, color, count) {
    for(let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 1,
            color: color
        });
    }
}

function loop() {
    requestAnimationFrame(loop);
    
    let currentScroll = window.scrollY;
    let delta = currentScroll - lastScroll;
    lastScroll = currentScroll;

    if (currentScroll < 2000 || currentScroll > 48000) {
        window.scrollTo(0, 25000);
        lastScroll = 25000;
        delta = 0;
    }
    
    if (Math.abs(delta) > 0) {
        document.getElementById('intro').style.opacity = 0;
    }

    vy -= delta * 0.18;
    vy += 1.2; 
    vy *= 0.88; 
    
    shipY += vy;
    if (shipY > height - 60) { shipY = height - 60; vy = 0; }
    if (shipY < 60) { shipY = 60; vy = 0; }

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    if (shake > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        shake *= 0.85;
        if (shake < 0.5) shake = 0;
    }

    ctx.fillStyle = '#fff';
    stars.forEach(s => {
        s.y += s.speed + (vy * -0.05);
        if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
        if (s.y < 0) { s.y = height; s.x = Math.random() * width; }
        ctx.globalAlpha = s.speed;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    let fireRate = keys['Space'] || isClicking ? 5 : 20;
    if (frame % fireRate === 0) {
        bullets.push({ x: shipX, y: shipY - 20, vy: -18, type: 'player' });
    }

    let spawnRate = Math.max(20, 90 - wave * 5);
    if (frame % spawnRate === 0 && !bossActive) spawnEnemy();

    let expectedWave = Math.floor(score / 500) + 1;
    if (expectedWave > wave) {
        wave = expectedWave;
        document.getElementById('wave').innerText = wave;
        if (wave % 5 === 0) spawnBoss();
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.y += b.vy;
        
        if (b.type === 'player') {
            ctx.fillStyle = '#0ff';
            ctx.fillRect(b.x - 2, b.y - 10, 4, 20);
        } else {
            ctx.fillStyle = '#f00';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (b.y < -50 || b.y > height + 50) bullets.splice(i, 1);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        let eRadius = 20;

        if (e.type === 'fighter') {
            e.y += 3 + wave * 0.3;
            e.x += Math.sin(e.t * 0.05) * 4; 
            e.t++;
            ctx.fillStyle = '#f0f';
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + 15);
            ctx.lineTo(e.x - 15, e.y - 15);
            ctx.lineTo(e.x + 15, e.y - 15);
            ctx.fill();
        } else if (e.type === 'asteroid') {
            e.x += e.vx;
            e.y += e.vy + wave * 0.2;
            e.rot += e.rs;
            eRadius = 25;
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(e.rot);
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-15, -20);
            ctx.lineTo(10, -25);
            ctx.lineTo(25, 0);
            ctx.lineTo(15, 20);
            ctx.lineTo(-20, 15);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        } else if (e.type === 'boss') {
            eRadius = 50;
            if (e.y < 120) e.y += 1.5;
            e.x = width / 2 + Math.sin(e.t * 0.02) * (width / 3);
            e.t++;
            
            if (frame % Math.max(15, 40 - wave) === 0) {
                bullets.push({ x: e.x - 40, y: e.y + 40, vy: 7, type: 'enemy' });
                bullets.push({ x: e.x + 40, y: e.y + 40, vy: 7, type: 'enemy' });
            }
            
            ctx.fillStyle = '#f00';
            ctx.fillRect(e.x - 60, e.y - 30, 120, 60);
        }

        if (Math.hypot(shipX - e.x, shipY - e.y) < eRadius + 10) {
            shake = 25;
            explode(shipX, shipY, '#0ff', 30);
            enemies.splice(i, 1);
            if (e.type === 'boss') bossActive = false;
            
            lives--;
            document.getElementById('lives').innerText = lives;
            if (lives <= 0) {
                setTimeout(() => { alert('Game Over! Score: ' + score); location.reload(); }, 100);
            }
            continue;
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (b.type === 'player' && Math.hypot(b.x - e.x, b.y - e.y) < eRadius) {
                e.hp--;
                bullets.splice(j, 1);
                explode(b.x, b.y, '#ff0', 5); 
                
                if (e.hp <= 0) {
                    explode(e.x, e.y, e.type === 'asteroid' ? '#aaa' : (e.type === 'boss' ? '#f00' : '#f0f'), e.type === 'boss' ? 50 : 15);
                    score += e.type === 'boss' ? 500 : (e.type === 'asteroid' ? 10 : 20);
                    document.getElementById('score').innerText = score;
                    
                    enemies.splice(i, 1);
                    if (e.type === 'boss') bossActive = false;
                    shake = e.type === 'boss' ? 30 : 5;
                }
                break;
            } else if (b.type === 'enemy' && Math.hypot(b.x - shipX, b.y - shipY) < 15) {

                shake = 25;
                bullets.splice(j, 1);
                lives--;
                document.getElementById('lives').innerText = lives;
                explode(shipX, shipY, '#0ff', 30);
                if (lives <= 0) {
                    setTimeout(() => { alert('Game Over! Score: ' + score); location.reload(); }, 100);
                }
            }
        }

        if (e.y > height + 100 || e.x < -100 || e.x > width + 100) enemies.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04; 
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
        if (p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.moveTo(shipX, shipY - 20);
    ctx.lineTo(shipX - 15, shipY + 15);
    ctx.lineTo(shipX, shipY + 10);
    ctx.lineTo(shipX + 15, shipY + 15);
    ctx.fill();

    if (shake > 0) ctx.restore();

    frame++;
}

loop();


