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
let frame = 0;

let bullets = [];
let asteroids = [];

const stars = Array.from({length: 150}, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    s: Math.random() * 2 + 1,
    speed: Math.random() * 0.8 + 0.2
}));

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

    ctx.fillStyle = '#fff';
    stars.forEach(s => {
        s.y += s.speed + (vy * -0.05);
        if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
        if (s.y < 0) { s.y = height; s.x = Math.random() * width; }
        ctx.globalAlpha = s.speed;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    let fireRate = keys['Space'] || isClicking ? 5 : 30;
    if (frame % fireRate === 0) {
        bullets.push({ x: shipX, y: shipY - 20, vy: -18 });
    }

    if (frame % 45 === 0) {
        asteroids.push({
            x: Math.random() * width,
            y: -50,
            vy: 2 + Math.random() * 3,
            radius: 15 + Math.random() * 20
        });
    }

    ctx.fillStyle = '#0ff';
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.y += b.vy;
        ctx.fillRect(b.x - 2, b.y - 10, 4, 20);
        if (b.y < -50) bullets.splice(i, 1);
    }

    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    for (let i = asteroids.length - 1; i >= 0; i--) {
        let a = asteroids[i];
        a.y += a.vy;

        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.stroke();

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius) {
                asteroids.splice(i, 1);
                bullets.splice(j, 1);
                break;
            }
        }

        if (a.y > height + 100) asteroids.splice(i, 1);
    }

    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.moveTo(shipX, shipY - 20);
    ctx.lineTo(shipX - 15, shipY + 15);
    ctx.lineTo(shipX, shipY + 10);
    ctx.lineTo(shipX + 15, shipY + 15);
    ctx.fill();

    frame++;
}
loop();
