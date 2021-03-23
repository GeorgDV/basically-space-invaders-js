var templates = require('./templates.json'); // Sprite templates.

var pxLength = 10; // Side length of a single "pixel".
var spriteWidth = pxLength * 5; // Width of a sprite.
var spriteHeigth = pxLength * 4; // Height of a sprite.

var padding = pxLength * 2; // Padding from the edge of the canvas.

var timerInterval = 500; // Timer interval for movement.
var moveDirection = 'R';

var player = {}; // Player "sprite" object.
var enemies = []; // Enemies "sprites" objects.

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
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
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
        context.rect(sprite.x.current, sprite.y.current, pxLength, pxLength);
        context.fillStyle = fillStyle ? fillStyle : '#ffffff';
        context.fill();
        context.closePath();
      }
      sprite.x.current += pxLength;
    });
    sprite.x.current = sprite.x.start;
    sprite.y.current += pxLength;
  });
  sprite.y.current = sprite.y.start;
}

function initEnemies() {
  let rows = Math.floor((canvas.height / 3) / (spriteWidth));
  let columns = Math.floor((canvas.width) / (spriteHeigth + pxLength * 5));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      //  width or length  +  (margin)     * X/Y postition + padding from edge
      let x = (spriteWidth + pxLength * 2) * col + padding;
      let y = (spriteHeigth + pxLength * 2) * row + padding;
      let sprite = createSprite('space_ship_1', x, y);
      drawSprite(sprite);
      enemies.push(sprite);
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
    context.clearRect(0,0, canvas.width, canvas.height - (spriteHeigth * 2));
    enemies.forEach((sprite) => {
      switch (moveDirection) {
        case 'R':
          if (sprite.x.current < (canvas.width - spriteWidth - padding)) {
            sprite.x.current += pxLength;
            sprite.x.start = sprite.x.current;
          } else  {
            //sprite.y.start += pxLength;
            moveDirection = 'L';
          }
          drawSprite(sprite);
          break;
        case 'L':
          if ((sprite.x.current) > (0 + padding)) {
            sprite.x.current -= pxLength;
            sprite.x.start = sprite.x.current;
          } else {
            //sprite.y.start += pxLength;
            moveDirection = 'R';
          }
          drawSprite(sprite);
          break;
      }
    })
  }, timerInterval);
}

function initPlayerTimer() {
  setInterval(() => {
    context.clearRect(0, canvas.height - (spriteHeigth * 2), canvas.width, canvas.height);
    drawSprite(player);
  }, 10);
}

function handleKeyDown(event) {
  switch(event.keyCode) {
    case 37: 
      player.x.start -= pxLength;
      player.x.current -= pxLength;
      break;
    case 39:
      player.x.start += pxLength;
      player.x.current += pxLength;
      break;
    case 32:
      console.log('shoot');
      break;
  }
}