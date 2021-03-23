var templates = require('./templates.json'); // Sprite templates.

var px = 10; // Side length of a single "pixel".
var spriteWidth = px * 5; // Width of a sprite.
var spriteHeigth = px * 4; // Height of a sprite.

var padding = px * 2; // Padding from the edge of the canvas.

var timerInterval = 500; // Timer interval for movement.

var player = {}; // Player "sprite" object.
var enemies = []; // Enemies "sprites" objects.
var enemyMaxX = 100; // Enemy highest X coordinate.
var enemyMinX = 100; // Enemy lowest X coordinate.

const direction = {
  LEFT: 'left',
  RIGHT: 'right',
}
var moveDirection = direction.RIGHT;

window.addEventListener('keydown', (event) => handleKeyDown(event), false);

window.addEventListener('load', () => {
  initCanvas();
  initEnemies();
  initPlayer();

  initEnemiesTimer();
  initPlayerTimer();
});

function initCanvas() {
  canvas = document.querySelector('#canvas');
  context = canvas.getContext('2d');
  //canvas.width = window.innerWidth;
  canvas.width = 600;
  canvas.height = window.innerHeight - 2;
}

function createSprite(id, startX, startY,) {
  let template = templates.find((template) => template.id === id);
  if (!template) {
    throw new Error(`No sprite template for '${id}' was found.`);
  }

  return {
    data: template.data,
    x: {
      start: startX,
      current: startX,
    },
    y: {
      start: startY,
      current: startY,
    },
    velocity: {
      x: 0,
      y: 0,
    },
  }
}

function drawSprite(sprite, fillStyle) {
  sprite.data.forEach((row) => {
    row.forEach((value) => {
      if (value === 1) {
        context.beginPath();
        context.rect(sprite.x.current, sprite.y.current, px, px);
        context.fillStyle = fillStyle ? fillStyle : '#ffffff';
        context.fill();
        context.closePath();
      }
      sprite.x.current += px;
    });
    sprite.x.current = sprite.x.start;
    sprite.y.current += px;
  });
  sprite.y.current = sprite.y.start;
}

function initEnemies() {
  let rows = Math.floor((canvas.height / 3) / (spriteWidth));
  let columns = Math.floor((canvas.width) / (spriteHeigth + px * 5));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      //  width or length  +  (margin)     * X/Y postition + padding from edge
      let x = (spriteWidth + px * 2) * col + padding;
      let y = (spriteHeigth + px * 2) * row + padding;
      let sprite = createSprite('space_ship_1', x, y);
      enemies.push(sprite);
      drawSprite(sprite);
    }
  }
}

function initPlayer() {
  let y = canvas.height - (spriteHeigth + padding);
  let x = padding;
  player = createSprite('player', x, y);
  drawSprite(player);
}

function initEnemiesTimer() {
  setInterval(() => {
    updateMoveDirection();
    updateEnemies();
  }, timerInterval);
}

function initPlayerTimer() {
  setInterval(() => updatePlayer(), 10);
}

function updateMoveDirection() {
  enemies.forEach((sprite) => {
    if (sprite.x.start >= (canvas.width - spriteWidth - padding)) {
      moveDirection = direction.LEFT;
    } else if (sprite.x.start <= (0 + padding)) {
      moveDirection = direction.RIGHT;
    }
  });
}

function updateEnemies() {
  enemies.forEach((sprite) => {
    // rectangle to clear each sprite's previous frame individually.
    context.clearRect(sprite.x.start, sprite.y.start, spriteWidth, spriteHeigth);

    switch (moveDirection) {
      case direction.RIGHT:
        if (sprite.x.start < (canvas.width - spriteWidth - padding)) {
          sprite.x.start += px;
          sprite.x.current = sprite.x.start;
        } 
        break;
      case direction.LEFT:
        if (sprite.x.start > (0 + padding)) {
          sprite.x.start -= px;
          sprite.x.current = sprite.x.start;
        }
        break;
    }
    drawSprite(sprite);
  });
}

function updatePlayer() {
  movePlayer()
  context.clearRect(player.x.start - px, player.y.start, spriteWidth + (px * 2), spriteHeigth);
  drawSprite(player, '#246434');
}

function handleKeyDown(event) {
  switch(event.keyCode) {
    case 37: 
      player.velocity.x = -1;
      break;
    case 39:
      player.velocity.x = 1;
      break;
    case 32:
      console.log('shoot');
      break;
  }
}

function movePlayer() {
  if (player.velocity.x < 0) {
    if (player.x.start < (0 + padding)) {
      return;
    }
    player.x.start -= px / 5;
    player.x.current -= px / 5;
  } else if (player.velocity.x > 0) {
    if (player.x.start > (canvas.width - spriteWidth - padding)) {
      return;
    }
    player.x.start += px / 5;
    player.x.current += px / 5;
  }
}