var templates = require('./templates.json'); // Sprite templates.

var px = 10; // Side length of a single "pixel".
var spriteWidth = px * 5; // Width of a model sprite.
var spriteHeigth = px * 4; // Height of a model sprite.

var padding = px * 2; // Padding from the edge of the canvas.

var timerInterval = 500; // Timer interval for invaders movement.

var player = {}; // Player "sprite" object.
var invaders = []; // Invaders "sprites" objects.
var bullets = []; // Bullet objects.

// Move direction enum.
const direction = {
  LEFT: 'left',
  RIGHT: 'right',
}
var moveDirection = direction.RIGHT; // By default invaders move right at the beginning.

var steps = 0; // How many times invaders have stepped down.

window.addEventListener('keydown', (event) => handleKeyDown(event), false);

window.addEventListener('load', () => {
  initCanvas();
  initInvaders();
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
    template: {
      id: id,
      data: template.data,
    },
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

function updateSpriteTemplate(oldSprite, newTemplateId) {
  let template = templates.find((template) => template.id === newTemplateId);
  if (!template) {
    throw new Error(`No sprite template for '${id}' was found.`);
  }

  return {
    ...oldSprite,
    template: {
      id: newTemplateId,
      data: template.data,
    },
  }
}

function drawSprite(sprite, fillStyle, pxWidth, pxHeight) {
  sprite.template.data.forEach((row) => {
    row.forEach((value) => {
      if (value === 1) {
        context.beginPath();
        context.rect(sprite.x.current, sprite.y.current, pxWidth ? pxWidth : px, pxHeight ? pxHeight : px);
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

function initInvaders() {
  let rows = Math.floor((canvas.height / 3) / (spriteWidth * 1.5));
  let columns = Math.floor((canvas.width) / (spriteHeigth + px * 5));
  for (let row = 0; row < rows; row++) {
    let templateId = 'space_ship_2-1';
    if (row === 0) {
      templateId = 'space_ship_1-1';
    }
    for (let col = 0; col < columns; col++) {
      //  width or length + (margin) * X/Y postition + padding from edge.
      let x = (spriteWidth + px * 2) * col + padding;
      let y = (spriteHeigth + px * 2) * row + padding / 2;
      let sprite = createSprite(templateId, x, y);
      invaders.push(sprite);
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
    updateInvaders();
  }, timerInterval);
}

function initPlayerTimer() {
  setInterval(() => {
    updateBullets();
    updatePlayer();
  }, 10);
}

function updateMoveDirection() {
  let isDirectionChanging = false;
  invaders.forEach((sprite) => {
    if (sprite.x.start >= (canvas.width - spriteWidth - padding)) {
      isDirectionChanging = true;
      moveDirection = direction.LEFT;
    } else if (sprite.x.start <= (0 + padding)) {
      isDirectionChanging = true;
      moveDirection = direction.RIGHT;
    }
  });

  if (isDirectionChanging) {
    invadersStepDown();
  }
}

function invadersStepDown() {
  steps += 1;
  invaders.forEach((sprite) => {
    sprite.y.start += px;
    sprite.y.current = sprite.y.start;
  });
}

function updateInvaders() {
  invaders.forEach((sprite) => {
    // rectangle to clear each sprite's previous frame individually.
    context.clearRect(sprite.x.start, sprite.y.start - px, spriteWidth, spriteHeigth + px);
    // context.rect(sprite.x.start, sprite.y.start - px, spriteWidth, spriteHeigth + px);
    // context.strokeStyle = '#777777';
    // context.stroke();

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
      shoot();
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

function shoot() {
  let bullet = createSprite('bullet', player.x.start + (spriteWidth / 2 - 2), player.y.start - spriteHeigth / 2);
  bullet.velocity.y = -1;
  bullets.push(bullet);
  drawSprite(bullet, '#77ff00', px / 2);
}

function updateBullets() {
  if (!bullets.length) {
    return;
  }

  bullets.forEach((bullet) => {
    context.clearRect(bullet.x.start, bullet.y.start, px / 2, px * 3);
    bullet.y.start -= 5;
    drawSprite(bullet, '#77ff00', px / 2);
  });
}