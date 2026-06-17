const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

let keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'ArrowUp') {
        e.preventDefault(); 
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

let isClicking = false;
window.addEventListener('mousedown', () => isClicking = true);
window.addEventListener('mouseup', () => isClicking = false);
window.addEventListener('touchstart', () => isClicking = true, {passive: true});
window.addEventListener('touchend', () => isClicking = false, {passive: true});

let shipX = width / 2;
window.addEventListener('mousemove', e => shipX = e.clientX);
window.addEventListener('touchmove', e => shipX = e.touches[0].clientX, {passive: true});

let actx;
function sfx(type) {
    if (!actx) return;
    let osc = actx.createOscillator();
    let gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);
    let now = actx.currentTime;
    
    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

let lastScroll = 25000;
let shipY = height - 100;
let vy = 0;
let score = 0;
let hiScore = localStorage.getItem('scrollShooterHS') || 0;
document.getElementById('hiScore').innerText = hiScore;

let lives = 3;
let wave = 1;
let frame = 0;
let shake = 0;
let bossActive = false;
let spreadTimer = 0;
let playing = false;

let bullets = [];
let enemies = [];
let particles = [];
let powerups = [];
let floatingTexts = [];

const stars = Array.from({length: 200}, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    s: Math.random() * 2.5 + 0.5,
    speed: Math.random() * 1.5 + 0.1,
    hue: Math.floor(Math.random() * 60) + 180 
}));

function spawnEnemy() {
    let r = Math.random();
    if (r < 0.5 && !bossActive) {
        enemies.push({
            type: 'fighter',
            x: Math.random() * (width - 60) + 30,
            y: -50,
            hp: 1 + Math.floor(wave / 3),
            t: Math.random() * 100,
            flash: 0
        });
    } else if (r < 0.75 && !bossActive && wave > 2) {
        enemies.push({
            type: 'seeker',
            x: Math.random() * width,
            y: -50,
            hp: 2 + Math.floor(wave / 4),
            t: 0,
            flash: 0
        });
    } else if (!bossActive) {
        let pts = [];
        let verts = 7 + Math.floor(Math.random() * 6);
        for(let i = 0; i < verts; i++) {
            let a = (i / verts) * Math.PI * 2;
            let r = 15 + Math.random() * 18;
            pts.push({x: Math.cos(a) * r, y: Math.sin(a) * r});
        }
        
        enemies.push({
            type: 'asteroid',
            x: Math.random() > 0.5 ? -40 : width + 40,
            y: Math.random() * (height / 2),
            hp: 3,
            vx: Math.random() > 0.5 ? 2 : -2,
            vy: 1 + Math.random(),
            rot: 0,
            rs: (Math.random() - 0.5) * 0.1,
            flash: 0,
            pts: pts,
            bg: `hsl(0, 0%, ${15 + Math.random() * 15}%)`
        });
    }
}

function spawnBoss() {
    bossActive = true;
    let max = 40 + (wave * 5);
    enemies.push({
        type: 'boss',
        x: width / 2,
        y: -100,
        hp: max,
        maxHp: max,
        t: 0,
        phase: 1,
        flash: 0
    });
}

function explode(x, y, color, count) {
    sfx('hit');
    for(let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 16,
            vy: (Math.random() - 0.5) * 16,
            life: 1,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function popText(x, y, text, color = '#fff') {
    floatingTexts.push({ x, y, text, color, life: 1, vy: -1 });
}

function handleGameOver() {
    playing = false;
    if (score > hiScore) {
        localStorage.setItem('scrollShooterHS', score);
    }
    setTimeout(() => { 
        alert('GAME OVER\nScore: ' + score); 
        location.reload(); 
    }, 100);
}

function loop() {
    if (!playing) return;
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

    stars.forEach(s => {
        s.y += s.speed + (vy * -0.05);
        if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
        if (s.y < 0) { s.y = height; s.x = Math.random() * width; }
        ctx.fillStyle = `hsla(${s.hue}, 100%, 80%, ${s.speed / 1.5})`;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });

    if (vy < -2 || spreadTimer > 0) {
        particles.push({
            x: shipX + (Math.random() - 0.5) * 12,
            y: shipY + 15,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 6 + 5,
            life: 0.8,
            color: spreadTimer > 0 ? '#0f0' : (Math.random() > 0.5 ? '#0ff' : '#08f'),
            size: Math.random() * 5 + 2
        });
    }

    if (spreadTimer > 0) spreadTimer--;

    let fireRate = keys['Space'] || isClicking ? 5 : 20;
    if (frame % fireRate === 0) {
        sfx('shoot');
        bullets.push({ x: shipX, y: shipY - 20, vx: 0, vy: -22, type: 'player' });
        if (spreadTimer > 0) {
            bullets.push({ x: shipX, y: shipY - 20, vx: -5, vy: -20, type: 'player' });
            bullets.push({ x: shipX, y: shipY - 20, vx: 5, vy: -20, type: 'player' });
        }
    }

    let spawnRate = Math.max(20, 90 - wave * 5);
    if (frame % spawnRate === 0 && !bossActive) spawnEnemy();

    if (frame > 0 && frame % 600 === 0) {
        powerups.push({ x: Math.random() * (width - 40) + 20, y: -20, vy: 2 });
    }

    let expectedWave = Math.floor(score / 500) + 1;
    if (expectedWave > wave) {
        wave = expectedWave;
        document.getElementById('wave').innerText = wave;
        popText(width/2, height/2, `WAVE ${wave}`, '#0ff');
        if (wave % 5 === 0) spawnBoss();
    }

    for (let i = powerups.length - 1; i >= 0; i--) {
        let p = powerups[i];
        p.y += p.vy;
        ctx.fillStyle = '#0f0';
        ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
        ctx.fillStyle = '#000';
        ctx.font = '16px monospace';
        ctx.fillText('S', p.x - 5, p.y + 5);

        if (Math.hypot(shipX - p.x, shipY - p.y) < 30) {
            sfx('powerup');
            spreadTimer = 400;
            popText(p.x, p.y, 'SPREAD UPG', '#0f0');
            powerups.splice(i, 1);
            continue;
        }
        if (p.y > height + 50) powerups.splice(i, 1);
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx || 0;
        b.y += b.vy;
        
        if (b.type === 'player') {
            ctx.fillStyle = spreadTimer > 0 ? '#0f0' : '#0ff';
            ctx.fillRect(b.x - 2, b.y - 12, 4, 24);
        } else {
            ctx.fillStyle = '#f00';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (b.y < -50 || b.y > height + 50 || b.x < -50 || b.x > width + 50) bullets.splice(i, 1);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        let eRadius = 20;
        if (e.flash > 0) e.flash--;

        if (e.type === 'fighter') {
            e.y += 3 + wave * 0.3;
            e.x += Math.sin(e.t * 0.05) * 4;
            e.t++;
            ctx.fillStyle = e.flash > 0 ? '#fff' : '#f0f';
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + 15);
            ctx.lineTo(e.x - 15, e.y - 15);
            ctx.lineTo(e.x + 15, e.y - 15);
            ctx.fill();
        } else if (e.type === 'seeker') {
            eRadius = 15;
            e.y += 2 + wave * 0.2;
            e.x += (shipX - e.x) * 0.02; 
            e.t += 0.1;
            ctx.fillStyle = e.flash > 0 ? '#fff' : '#f80';
            ctx.beginPath();
            ctx.arc(e.x, e.y, eRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(e.x, e.y, eRadius * Math.abs(Math.sin(e.t)), 0, Math.PI * 2);
            ctx.fill();
        } else if (e.type === 'asteroid') {
            e.x += e.vx;
            e.y += e.vy + wave * 0.2;
            e.rot += e.rs;
            eRadius = 25;
            
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(e.rot);
            
            ctx.fillStyle = e.flash > 0 ? '#fff' : e.bg;
            ctx.strokeStyle = e.flash > 0 ? '#fff' : '#aaa';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(e.pts[0].x, e.pts[0].y);
            for(let p = 1; p < e.pts.length; p++) {
                ctx.lineTo(e.pts[p].x, e.pts[p].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            
        } else if (e.type === 'boss') {
            eRadius = 50;
            
            if (e.phase === 1 && e.hp < e.maxHp / 2) {
                e.phase = 2;
                explode(e.x, e.y, '#f80', 50);
                popText(e.x, e.y, "CRITICAL!", '#f00');
                shake = 15;
            }

            if (e.y < 120) e.y += 1.5;
            
            if (e.phase === 1) {
                e.x = width / 2 + Math.sin(e.t * 0.02) * (width / 3);
                if (frame % Math.max(15, 40 - wave) === 0) {
                    bullets.push({ x: e.x - 40, y: e.y + 40, vx: 0, vy: 7, type: 'enemy' });
                    bullets.push({ x: e.x + 40, y: e.y + 40, vx: 0, vy: 7, type: 'enemy' });
                }
            } else {
                e.x = width / 2 + Math.sin(e.t * 0.04) * (width / 2.5);
                e.y = 120 + Math.sin(e.t * 0.08) * 30;
                if (frame % 12 === 0) {
                    bullets.push({ x: e.x, y: e.y + 40, vx: 0, vy: 9, type: 'enemy' });
                    bullets.push({ x: e.x, y: e.y + 40, vx: -3, vy: 8, type: 'enemy' });
                    bullets.push({ x: e.x, y: e.y + 40, vx: 3, vy: 8, type: 'enemy' });
                }
            }
            e.t++;
            
            ctx.fillStyle = e.flash > 0 ? '#fff' : (e.phase === 2 ? '#f80' : '#f00');
            ctx.fillRect(e.x - 60, e.y - 30, 120, 60);
        }

        if (Math.hypot(shipX - e.x, shipY - e.y) < eRadius + 10) {
            shake = 30;
            explode(shipX, shipY, '#0ff', 40);
            enemies.splice(i, 1);
            if (e.type === 'boss') bossActive = false;
            lives--;
            document.getElementById('lives').innerText = lives;
            if (lives <= 0) handleGameOver();
            continue;
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (b.type === 'player' && Math.hypot(b.x - e.x, b.y - e.y) < eRadius) {
                e.hp--;
                e.flash = 3;
                bullets.splice(j, 1);
                explode(b.x, b.y, '#ff0', 3);
                
                if (e.hp <= 0) {
                    let eColor = '#f0f';
                    if (e.type === 'asteroid') eColor = '#aaa';
                    if (e.type === 'boss') eColor = '#f00';
                    if (e.type === 'seeker') eColor = '#f80';
                    
                    explode(e.x, e.y, eColor, e.type === 'boss' ? 80 : 20);
                    
                    let pts = 20;
                    if (e.type === 'boss') pts = 500;
                    if (e.type === 'asteroid') pts = 10;
                    if (e.type === 'seeker') pts = 30;
                    
                    score += pts;
                    document.getElementById('score').innerText = score;
                    if (score > hiScore) document.getElementById('hiScore').innerText = score;
                    
                    popText(e.x, e.y, '+' + pts, '#ff0');
                    
                    enemies.splice(i, 1);
                    if (e.type === 'boss') bossActive = false;
                    shake = e.type === 'boss' ? 40 : 5;
                }
                break;
            } else if (b.type === 'enemy' && Math.hypot(b.x - shipX, b.y - shipY) < 15) {
                shake = 30;
                bullets.splice(j, 1);
                lives--;
                document.getElementById('lives').innerText = lives;
                explode(shipX, shipY, '#0ff', 40);
                if (lives <= 0) handleGameOver();
            }
        }

        if (e.y > height + 100 || e.x < -100 || e.x > width + 100) enemies.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95; 
        p.vy *= 0.95; 
        p.life -= 0.03;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        let s = p.size * p.life;
        ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
        if (p.life <= 0) particles.splice(i, 1);
    }
    
    ctx.globalAlpha = 1;
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life -= 0.02;
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = spreadTimer > 0 ? '#0f0' : '#0ff';
    ctx.beginPath();
    ctx.moveTo(shipX, shipY - 25);
    ctx.lineTo(shipX + 20, shipY + 15);
    ctx.lineTo(shipX + 8, shipY + 10);
    ctx.lineTo(shipX - 8, shipY + 10);
    ctx.lineTo(shipX - 20, shipY + 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(shipX, shipY - 12);
    ctx.lineTo(shipX + 4, shipY + 2);
    ctx.lineTo(shipX - 4, shipY + 2);
    ctx.closePath();
    ctx.fill();

    if (shake > 0) ctx.restore();

    frame++;
}

document.getElementById('startBtn').addEventListener('click', () => {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    document.getElementById('menu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    document.getElementById('intro').style.opacity = 1;
    window.scrollTo(0, 25000);
    playing = true;
    loop();
});
