import { Camera } from './camera.js';
import { createRecognizer } from './recognition.js';
import { createFaceTracker } from './face.js';
import { createPoseTracker } from './pose.js';
import { detectGesture } from './gestures.js';
import { detectCheekGesture } from './cheek.js';
import { isMouthOpen } from './expression.js';
import { GestureState } from './state.js';
import { showGesture, drawDebug, setCameraActive } from './display.js';
const video = document.querySelector('#video');
const canvas = document.querySelector('#overlay');
const button = document.querySelector('#camera-button');
const message = document.querySelector('#message');
const camera = new Camera(video);
const state = new GestureState();
let recognizer, face, pose, running = false, frameId, lastTime = -1, lastProcessed = 0;
showGesture('DEFAULT');
function stop() {
  running = false; cancelAnimationFrame(frameId); camera.stop(); state.reset(); lastTime = -1;
  setCameraActive(false); drawDebug(canvas, {}, false); showGesture('DEFAULT');
  button.textContent = 'Запустить камеру'; document.querySelector('#camera-placeholder').hidden = false;
  document.querySelector('#camera-status').textContent = 'КАМЕРА ВЫКЛЮЧЕНА';
}
function frame(now) {
  if (!running) return;
  try {
    if (video.readyState >= 2 && video.currentTime !== lastTime && now-lastProcessed >= 50) {
      lastTime = video.currentTime; lastProcessed = now;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const result = recognizer.recognizeForVideo(video, now);
      drawDebug(canvas, result, true);
      const transform = getComputedStyle(video).transform;
      const mirrored = transform !== 'none' && new DOMMatrixReadOnly(transform).a < 0;
      let faceResult = null;
      if (face) {
        try { faceResult = face.tracker.detectForVideo(video, now); }
        catch { face.tracker.close(); face = null; message.textContent = 'Отслеживание лица остановлено. Перезапусти камеру.'; }
      }
      const { gesture, side } = detectGesture(result, video.videoWidth/video.videoHeight, state.current, mirrored, isMouthOpen(faceResult, video.videoWidth/video.videoHeight));
      const cheekGesture = detectCheekGesture(result, faceResult, video.videoWidth/video.videoHeight, mirrored);
      const handGesture = gesture === 'POINT_CAMERA' && !isMouthOpen(faceResult, video.videoWidth/video.videoHeight)
        ? 'DEFAULT' : gesture;
      const nextGesture = handGesture === 'FIST' ? handGesture : cheekGesture ?? handGesture;
      const stable = state.update(nextGesture, now);
      if (stable === nextGesture) showGesture(stable, side);
      if (pose) {
        try { pose.detectForVideo(video, now); }
        catch { pose.close(); pose = null; message.textContent = 'Отслеживание тела остановлено. Перезапусти камеру.'; }
      }
    }
    frameId = requestAnimationFrame(frame);
  } catch (error) { stop(); message.textContent = `Ошибка распознавания: ${error.message}`; }
}
button.addEventListener('click', async () => {
  if (running) { stop(); message.textContent = ''; return; }
  button.disabled = true; message.textContent = 'Подготовка модели и камеры...';
  try {
    recognizer ??= await createRecognizer();
    let faceWarning = '';
    try { face ??= await createFaceTracker(); }
    catch { faceWarning = 'Не удалось загрузить модель лица. Руки работают; перезапусти камеру для повторной попытки.'; }
    try { pose ??= await createPoseTracker(); }
    catch { faceWarning += ' Не удалось загрузить модель тела. Перезапусти камеру для повторной попытки.'; }
    await camera.start(); running = true; state.reset(); setCameraActive(true); showGesture('DEFAULT');
    camera.stream.getVideoTracks()[0].addEventListener('ended', stop, { once:true });
    document.querySelector('#camera-placeholder').hidden = true;
    document.querySelector('#camera-status').textContent = 'КАМЕРА АКТИВНА'; button.textContent = 'Остановить камеру';
    message.textContent = faceWarning;
    frameId = requestAnimationFrame(frame);
  } catch (error) {
    stop();
    const errors = { NotAllowedError:'Доступ к камере запрещен. Разреши его в настройках браузера.', NotFoundError:'Веб-камера не найдена.', NotReadableError:'Камера занята другим приложением.' };
    message.textContent = errors[error.name] ?? `Не удалось запустить: ${error.message}. Проверь интернет и открой localhost.`;
  } finally { button.disabled = false; }
});
window.addEventListener('pagehide', () => { stop(); recognizer?.close(); recognizer = null; face?.tracker.close(); face = null; pose?.close(); pose = null; });
