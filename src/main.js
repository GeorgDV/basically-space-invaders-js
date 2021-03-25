import 'regenerator-runtime/runtime';

// Canvas variables.
let ctx;
let canvas;

// Sound generation things.
import * as Tone from 'tone';
import StartAudioContext from 'startaudiocontext';
let crusher = new Tone.BitCrusher(8).toDestination();
let synthWithCrusher = new Tone.Synth().connect(crusher).toDestination();
let synth = new Tone.Synth().toDestination();


// Templates from creating sprites.
const templates = require('./templates.json');

let player = {}; // Player "sprite" object.
let invaders = []; // Invaders "sprites" objects.
let bullets = []; // Bullet "sprite" objects.

// Game variables.
let isGameStarted = false;
let ID = -1; // Id increment for ingame objects.

const px = 5; // Size a single "pixel".
const spriteWidth = px * 9; // Width of a default model sprite. (pixel * 9)
const spriteHeigth = px * 7; // Height of a default  model sprite. (pixel * 7)

const padding = 20; // Space from the edge of the canvas.

// Timer objects.
let timers = {
  enemyTimer: {
    value: null,
    interval: 620,
  },
  playerTimer: {
    value: null,
    interval: 20,
  },
  bulletTimer: {
    value: null,
    interval: 15,
  },
}

// Move direction enum.
const direction = {
  LEFT: 'left',
  RIGHT: 'right',
}
let invadersMoveDirection = direction.RIGHT; // By default invaders move right at the beginning.
let invadersStep = px * 2;

let isShootKeyPressed = false;
window.addEventListener('keydown', (event) => handleKeyDown(event), false);
window.addEventListener('click', () => {
  if (!isGameStarted) {
    StartAudioContext(Tone.getContext());
    initGame();
    isGameStarted = true;
  }
});

function initGame() {
  ctx.clearRect(0,0, canvas.width, canvas.height);

  initInvaders();
  initPlayer();

  initEnemiesTimer();
  initPlayerTimer();
  initBulletsTimer();
}

window.onload = () => {
  initCanvas();
  initAudio();
  
  // Welcome text.
  ctx.font = "40px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("Click To Start", canvas.width/2, canvas.height/2);
};

function initCanvas() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext('2d');
  //canvas.width = window.innerWidth;
  canvas.width = 900;
  canvas.height = window.innerHeight - 2;
}

function initAudio() {
  let audioContext = new Tone.Context();
  Tone.setContext(audioContext);
}

function createSprite(id, startX, startY,) {
  let template = templates.find((template) => template.id === id);
  if (!template) {
    throw new Error(`No sprite template for '${id}' was found.`);
  }

  return {
    id: ID++,
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
        ctx.beginPath();
        ctx.rect(sprite.x.current, sprite.y.current, pxWidth ? pxWidth : px, pxHeight ? pxHeight : px);
        ctx.fillStyle = fillStyle ? fillStyle : '#ffffff';
        ctx.fill();
        ctx.closePath();
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
  let columns = Math.floor((canvas.width) / (spriteHeigth  * 3));
  for (let row = 0; row < rows; row++) {
    let id = 'invader_2-1';
    if (row === 0) {
      id = 'invader_1-1';
    }

    for (let col = 0; col < columns; col++) {
      //  width or length + (margin) * X/Y postition + padding from edge.
      let x = (spriteWidth + px * 2) * col + padding;
      let y = (spriteHeigth + px * 2) * row + padding / 2;
      let sprite = createSprite(id, x, y);
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
  timers.enemyTimer.value = setInterval(() => {
    updateMoveDirection();
    updateInvaders();
  }, timers.enemyTimer.interval);
}

function initPlayerTimer() {
  timers.playerTimer.value = setInterval(() => {
    updatePlayer();
  }, timers.playerTimer.interval);
}

function initBulletsTimer() {
  timers.bulletTimer.value = setInterval(() => {
    if (!bullets.length) {
      return;
    } else {
      detectBulletAndInvaderCollision();
      updateBullets();
    }
  }, timers.bulletTimer.interval);
}

function updateMoveDirection() {
  let isDirectionChanging = false;
  invaders.forEach((sprite) => {
    if (sprite.x.start >= (canvas.width - spriteWidth - padding)) {
      isDirectionChanging = true;
      invadersMoveDirection = direction.LEFT;
    } else if (sprite.x.start <= (0 + padding)) {
      isDirectionChanging = true;
      invadersMoveDirection = direction.RIGHT;
    }
  });

  if (isDirectionChanging) {
    invadersStepDown();
  }
}

function invadersStepDown() {
  invaders.forEach((sprite) => {
    sprite.y.start += invadersStep;
    sprite.y.current = sprite.y.start;
  });
  //playStepSound(); // Should use?
}

function updateInvaders() {
  invaders.forEach((invader) => {
    // Draw a rectangle to clear each sprite's previous frame individually.
    ctx.clearRect(invader.x.start, invader.y.start - invadersStep, spriteWidth, spriteHeigth + invadersStep);

    switch (invadersMoveDirection) {
      case direction.RIGHT:
        if (invader.x.start < (canvas.width - spriteWidth - padding)) {
          invader.x.start += px;
          invader.x.current = invader.x.start;
        } 
        break;
      case direction.LEFT:
        if (invader.x.start > (0 + padding)) {
          invader.x.start -= px;
          invader.x.current = invader.x.start;
        }
        break;
    }
    
    // Demo attempt at animating invaders movement.
    // let index;
    // switch (invader.template.id) {
    //   case 'invader_1-1':
    //     invader = updateSpriteTemplate(invader, 'invader_1-2');
    //     index = invaders.map((item) => item.id).indexOf(invader.id);
    //     invaders[index] = invader;
    //     break;
    //   case 'invader_1-2':
    //     invader = updateSpriteTemplate(invader, 'invader_1-1');
    //     index = invaders.map((item) => item.id).indexOf(invader.id);
    //     invaders[index] = invader;
    //     break;
    //   case 'invader_2-1':
    //     invader = updateSpriteTemplate(invader, 'invader_2-2');
    //     index = invaders.map((item) => item.id).indexOf(invader.id);
    //     invaders[index] = invader;
    //     break;
    //   case 'invader_2-2':
    //     invader = updateSpriteTemplate(invader, 'invader_2-1');
    //     index = invaders.map((item) => item.id).indexOf(invader.id);
    //     invaders[index] = invader;
    //     break;
    // }
    drawSprite(invader);
  });
}

function updatePlayer() {
  movePlayer()
  ctx.clearRect(player.x.start - px, player.y.start, spriteWidth + px * 2, spriteHeigth);
  drawSprite(player, '#246434');
}

function handleKeyDown(event) {
  switch(event.keyCode) {
    case 37: //LEFT arrow. 
      player.velocity.x = -1;
      break;
    case 39: //RIGHT arrow.
      player.velocity.x = 1;
      break;
    case 32: //SPACEBAR.
      if (isShootKeyPressed) {
        return;
      }
      isShootKeyPressed = true;
      shoot();
      setTimeout(() => isShootKeyPressed = false, 300);
      break;
  }
}

function movePlayer() {
  if (player.velocity.x < 0) {
    if (player.x.start < (0 + padding)) {
      return;
    }
    player.x.start -= 3;
    player.x.current -= 3;
  } else if (player.velocity.x > 0) {
    if (player.x.start > (canvas.width - spriteWidth - padding)) {
      return;
    }
    player.x.start += 3;
    player.x.current += 3;
  }
}

function shoot() {
  let bullet = createSprite('bullet', player.x.start + (spriteWidth / 2 - 2), player.y.start - spriteHeigth / 2);
  bullet.velocity.y = -1;
  bullets.push(bullet);
  drawSprite(bullet, '#77ff00', px / 2);
  playLaserSound();
}

function updateBullets() {
  if (!bullets.length) {
    return;
  }

  bullets.forEach((bullet) => {
    bullet.y.start -= 10;
    ctx.clearRect(bullet.x.start, bullet.y.start, px / 2, px * 6);

    // Bullet hits wall.
    if (bullet.y.start < 0) {
      bullet = updateSpriteTemplate(bullet, 'bullet_hit_wall');
      bullet.x.start -= px * 5 / 2; // Move new sprite to middle of bullet hit.
      bullet.x.current = bullet.x.start;
      drawSprite(bullet, '#ff1100', px - 2, px - 2);
      bullets = bullets.filter((item) => item.id !== bullet.id);
      setTimeout(() => ctx.clearRect(bullet.x.start, bullet.y.start + px * 2, px * 5, px * 2), 150);
    } else {
      drawSprite(bullet, '#77ff00', px - 3);
    }
  });
}

function detectBulletAndInvaderCollision() {
  if (!bullets.length || !invaders.length) {
    return;
  }

  invaders.forEach((invader) => {
    bullets.forEach((bullet) => {
      let bulletX = bullet.x.start;
      let bulletY = bullet.y.start;

      let invaderTopY = invader.y.start;
      let invaderLeftX = invader.x.start;
      let invaderBottomY = invader.y.start + spriteHeigth;
      let invaderRightX = invader.x.start + spriteWidth;

      // Detect collision. 
      if (bulletX <= invaderRightX &&
        bulletX >= invaderLeftX - (px / 2) &&
        bulletY <= invaderBottomY &&
        bulletY >= invaderTopY) {

        // Remove bullet.
        ctx.clearRect(bullet.x.start, bullet.y.start, px / 2, px * 4);
        bullets = bullets.filter((item) => item.id !== bullet.id);

        // Remove invader and play explosion.
        ctx.clearRect(invader.x.start, invader.y.start - px, spriteWidth, spriteHeigth + px);
        invader = updateSpriteTemplate(invader, 'explosion');
        drawSprite(invader, '#ffffff', px -1, px - 1);
        invaders = invaders.filter((item) => item.id !== invader.id);
        // Clear explosion.
        setTimeout(() => ctx.clearRect(invader.x.start, invader.y.start - px, spriteWidth, spriteHeigth + px), 75);


        // Step to decrease timer = 600 / number of invaders
        let timerStep = Math.floor((timers.enemyTimer.interval - 20) / (invaders.length));

        // Update timer.
        timers.enemyTimer.interval -= timerStep;
        initEnemiesTimer();
        if (!invaders.length) {
          clearInterval(timers.enemyTimer.value);
          alert('You Won!');
        }
      }
    });
  });
}

function playLaserSound() {
  let now = Tone.now();
  synthWithCrusher.triggerAttackRelease("C1", 0.1, now);
}

// function playStepSound() {
//   let now = Tone.now();
//   synth.triggerAttackRelease("C3", 0.1, now);
// }