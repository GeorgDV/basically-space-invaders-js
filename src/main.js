import 'regenerator-runtime/runtime';

// Canvas variables.
let canvas = null;
let ctx  = null;


// Sound generation library components.
import * as Tone from 'tone';
import StartAudioContext from 'startaudiocontext';
let crusher = new Tone.BitCrusher(6).toDestination();
let crusher2 = new Tone.BitCrusher(1).toDestination();
let distortion = new Tone.Distortion(1).toDestination();
let synthWithCrusher = new Tone.Synth().connect(crusher).toDestination();
let synthWithCrusher2 = new Tone.Synth().connect(crusher2).connect(distortion).toDestination();
let synth = new Tone.Synth().toDestination();
let polySynth = new Tone.PolySynth().connect(distortion);


// Templates for creating sprites.
const templates = require('./templates.json');
// Browser 'file-system' read-writer for storing high score.
const fs = require('browserify-fs');

let score = 0;
let highScore = 0;
readHighScore();

// Movement directions.
const direction = {
  LEFT: 'left',
  RIGHT: 'right',
}

// Game endings (player wins or not).
const end = {
  playerWins: true,
  invadersWin: false,
}

// Constant variables.
const px = 5; // Size of a single 'pixel'.
const spriteWidth = px * 9; // Width of a default model sprite. (pixel * 9)
const spriteHeigth = px * 7; // Height of a default  model sprite. (pixel * 7)

const padding = 20; // Space from the edge of the canvas.


// In-Game variables.
let player = {}; // Player object.
let isPlayerInCooldown = false; // Player hit cooldown after getting hit.

let playerBullets = []; // Player bullet objects.
let invaderBullets = []; // Invader bullet objects.

let invaders = []; // Invader objects.
let invadersFront = [] // Front line of invaders (shooting invaders).

let invaderRows = null; // Number of ROWS of invaders.
let invaderCols = null; // Number of COLUMNS of invaders.

let invadersMoveDirection = direction.RIGHT; // By default invaders move right at the beginning.
let invadersStep = px * 3; // Length of a single invaders DOWN step.
let invadersStepsCount = 0; // How many steps have been made.


let hasGameStarted = false;
let hasGameEnded = false;
let ID = 0; // Id increment for ingame objects.


// Timer objects.
let timers = {
  playerTimer: {
    value: null,
    interval: 20,
  },
  invaderSpeedTimer: {
    value: null,
    interval: 180,
  },
  invaderBulletTimer: {
    value: null,
    interval: 30,
  },
  keyHandlerTimer: {
    value: null,
    interval: 10,
  },
}


// Keypress handler variables.
let pressedKeys = [];
let isShootKeyPressed = false;


////////
// EVENT LISTENERS
onload = () => {
  initCanvas();
  initAudio();

  // Wait for custom font to be loaded.
  document.fonts.load('10pt "FFF Forward"').then(() => {
    // Welcome text.
    ctx.font = '44px FFF Forward';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'gray';
    ctx.fillText('Space Invaders', canvas.width/2, canvas.height/3);
    ctx.font = '20px FFF Forward';
    ctx.fillStyle = 'white';
    ctx.fillText('Click To Start', canvas.width/2, canvas.height/2);

    // Display enemy point scores.
    let invader1 = createSprite('invader_1-1', canvas.width/3 + 30, canvas.height - 200);
    let invader2 = createSprite('invader_2-1', canvas.width/3 + 30, canvas.height - 100);
    drawSprite(invader1);
    drawSprite(invader2);
    ctx.fillText(' -   75 Points', canvas.width/2 + 40, canvas.height - 170);
    ctx.fillText(' -   25 Points', canvas.width/2 + 40, canvas.height - 70);
  });
};

onkeydown = onkeyup = (event) => {
  if (!hasGameStarted) return;
  pressedKeys[event.keyCode] = event.type == 'keydown';
}

onclick = (event) => {
  if (hasGameStarted || event.target.id !== 'canvas') return;
  StartAudioContext(Tone.getContext());
  initGame();
  hasGameStarted = true;
}






////////
// SPRITE MANAGEMENT
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
  }
}

// Updates existing sprite's template.
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
    angle: 90, // Default value 90 degrees.
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






////////
// INITALIZING FUNCTIONS
function initGame() {
  ctx.clearRect(0,0, canvas.width, canvas.height);

  initInvaders();
  initPlayer();

  initScores();

  initKeyHandlerTimer();
  initInvadersTimer();
  initPlayerTimer();
  setTimeout(() => initInvaderBulletTimer(), 3000);
}

function initCanvas() {
  canvas = document.querySelector('#canvas');
  let statsBar = document.querySelector('.stats');
  ctx = canvas.getContext('2d');
  canvas.width = 900;
  canvas.height = window.innerHeight - 5;

  statsBar.style.height = canvas.height;

  generatePlayerLifeIcons();

  // Init mobile controls.
  canvas.addEventListener('touchstart', (event) => touchHandler(event));
  canvas.addEventListener('touchmove', (event) => touchHandler(event));
  window.addEventListener('deviceorientation', (event) => {
    if (!hasGameStarted) return;
    let tiltX = Math.round(event.gamma * 2 );
    let tiltY = Math.round(event.beta * 2);
    tiltHandler(tiltX, tiltY);
  }, false);
}

function initAudio() {
  let audioContext = new Tone.Context();
  Tone.setContext(audioContext);
}

function initInvaders() {
  invaderRows = Math.floor((canvas.height / 3) / (spriteWidth * 1.3));
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
      let y = (spriteHeigth + px * 3) * row + (padding * 5);
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
  player = {
    ...createSprite('player', x, y),
    moveDirection: direction.RIGHT,
    lives: 3,
  };
  drawSprite(player, '#008a2e');
}

function initInvadersTimer() {
  if (timers.invaderSpeedTimer.value !== null) {
    clearInterval(timers.invaderSpeedTimer.value);
  }

  timers.invaderSpeedTimer.value = setInterval(() => {
    updateInvadersMoveDirection();
    updateInvaders();
  }, timers.invaderSpeedTimer.interval);
}

function initPlayerTimer() {
  if (timers.playerTimer.value !== null) {
    clearInterval(timers.playerTimer.value);
  }

  timers.playerTimer.value = setInterval(() => {
    if (player.lives > 0) {
      updatePlayer();
    }

    // Control bullets fired by player.
    if (playerBullets.length > 0) {
      detectBulletAndInvaderCollision();
      updatePlayerBullets();
    }
  }, timers.playerTimer.interval);
}

function initInvaderBulletTimer() {
  if (timers.invaderBulletTimer.value !== null) {
    clearInterval(timers.invaderBulletTimer.value);
  }

  timers.invaderBulletTimer.value = setInterval(() => {
    // Choose if to shoot or not.
    let random = getRandomInteger(1, invaders.length === 1 ? 6 : 18);
    if (random === 1 && invadersFront.length > 0) {
      // Get random front line invader to shoot.
      let index = Math.floor(Math.random() * invadersFront.length);
      invaderShoot(invadersFront[index]);
    }
    
    if (invaderBullets.length > 0) {
      detectBulletAndPlayerCollision();
      updateInvaderBullets();
    }
  }, timers.invaderBulletTimer.interval);
}

function initKeyHandlerTimer() {
  timers.keyHandlerTimer.value = setInterval(() => {
    handleKeyPress();
  }, timers.keyHandlerTimer.interval);
}

function initScores() {
  addToCurrentScore(0);
  updateHighScore(highScore);
}





////////
// IN-GAME FUNCTIONS
// Player.
function updatePlayer() {
  movePlayer();
  ctx.clearRect(player.x.start - px, player.y.start, spriteWidth + px * 2, spriteHeigth);
  drawSprite(player, isPlayerInCooldown ? '#014718' : '#008a2e');
}

function updatePlayerBullets() {
  if (!playerBullets.length) {
    return;
  }

  playerBullets.forEach((bullet) => {
    bullet.y.start -= 10;
    ctx.clearRect(bullet.x.start, bullet.y.start, px - 3, px * 6);

    // Bullet hits wall.
    if (bullet.y.start < 0) {
      bullet = updateSpriteTemplate(bullet, 'bullet_hit_wall_1');
      bullet.x.start -= (px * 5) - (px * 3); // Move new sprite to middle of bullet hit.
      bullet.x.current = bullet.x.start;
      drawSprite(bullet, '#c0ff8a', px - 3, px - 3);
      playerBullets = playerBullets.filter((item) => item.id !== bullet.id);
      setTimeout(() => ctx.clearRect(bullet.x.start, bullet.y.start + px * 2, px * 5, px * 2), 150);
    } else {
      drawSprite(bullet, '#77ff00', px - 3);
    }
  });
}

function movePlayer() {
  switch (player.moveDirection) {
    case direction.LEFT:
      if (player.x.start < (0 + padding)) {
        return;
      }
      player.x.start -= 3;
      player.x.current -= 3;
      break;
    case direction.RIGHT:
      if (player.x.start > (canvas.width - spriteWidth - padding)) {
        return;
      }
      player.x.start += 3;
      player.x.current += 3;
      break;
  }
}



// Invaders.
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
    
    // If invader is from front line we update it (aswell).
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

function updateInvaderBullets() {
  invaderBullets.forEach((bullet) => {
    ctx.clearRect(bullet.x - px, bullet.y - px, px*2, px*2);
    bullet.x += Math.cos(deg2rad(bullet.angle))*6;
    bullet.y += Math.sin(deg2rad(bullet.angle))*6;

    // Bullet hits wall.
    if (bullet.y > canvas.height) {
      invaderBullets = invaderBullets.filter((item) => item.id !== bullet.id);
    } else {
      drawArc(bullet, px - 2);
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

function updateInvadersMoveDirection() {
  let isDirectionChanging = false;
  invaders.forEach((invader) => {
    if (invader.x.start >= (canvas.width - spriteWidth - padding)) {
      isDirectionChanging = true;
      invadersMoveDirection = direction.LEFT;
    } else if (invader.x.start <= (0 + padding)) {
      isDirectionChanging = true;
      invadersMoveDirection = direction.RIGHT;
    }

    if (invader.y.start > canvas.height - (spriteHeigth * 3) && !hasGameEnded) {
      player.lives = 0;
      endGame(end.invadersWin);
    }
  });

  if (isDirectionChanging) {
    invadersStepDown();
  }
}

function invadersStepDown() {
  invadersStepsCount += 1;
  invaders.forEach((invader) => {
    invader.y.start += invadersStep;
    invader.y.current = invader.y.start;
  });

  // Play step sound.
  invadersStepsCount % 2 === 0 ?
  synth.triggerAttackRelease('C3', 0.05) :
  synth.triggerAttackRelease('C2', 0.05);
}

function invaderShoot(invader) {
  let x = invader.x.start + (spriteWidth / 2);
  let y = invader.y.start + spriteHeigth + (px * 3);
  let bullet = createArc(x, y);

  // Attempt at calculating shooting angle towards player.
  // let a = player.x.start + (spriteWidth / 2) - bullet.x;
  // let b = player.y.start + (spriteHeigth / 2) - bullet.y;
  // let angleRad = Math.atan(Math.abs(a / b));
  // bullet.angle = rad2deg(angleRad) + 90;

  invaderBullets.push(bullet);
  drawArc(bullet, px - 2);
}



// End Game.
function endGame(playerWins) {
  if (hasGameEnded) {
    return;
  }
  hasGameEnded = true;

  if (playerWins) {
    // Bonus score.
    let bonusScore = 1000 - (invadersStepsCount * 10);
    addToCurrentScore(bonusScore);

    // Ending words.
    ctx.clearRect(0, 0, canvas.width, 80);
    ctx.font = 'bold 40px FFF Forward';
    ctx.fillStyle = 'green';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WIN', canvas.width/2, canvas.height - (canvas.height - 80));
    ctx.font = 'bold 24px FFF Forward';
    ctx.fillStyle = 'white';
    ctx.fillText(`Speed Bonus: ${bonusScore}`, canvas.width/2, canvas.height - (canvas.height - 200));
    ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height - (canvas.height - 260));
  } else if (!playerWins) {
    invadersStep = 0;

    // Play death explsion.
    polySynth.triggerAttackRelease('C1', 0.25);

    // Play death frame.
    player = updateSpriteTemplate(player, 'explosion_2');
    ctx.clearRect(player.x.start - px, player.y.start, spriteWidth + px * 2, spriteHeigth);
    drawSprite(player, '#fc0d0d');
    setTimeout(() => ctx.clearRect(player.x.start - px, player.y.start, spriteWidth + px * 2, spriteHeigth), 750);

    // Ending words.
    ctx.clearRect(0, 0, canvas.width, 80);
    ctx.font = 'bold 40px FFF Forward';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.fillText('INVADERS WIN', canvas.width/2, canvas.height - (canvas.height - 80));
  }

  // Update Highscore.
  if (score > highScore) {
    writeHighScore(score);
    updateHighScore(score);
  }
}



// Keypress handling.
function handleKeyPress() {
  // If dead dont handle any keys.
  if (player.lives <= 0) {
    return;
  }

  if (pressedKeys[37]) {
    player.moveDirection = direction.LEFT;
  } else if (pressedKeys[39]) {
    player.moveDirection = direction.RIGHT;
  }

  if (pressedKeys[32] && !isShootKeyPressed) {
    isShootKeyPressed = true;
    playerShoot();
    setTimeout(() => isShootKeyPressed = false, hasGameEnded ? 100 : 650);
  }
}

function playerShoot() {
  let x = player.x.start + Math.floor(spriteWidth / 2 - 2);
  let y = player.y.start - Math.floor(spriteHeigth / 2);
  let bullet = createSprite('bullet', x, y);
  playerBullets.push(bullet);
  drawSprite(bullet, '#77ff00', px - 3);
  synthWithCrusher.triggerAttackRelease('C1', 0.05); // Play laser sound.
}



// Collision handlers.
function detectBulletAndInvaderCollision() {
  if (!playerBullets.length || !invaders.length || hasGameEnded) {
    return;
  }

  invaders.forEach((invader) => {
    playerBullets.forEach((bullet) => {
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
        // Update score based on killed invader.
        updateCurrentScore(invader);

        // Update front line invaders.
        updateInvadersFront(invader);

        // Remove bullet.
        ctx.clearRect(bullet.x.start, bullet.y.start, px - 3, px * 4);
        playerBullets = playerBullets.filter((item) => item.id !== bullet.id);

        // Remove invader and play explosion.
        invader = updateSpriteTemplate(invader, 'explosion_1');
        ctx.clearRect(invader.x.start, invader.y.start - px, spriteWidth, spriteHeigth + px);
        drawSprite(invader, '#ffffff', px - 2, px - 2);
        invaders = invaders.filter((item) => item.id !== invader.id);
        // Clear explosion.
        setTimeout(() => ctx.clearRect(invader.x.start, invader.y.start - px, spriteWidth, spriteHeigth + px), 75);

        // Step to decrease timer after each invader kill = 600 / number of invaders
        let timerStep = Math.floor((timers.invaderSpeedTimer.interval - 12) / (invaders.length));

        // Update invaders timer.
        invaders.length === 1 ?
        timers.invaderSpeedTimer.interval = 6 :
        timers.invaderSpeedTimer.interval -= timerStep;
        initInvadersTimer();

        if (invaders.length <= 0) {
          setTimeout(() => endGame(end.playerWins), 1000);
        }
      }
    });
  });
}

function detectBulletAndPlayerCollision() {
  if (!invaderBullets.length || !player || hasGameEnded) {
    return;
  }

  let playerTopY = player.y.start;
  let playerLeftX = player.x.start;
  let playerRightX = player.x.start + spriteWidth;

  invaderBullets.forEach((bullet) => {
    // Detect collision. 
    if (bullet.x <= playerRightX &&
      bullet.x >= playerLeftX &&
      bullet.y >= playerTopY) {

      // Remove bullet.
      ctx.clearRect(bullet.x - px, bullet.y - px, px*2, px*2);
      invaderBullets = invaderBullets.filter((item) => item.id !== bullet.id);

      if (!isPlayerInCooldown) {
        // Remove 1 player life.
        removePlayerLifeIcon();
        player.lives -= 1;

        // If dead.
        if (player.lives <= 0) {
          endGame(end.invadersWin);
          return;
        }

        // Play hit sound.
        synthWithCrusher2.triggerAttackRelease('C1', 0.1);

        // Set cooldown.
        isPlayerInCooldown = true;
        setTimeout(() => isPlayerInCooldown = false, 1000);
      }

    }
  });
}



// Player life icons handling.
function generatePlayerLifeIcons() {
  let statsContent = document.querySelector('.stats-content');
  let nodes = [];
  for (let i = 0; i < 3; i++) {
    // Span used because - https://stackoverflow.com/questions/47183886/css-content-image-not-showing-up-on-firefox
    let img = document.createElement('span');
    img.classList.add('icon--life')
    nodes.push(img);
  }
  statsContent.append(...nodes);
}

function removePlayerLifeIcon() {
  // Remove first element from icons list.
  let icons = document.querySelectorAll('.icon--life');
  if (icons.length > 0) {
    icons[0].remove()
  }
}



// Misc calulation functions.
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function rad2deg(rad) {
  return rad * (180/ Math.PI);
}

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}



////////
// SCORE READING AND WRITING FUNCTIONS
function writeHighScore(newHighScore) {
  fs.writeFile('/highscore.txt', newHighScore.toString());
}

function readHighScore() {
  fs.exists('/highscore.txt', (exists) => {
    if (exists) {
      fs.readFile('/highscore.txt', 'utf-8', (error, data) => {
        if (error) throw error;
        highScore = data ? data : 0;
      });
    }
  });
}

function updateHighScore(score) {
  document.querySelector('#highScore').innerHTML = score;
}

function updateCurrentScore(killedInvader) {
  switch (killedInvader.template.id) {
    case 'invader_1-1':
    case 'invader_1-2':
      addToCurrentScore(75);
      break;
    case 'invader_2-1':
    case 'invader_2-2':
      addToCurrentScore(25);
      break;
  }
}

function addToCurrentScore(valueToAdd) {
  score += valueToAdd;
  document.querySelector('#score').innerHTML = score;
}




////////
// MOBILE CONTROLS HANDLERS
function touchHandler(e) {
  if (!hasGameStarted || player.lives <= 0) return;
  if(e.touches && !isShootKeyPressed) {
    isShootKeyPressed = true;
    playerShoot();
    setTimeout(() => isShootKeyPressed = false, hasGameEnded ? 100 : 650);
  }
}

function tiltHandler(tiltX, tiltY) {
  // In landscape mode we use Y, otherwise X.
  let tilt = window.innerHeight < window.innerWidth ? tiltY : tiltX;
  // Direction change upon 20+ degree tilt.
  if (tilt > 20) {
    player.moveDirection = direction.RIGHT;
  } else if (tilt < -20) {
    player.moveDirection = direction.LEFT;
  }
}
