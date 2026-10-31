const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const livesEl = document.getElementById('lives');
const itemsEl = document.getElementById('items');
const statusEl = document.getElementById('status');

const world = {
  width: canvas.width,
  height: canvas.height,
};

const keys = {};
const pointer = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  active: false,
};
canvas.tabIndex = 0;
canvas.focus();
canvas.addEventListener('click', () => canvas.focus());
canvas.addEventListener('touchstart', () => canvas.focus(), { passive: true });
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  pointer.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  pointer.active = true;
});
canvas.addEventListener('mouseleave', () => {
  pointer.active = false;
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;
  canvas.focus();

  if (event.code === 'Space') {
    event.preventDefault();
    attack();
  }

  if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
  }
});
window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});
window.addEventListener('blur', () => {
  Object.keys(keys).forEach((key) => {
    keys[key] = false;
  });
});

const walls = [
  { x: 110, y: 70, w: 40, h: 180 },
  { x: 220, y: 180, w: 220, h: 40 },
  { x: 420, y: 60, w: 40, h: 180 },
  { x: 530, y: 120, w: 200, h: 40 },
  { x: 600, y: 260, w: 40, h: 180 },
  { x: 280, y: 310, w: 240, h: 40 },
  { x: 180, y: 420, w: 210, h: 40 },
  { x: 560, y: 430, w: 180, h: 40 },
  { x: 60, y: 300, w: 80, h: 40 },
  { x: 730, y: 120, w: 80, h: 40 },
  { x: 730, y: 360, w: 80, h: 40 },
];

const items = [
  { x: 160, y: 110, r: 10, collected: false, kind: 'energy' },
  { x: 340, y: 480, r: 10, collected: false, kind: 'energy' },
  { x: 820, y: 270, r: 10, collected: false, kind: 'energy' },
  { x: 120, y: 500, r: 10, collected: false, kind: 'energy' },
  { x: 760, y: 80, r: 10, collected: false, kind: 'energy' },
  { x: 90, y: 190, r: 10, collected: false, kind: 'heart' },
];

const exit = {
  x: 845,
  y: 30,
  w: 28,
  h: 54,
  unlocked: false,
};

const player = {
  x: 50,
  y: 55,
  radius: 14,
  speed: 170,
  lives: 5,
  invuln: 0,
  attackCooldown: 0,
  facingX: 1,
  facingY: 0,
};

const enemies = [
  { x: 215, y: 70, r: 18, color: '#ff5f6d', speed: 98 },
  { x: 770, y: 220, r: 18, color: '#ff9f1c', speed: 110 },
  { x: 340, y: 510, r: 18, color: '#a66cff', speed: 104 },
  { x: 730, y: 480, r: 18, color: '#f72585', speed: 118 },
  { x: 510, y: 70, r: 18, color: '#7ae582', speed: 120 },
  { x: 90, y: 390, r: 18, color: '#ffd166', speed: 122 },
  { x: 620, y: 300, r: 18, color: '#f72585', speed: 128 },
];

let gameState = 'running';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rectCircleCollision(rect, cx, cy, radius) {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function updateHud() {
  livesEl.textContent = String(player.lives);
  const count = items.filter((item) => item.collected).length;
  itemsEl.textContent = `${count}/${items.length}`;

  if (gameState === 'won') {
    statusEl.textContent = 'Geborgen';
  } else if (gameState === 'lost') {
    statusEl.textContent = 'Gefangen';
  } else if (exit.unlocked) {
    statusEl.textContent = 'Tor offen';
  } else {
    statusEl.textContent = 'Laufe';
  }
}

function moveWithCollision(entity, dx, dy) {
  entity.x += dx;
  for (const wall of walls) {
    if (rectCircleCollision(wall, entity.x, entity.y, entity.radius)) {
      if (dx > 0) entity.x = wall.x - entity.radius;
      if (dx < 0) entity.x = wall.x + wall.w + entity.radius;
    }
  }

  entity.y += dy;
  for (const wall of walls) {
    if (rectCircleCollision(wall, entity.x, entity.y, entity.radius)) {
      if (dy > 0) entity.y = wall.y - entity.radius;
      if (dy < 0) entity.y = wall.y + wall.h + entity.radius;
    }
  }

  entity.x = clamp(entity.x, player.radius, world.width - player.radius);
  entity.y = clamp(entity.y, player.radius, world.height - player.radius);
}

function collectItems() {
  for (const item of items) {
    if (!item.collected) {
      const dist = Math.hypot(player.x - item.x, player.y - item.y);
      if (dist < player.radius + item.r + 2) {
        item.collected = true;

        if (item.kind === 'heart') {
          player.lives = Math.min(player.lives + 1, 8);
        }
      }
    }
  }

  exit.unlocked = items.filter((item) => item.kind === 'energy').every((item) => item.collected);
}

function hitPlayer() {
  if (player.invuln > 0 || gameState !== 'running') return;

  player.lives -= 1;
  player.invuln = 0.9;

  if (player.lives <= 0) {
    gameState = 'lost';
    updateHud();
    return;
  }

  player.x = 50;
  player.y = 55;
}

function attack() {
  if (gameState !== 'running' || player.attackCooldown > 0) return;

  player.attackCooldown = 0.45;

  const attackRange = 48;
  const remaining = [];
  let hitEnemy = false;

  for (const enemy of enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;
    const dirX = dx / distance;
    const dirY = dy / distance;
    const dot = dirX * player.facingX + dirY * player.facingY;

    if (distance < attackRange && dot > -0.2) {
      hitEnemy = true;
      continue;
    }

    remaining.push(enemy);
  }

  enemies.length = 0;
  enemies.push(...remaining);

  if (hitEnemy) {
    statusEl.textContent = 'Angriff!';
    setTimeout(() => {
      if (gameState === 'running') {
        statusEl.textContent = exit.unlocked ? 'Tor offen' : 'Laufe';
      }
    }, 180);
  }
}

function updatePlayer(dt) {
  let moveX = 0;
  let moveY = 0;

  if (keys['w'] || keys['arrowup']) moveY -= 1;
  if (keys['s'] || keys['arrowdown']) moveY += 1;
  if (keys['a'] || keys['arrowleft']) moveX -= 1;
  if (keys['d'] || keys['arrowright']) moveX += 1;

  const keyLength = Math.hypot(moveX, moveY);
  if (keyLength > 0) {
    player.facingX = moveX / keyLength;
    player.facingY = moveY / keyLength;
  } else if (pointer.active) {
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const pointerLength = Math.hypot(dx, dy);
    if (pointerLength > 4) {
      player.facingX = dx / pointerLength;
      player.facingY = dy / pointerLength;
      moveX = dx / pointerLength;
      moveY = dy / pointerLength;
    }
  }

  const movementLength = Math.hypot(moveX, moveY) || 1;
  moveX = (moveX / movementLength) * player.speed * dt;
  moveY = (moveY / movementLength) * player.speed * dt;

  moveWithCollision(player, moveX, moveY);
  collectItems();

  if (player.invuln > 0) player.invuln -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;

  if (exit.unlocked && player.x > exit.x - player.radius && player.x < exit.x + exit.w + player.radius && player.y > exit.y - player.radius && player.y < exit.y + exit.h + player.radius) {
    gameState = 'won';
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;

    const step = (enemy.speed + (items.filter((item) => item.collected).length * 16)) * dt;
    const moveX = (dx / distance) * step;
    const moveY = (dy / distance) * step;

    const nextX = enemy.x + moveX;
    const nextY = enemy.y + moveY;

    let canMoveX = true;
    let canMoveY = true;

    for (const wall of walls) {
      if (rectCircleCollision(wall, nextX, enemy.y, enemy.r)) canMoveX = false;
      if (rectCircleCollision(wall, enemy.x, nextY, enemy.r)) canMoveY = false;
    }

    if (canMoveX) enemy.x = nextX;
    if (canMoveY) enemy.y = nextY;

    const touchDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (touchDist < player.radius + enemy.r) {
      hitPlayer();
    }
  }
}

function drawBackground() {
  ctx.fillStyle = '#091722';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.strokeStyle = 'rgba(30,200,255,0.2)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= world.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y <= world.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
}

function drawWalls() {
  ctx.fillStyle = '#1b3347';
  for (const wall of walls) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = '#6fe7ff';
    ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
  }
}

function drawPlayer() {
  const angle = Math.atan2(player.facingY, player.facingX);

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(angle);

  if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.lineTo(8, 8);
  ctx.lineTo(0, -18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2d2d2d';
  ctx.beginPath();
  ctx.arc(0, -18, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#101010';
  ctx.fillRect(-4, -18, 8, 18);

  ctx.fillStyle = '#111111';
  ctx.fillRect(-5, -5, 10, 18);

  ctx.strokeStyle = '#f3f9ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, 0);
  ctx.stroke();

  ctx.strokeStyle = '#c8d1d9';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(10, -8);
  ctx.lineTo(28, -2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(28, -2);
  ctx.lineTo(36, -16);
  ctx.stroke();

  ctx.fillStyle = '#d9d9d9';
  ctx.beginPath();
  ctx.moveTo(30, -2);
  ctx.lineTo(38, -10);
  ctx.lineTo(44, -4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(enemy.x - 5, enemy.y - 5, enemy.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawItems() {
  for (const item of items) {
    if (item.collected) continue;

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fff4b3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(item.x - 6, item.y);
    ctx.lineTo(item.x + 6, item.y);
    ctx.moveTo(item.x, item.y - 6);
    ctx.lineTo(item.x, item.y + 6);
    ctx.stroke();
  }
}

function drawExit() {
  const doorColor = exit.unlocked ? '#4ade80' : '#ff5f6d';
  ctx.fillStyle = doorColor;
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);

  ctx.fillStyle = exit.unlocked ? '#b7ffd0' : '#ffd6dc';
  ctx.fillRect(exit.x + 10, exit.y + 10, exit.w - 20, exit.h - 20);
}

function drawGameOverOverlay() {
  if (gameState === 'running') return;

  ctx.fillStyle = 'rgba(3, 10, 16, 0.7)';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = '#f6fbff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 48px Arial';
  const text = gameState === 'won' ? 'Du bist entkommen!' : 'Gefangen!';
  ctx.fillText(text, world.width / 2, world.height / 2 - 25);

  ctx.font = '22px Arial';
  ctx.fillText('Drücke F5 zum Neustarten', world.width / 2, world.height / 2 + 30);
}

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;

  if (gameState === 'running') {
    updatePlayer(dt);
    updateEnemies(dt);
  }

  drawBackground();
  drawWalls();
  drawExit();
  drawItems();
  drawEnemies();
  drawPlayer();
  updateHud();
  drawGameOverOverlay();

  requestAnimationFrame(gameLoop);
}

updateHud();
requestAnimationFrame(gameLoop);
