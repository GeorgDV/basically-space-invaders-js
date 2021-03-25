import 'regenerator-runtime/runtime';

// Canvas variables.
let ctx;
let canvas;

// Sound generation things.
import * as Tone from 'tone';
import StartAudioContext from 'startaudiocontext';
let crusher = new Tone.BitCrusher(6).toDestination();
let synthWithCrusher = new Tone.Synth().connect(crusher).toDestination();
let synth = new Tone.Synth().toDestination();


// Templates from creating sprites.
const templates = require('./templates.json');

let player = {}; // Player "sprite" object.
let bullets = []; // Player bullet "sprite" objects.
let invaders = []; // Invaders "sprites" objects.
let invaderBullets = []; // Invader bullet "sprite" objects.
let invaderRows; // Number of ROWS of invaders. (scalable)
let invaderCols; // Number of COLUMNS of invaders. (scalable)
let invadersFront = [] // Front line of invaders (shooting invaders).

// Game variables.
let hasGameStarted = false;
let ID = 0; // Id increment for ingame objects.

const px = 5; // Size a single "pixel".
const spriteWidth = px * 9; // Width of a default model sprite. (pixel * 9)
const spriteHeigth = px * 7; // Height of a default  model sprite. (pixel * 7)

const padding = 20; // Space from the edge of the canvas.

// Timer objects.
let timers = {
  invaderSpeedTimer: {
    value: null,
    interval: 700,
  },
  playerTimer: {
    value: null,
    interval: 20,
  },
  invaderBulletTimer: {
    value: null,
    interval: 30,
  },
}

// Move direction enum.
const direction = {
  LEFT: 'left',
  RIGHT: 'right',
}
let invadersMoveDirection = direction.RIGHT; // By default invaders move right at the beginning.
let invadersStep = px * 3;
let invadersStepsCount = 0;

let isShootKeyPressed = false;
window.addEventListener('keydown', (event) => {
  if (!hasGameStarted) return;
  handleKeyDown(event);
});

window.addEventListener('click', () => {
  if (hasGameStarted) return;
  StartAudioContext(Tone.getContext());
  initGame();
  hasGameStarted = true;
});

window.onload = () => {
  initCanvas();
  initAudio();
  
  // Welcome text.
  ctx.font = "40px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("Click To Start", canvas.width/2, canvas.height/2);
};

function initGame() {
  ctx.clearRect(0,0, canvas.width, canvas.height);

  initInvaders();
  initPlayer();

  initEnemiesTimer();
  initPlayerTimer();
  setTimeout(() => initInvaderBulletTimer(), 3000);
}

function initCanvas() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext('2d');
  //canvas.width = window.innerWidth;
  canvas.width = 900;
  canvas.height = window.innerHeight - 5;
}

function initAudio() {
  let audioContext = new Tone.Context();
  Tone.setContext(audioContext);
}

// Used for creating sprite objects.
function createSprite(id, startX, startY) {
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

// Used for creating arc objects.
function createArc(x, y) {
  return {
    id: ID++,
    template: {
      id: 'arc',
      data: null,
    },
    x: x,
    y: y,
    angle: 90, // Default value 180 degrees.
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

// Used for drawing sprite objects using template data.
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

// Used for drawing arcs.
function drawArc(arc, radius, fillStyle) {
  ctx.beginPath();
  ctx.arc(arc.x, arc.y, radius ? radius : px, 0, 2 * Math.PI);
  ctx.fillStyle = fillStyle ? fillStyle : '#ffffff';
  ctx.fill();
  ctx.closePath();
}

function initInvaders() {
  invaderRows = Math.floor((canvas.height / 3) / (spriteWidth * 1.5));
  invaderCols = Math.floor((canvas.width) / (spriteHeigth  * 3));
  for (let row = 0; row < invaderRows; row++) {
    let id = 'invader_2-1';

    // First row gets different sprites.
    if (row === 0) {
      id = 'invader_1-1';
    }

    for (let col = 0; col < invaderCols; col++) {
      //  width or length + (margin) * X/Y postition + padding from edge.
      let x = (spriteWidth + px * 3) * col + padding;
      let y = (spriteHeigth + px * 3) * row + padding / 2;
      let invader = createSprite(id, x, y);
      invaders.push(invader);
      drawSprite(invader);

      // Last row of invaders are initally front line invaders.
      if (row === (invaderRows - 1)) {
        invadersFront.push(invader);
      }
    }
  }
}

function initPlayer() {
  let y = canvas.height - (spriteHeigth + padding);
  let x = padding;
  player = createSprite('player', x, y);
  drawSprite(player, '#008a2e');
}

function initEnemiesTimer() {
  timers.invaderSpeedTimer.value = setInterval(() => {
    updateMoveDirection();
    updateInvaders();
  }, timers.invaderSpeedTimer.interval);
}

function initPlayerTimer() {
  timers.playerTimer.value = setInterval(() => {
    updatePlayer();

    // Control bullets fired by player.
    if (bullets.length > 0) {
      detectBulletAndInvaderCollision();
      updateBullets();
    }
  }, timers.playerTimer.interval);
}

function initInvaderBulletTimer() {
  timers.invaderBulletTimer.value = setInterval(() => {
    // Choose if to shoot or not.
    let random = getRandomInteger(1, invaders.length === 1 ? 8 : 24);
    if (random === 1) {
      // Get random front line invader to shoot.
      let index = Math.floor(Math.random() * invadersFront.length);
      invaderShoot(invadersFront[index]);
    }
    
    if (invaderBullets.length > 0) {
      updateInvaderBullets();
    }
  }, timers.invaderBulletTimer.interval);
}

function updateInvaderBullets() {
  invaderBullets.forEach((bullet) => {
    ctx.clearRect(bullet.x - px, bullet.y - px, px*2, px*2);
    //bullet.x += Math.cos(deg2rad(bullet.angle))*6; // Uncomment this when there is horizonal movement.
    bullet.y += Math.sin(deg2rad(bullet.angle))*6;

    // Bullet hits wall.
    if (bullet.y > canvas.height) {
      invaderBullets = invaderBullets.filter((item) => item.id !== bullet.id);
    } else {
      drawArc(bullet, px - 2, '#dddddd');
    }
  });
}

function updateInvadersFront(invaderToReplace) {
  // If killed invader is not from front line, dont do anything.
  if (!invadersFront.some((invader) => invader.id === invaderToReplace.id)) {
    return;
  }

  // Remove killed invader from front line.
  invadersFront = invadersFront.filter((invader) => invader.id !== invaderToReplace.id)
  
  // Find replacement invader from previous line.
  let index = invaderToReplace.id - invaderCols;
  for (let i = index; i >= invaders[0].id; i -= invaderCols) {
    // Stepping back line after line. If there is any invader
    // from previous lines, it gets replaced by that.
    let invaderBehind = invaders.find((invader) => invader.id === i)
    if (invaderBehind) {
      invadersFront.push(invaderBehind);
      return;
    }
  }
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
  invadersStepsCount += 1;
  invaders.forEach((sprite) => {
    sprite.y.start += invadersStep;
    sprite.y.current = sprite.y.start;
  });
  playStepSound(); // Should use?
}

function updateInvaders() {
  invaders.forEach((invader) => {
    // Draw a rectangle to clear each sprite's previous frame individually.
    ctx.clearRect(invader.x.start, invader.y.start - invadersStep, spriteWidth, spriteHeigth + invadersStep);

    switch (invadersMoveDirection) {
      case direction.RIGHT:
        if (invader.x.start < (canvas.width - spriteWidth - padding)) {
          invader.x.start += px * 2;
          invader.x.current = invader.x.start;
        } 
        break;
      case direction.LEFT:
        if (invader.x.start > (0 + padding)) {
          invader.x.start -= px * 2;
          invader.x.current = invader.x.start;
        }
        break;
    }
    
    // If invader is from front line we update it.
    let indexOfFrontInvader = invadersFront.map((item) => item.id).indexOf(invader.id);
    if (indexOfFrontInvader !== -1) {
      invadersFront[indexOfFrontInvader] = invader;
    }
    
    // Animating invaders movement.
    let index;
    switch (invader.template.id) {
      case 'invader_1-1':
        invader = updateSpriteTemplate(invader, 'invader_1-2');
        index = invaders.map((item) => item.id).indexOf(invader.id);
        invaders[index] = invader;
        break;
      case 'invader_1-2':
        invader = updateSpriteTemplate(invader, 'invader_1-1');
        index = invaders.map((item) => item.id).indexOf(invader.id);
        invaders[index] = invader;
        break;
      case 'invader_2-1':
        invader = updateSpriteTemplate(invader, 'invader_2-2');
        index = invaders.map((item) => item.id).indexOf(invader.id);
        invaders[index] = invader;
        break;
      case 'invader_2-2':
        invader = updateSpriteTemplate(invader, 'invader_2-1');
        index = invaders.map((item) => item.id).indexOf(invader.id);
        invaders[index] = invader;
        break;
    }
    drawSprite(invader);
  });
}

function updatePlayer() {
  movePlayer()
  ctx.clearRect(player.x.start - px, player.y.start, spriteWidth + px * 2, spriteHeigth);
  drawSprite(player, '#008a2e');
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
  let x = player.x.start + Math.floor(spriteWidth / 2 - 2);
  let y = player.y.start - Math.floor(spriteHeigth / 2);
  let bullet = createSprite('bullet', x, y);
  bullets.push(bullet);
  drawSprite(bullet, '#77ff00', px - 3);
  playLaserSound();
}

function invaderShoot(invader) {
  let x = invader.x.start + (spriteWidth / 2);
  let y = invader.y.start + spriteHeigth + (px * 3);
  let bullet = createArc(x, y);

  // Calculate shooting angle. Not working 100% correctly atm.
  // let a = player.x.start + (spriteWidth / 2) - bullet.x;
  // let b = player.y.start + (spriteHeigth / 2) - bullet.y;
  // let angleRad = Math.atan(Math.abs(a / b));
  // bullet.angle = rad2deg(angleRad) + 90;

  invaderBullets.push(bullet);
  drawArc(bullet, px - 2, '#dddddd');
}

function updateBullets() {
  if (!bullets.length) {
    return;
  }

  bullets.forEach((bullet) => {
    bullet.y.start -= 10;
    ctx.clearRect(bullet.x.start, bullet.y.start, px - 3, px * 6);

    // Bullet hits wall.
    if (bullet.y.start < 0) {
      bullet = updateSpriteTemplate(bullet, 'bullet_hit_wall_1');
      bullet.x.start -= (px * 5) - (px * 3); // Move new sprite to middle of bullet hit.
      bullet.x.current = bullet.x.start;
      drawSprite(bullet, '#c0ff8a', px - 3, px - 3);
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
        bulletX >= invaderLeftX - (px - 3) &&
        bulletY <= invaderBottomY &&
        bulletY >= invaderTopY) {

        // Update front line invaders.
        updateInvadersFront(invader);

        // Remove bullet.
        ctx.clearRect(bullet.x.start, bullet.y.start, px - 3, px * 4);
        bullets = bullets.filter((item) => item.id !== bullet.id);

        // Remove invader and play explosion.
        invader = updateSpriteTemplate(invader, 'explosion');
        ctx.clearRect(invader.x.start, invader.y.start - px, spriteWidth, spriteHeigth + px);
        drawSprite(invader, '#ffffff', px - 2, px - 2);
        invaders = invaders.filter((item) => item.id !== invader.id);
        // Clear explosion.
        setTimeout(() => ctx.clearRect(invader.x.start, invader.y.start - px, spriteWidth, spriteHeigth + px), 75);

        // Step to decrease timer = 600 / number of invaders
        let timerStep = Math.floor((timers.invaderSpeedTimer.interval - 100) / (invaders.length));

        // Update invaders timer.
        timers.invaderSpeedTimer.interval -= timerStep;
        initEnemiesTimer();
        if (!invaders.length) {
          clearInterval(timers.invaderSpeedTimer.value);
          setTimeout(() => alert('You Won!'), 500);
        }
      }
    });
  });
}

function playLaserSound() {
  synthWithCrusher.triggerAttackRelease("C1", 0.05);
}

function playStepSound() {
  if (invadersStepsCount % 2 === 0) {
    synth.triggerAttackRelease("C3", 0.05);
  } else if (invadersStepsCount % 2 > 0) {
    synth.triggerAttackRelease("C2", 0.05);
  }
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
function rad2deg(rad) {
  return rad * (180/ Math.PI);
}
function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}