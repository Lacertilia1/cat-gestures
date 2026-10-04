export const gestureImages = {
  MIDDLE_FINGER: './assets/cats/middle-finger.png',
  POINT_UP: './assets/cats/point-up.png',
  THUMB_UP: './assets/cats/thumb-up.png',
  VICTORY: './assets/cats/victory.png',
  FIST: './assets/cats/fist.jpg',
  SHUSH: './assets/cats/sshhh.png',
  DEFAULT: './assets/cats/normal.jpg',
  SHAKA: './assets/cats/shaka.png', SHAKA_RIGHT: './assets/cats/shaka.png',
  POINT_CAMERA: './assets/cats/point-camera.gif',
};
export const gestureEmojis = {
  DEFAULT: '', FIST: '✊', THUMB_UP: '👍', POINT_LEFT: '👈', POINT_RIGHT: '👉', HANDS_UP: '🙌',
};
let cameraActive = false;
export function setCameraActive(active) { cameraActive = active; }
export function showGesture(gesture, side = null) {
  const image = document.querySelector('#reaction-image');
  const emoji = document.querySelector('#reaction-emoji');
  const source = cameraActive ? gestureImages[gesture] ?? gestureImages.DEFAULT : null;

  const isDefaultImage = source === gestureImages.DEFAULT;
  const mirrorReaction = gesture === 'SHAKA_RIGHT' ||
    (side === 'right' && gesture !== 'HANDS_UP');
  image.style.transform = !isDefaultImage && mirrorReaction ? 'scaleX(-1)' : 'none';
  image.hidden = !source;
  emoji.hidden = Boolean(source);
  if (source) {
    if (image.getAttribute('src') !== source) image.src = source;
    image.alt = gesture === 'FIST' ? 'Кот показывает кулак' : gesture === 'SHUSH' ? 'Кот делает шшш' : gesture === 'DEFAULT' ? 'Кот в обычном состоянии' : gesture.startsWith('SHAKA') ? 'Кот с жестом шака' : gesture === 'POINT_CAMERA' ? 'Смеющийся кот указывает в камеру' : 'Absolute Cinema';
  }
  emoji.textContent = '';
}
const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
export function drawDebug(canvas, result, enabled) {
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!enabled) return;
  ctx.strokeStyle = '#c6f57a'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 2;
  for (const hand of result.landmarks ?? []) {
    for (const [a,b] of connections) { ctx.beginPath(); ctx.moveTo(hand[a].x*canvas.width,hand[a].y*canvas.height); ctx.lineTo(hand[b].x*canvas.width,hand[b].y*canvas.height); ctx.stroke(); }
    for (const p of hand) { ctx.beginPath(); ctx.arc(p.x*canvas.width,p.y*canvas.height,3,0,Math.PI*2); ctx.fill(); }
  }
}
