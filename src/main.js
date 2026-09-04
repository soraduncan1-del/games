import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfefff, 20, 120);

const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 500);
camera.position.set(0, 6, 12);

// lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
hemi.position.set(0, 50, 0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(-10, 20, 10);
scene.add(dir);

// ground
const groundGeo = new THREE.PlaneGeometry(40, 200, 8, 8);
const groundMat = new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.9});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.position.y = 0;
scene.add(ground);

// player
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1.2,1.2,2),
  new THREE.MeshStandardMaterial({color:0xffd166})
);
player.position.set(0,1,0);
scene.add(player);

// simple duck decal (sprite)
const loader = new THREE.TextureLoader();
loader.load('/assets/duck.svg', (tex)=>{
  const spriteMat = new THREE.SpriteMaterial({map:tex});
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.4,2.4,1);
  sprite.position.set(0,1.8,0);
  player.add(sprite);
});

// obstacle pool
const obstaclePool = [];
const activeObstacles = [];

function makeObstacle(){
  const geo = new THREE.BoxGeometry(1.2,1.2,1.2);
  const mat = new THREE.MeshStandardMaterial({color:0x4a7c59});
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

for(let i=0;i<30;i++) obstaclePool.push(makeObstacle());

function spawnObstacle(x,z){
  const o = obstaclePool.pop() || makeObstacle();
  o.position.set(x,0.6,z);
  scene.add(o);
  activeObstacles.push(o);
}

// lanes
const lanes = [-3, 0, 3];
let laneIndex = 1; // middle

// game state
let speed = 15; // units per second
let distance = 0;
let lastTime = 0;
let running = true;
let jumpVel = 0;
let isGrounded = true;

const hudDistance = document.getElementById('score');
const hudSpeed = document.getElementById('speed');
const restartBtn = document.getElementById('restart');

restartBtn.addEventListener('click', ()=>{resetGame();});

function resetGame(){
  // remove active obstacles
  for(const o of activeObstacles){ scene.remove(o); obstaclePool.push(o); }
  activeObstacles.length = 0;
  distance = 0; speed = 12; laneIndex = 1; player.position.x = lanes[laneIndex]; player.position.y = 1; jumpVel = 0; isGrounded = true; running = true; restartBtn.hidden = true;
}

// spawn initial obstacles ahead
for(let i=10;i<120;i+=6){
  if(Math.random()>0.6) spawnObstacle(lanes[Math.floor(Math.random()*3)], -i);
}

// input
window.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowLeft') moveLeft();
  if(e.key === 'ArrowRight') moveRight();
  if(e.key === ' '){ if(isGrounded){ jumpVel = 10; isGrounded=false; } }
});

let touchStartX = null;
window.addEventListener('touchstart', (e)=>{ touchStartX = e.touches[0].clientX; });
window.addEventListener('touchend', (e)=>{ if(touchStartX==null) return; const dx = (e.changedTouches[0].clientX - touchStartX); if(dx<-30) moveLeft(); else if(dx>30) moveRight(); touchStartX = null; });

function moveLeft(){ laneIndex = Math.max(0, laneIndex-1); }
function moveRight(){ laneIndex = Math.min(lanes.length-1, laneIndex+1); }

// collision detection
function checkCollisions(){
  const pBox = new THREE.Box3().setFromObject(player);
  for(const o of activeObstacles){
    const ob = new THREE.Box3().setFromObject(o);
    if(pBox.intersectsBox(ob)) return true;
  }
  return false;
}

function updateObstacles(dt){
  // move obstacles toward player (increase z)
  for(let i=activeObstacles.length-1;i>=0;i--){
    const o = activeObstacles[i];
    o.position.z += speed * dt;
    if(o.position.z > 10){ // passed
      scene.remove(o); activeObstacles.splice(i,1); obstaclePool.push(o);
    }
  }
  // spawn new ones ahead probabilistically
  const aheadZ = -120;
  if(Math.random() < 0.02 + Math.min(0.18, distance/2000)){
    spawnObstacle(lanes[Math.floor(Math.random()*3)], aheadZ);
  }
}

function animate(t){
  if(!lastTime) lastTime = t;
  const dt = (t - lastTime)/1000;
  lastTime = t;
  if(running){
    // forward motion simulated by moving camera/ground
    distance += speed * dt * 10;
    speed += 0.004 * dt * 60; // ramp up slowly

    // update player lane position smoothly
    const targetX = lanes[laneIndex];
    player.position.x += (targetX - player.position.x) * Math.min(1, 8 * dt);

    // jump physics
    if(!isGrounded){
      jumpVel -= 24 * dt; // gravity
      player.position.y += jumpVel * dt;
      if(player.position.y <= 1){ player.position.y = 1; isGrounded = true; jumpVel = 0; }
    }

    // obstacles
    updateObstacles(dt);

    // collision
    if(checkCollisions()){
      running = false; restartBtn.hidden = false; console.log('crash at', Math.floor(distance));
    }

    // HUD
    hudDistance.textContent = `Distance: ${Math.floor(distance)}`;
    hudSpeed.textContent = `Speed: ${speed.toFixed(1)}`;
  }

  // camera follow
  camera.position.x += (player.position.x - camera.position.x) * 0.1;
  camera.position.z = player.position.z + 12;
  camera.lookAt(player.position.x, player.position.y+1, player.position.z - 6);

  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// expose a simple debug: click to jump
window.addEventListener('click', ()=>{ if(isGrounded && running) { jumpVel = 10; isGrounded=false; } });

