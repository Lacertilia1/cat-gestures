const VERSION = '0.10.21';
export async function createRecognizer() {
  const { FilesetResolver, GestureRecognizer } = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`);
  const files = await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`);
  const options = { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task', delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .65, minHandPresenceConfidence: .65, minTrackingConfidence: .65 };
  try { return await GestureRecognizer.createFromOptions(files, options); }
  catch { options.baseOptions.delegate = 'CPU'; return GestureRecognizer.createFromOptions(files, options); }
}
