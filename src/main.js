var templates = require('./templates.json');

var pxLength = 10;

window.addEventListener('load', (event) => {
  initCanvas();

  let robot1 = createSprite('space_ship_1', 200, 200);
  drawSprite(robot1, '#ffffff');
});

function initCanvas() {
  canvas = document.querySelector('#canvas');
  context = canvas.getContext("2d");
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
  }
}

function drawSprite(sprite, fillStyle) {
  sprite.data.forEach((row) => {
    row.forEach((value) => {
      if (value === 1) {
        context.beginPath();
        context.rect(sprite.x.current, sprite.y.current, pxLength, pxLength);
        context.fillStyle = fillStyle;
        context.fill();
        context.closePath();
      }
      sprite.x.current += pxLength;
    });
    sprite.x.current = sprite.x.start;
    sprite.y.current += pxLength;
  });
}