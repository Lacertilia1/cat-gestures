const VERSION = '0.10.21';
export async function createFaceTracker() {
  const { FilesetResolver, FaceLandmarker } = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`);
  const files = await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`);
  const options = {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'GPU' },
    runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
    minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5, minTrackingConfidence: .5,
  };
  let tracker;
  try { tracker = await FaceLandmarker.createFromOptions(files, options); }
  catch { options.baseOptions.delegate = 'CPU'; tracker = await FaceLandmarker.createFromOptions(files, options); }
  return { tracker, connections: FaceLandmarker.FACE_LANDMARKS_CONTOURS };
}
export function drawFace(canvas, result, connections) {
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#75d9ff'; ctx.fillStyle = '#75d9ff'; ctx.lineWidth = 1;
  for (const face of result.faceLandmarks ?? []) {
    for (const { start, end } of connections) {
      const a = face[start], b = face[end];
      ctx.beginPath(); ctx.moveTo(a.x*canvas.width,a.y*canvas.height);
      ctx.lineTo(b.x*canvas.width,b.y*canvas.height); ctx.stroke();
    }
    for (const index of [1,4,33,133,362,263,61,291,468,473]) {
      const p = face[index]; if (!p) continue;
      ctx.beginPath(); ctx.arc(p.x*canvas.width,p.y*canvas.height,2,0,Math.PI*2); ctx.fill();
    }
  }
}
