const VERSION = '0.10.21';
export async function createPoseTracker() {
  const { FilesetResolver, PoseLandmarker } = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`);
  const files = await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`);
  const options = {
    baseOptions: {modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:'GPU'},
    runningMode:'VIDEO', numPoses:1, minPoseDetectionConfidence:.5,
    minPosePresenceConfidence:.5, minTrackingConfidence:.5,
  };
  try { return await PoseLandmarker.createFromOptions(files,options); }
  catch { options.baseOptions.delegate = 'CPU'; return PoseLandmarker.createFromOptions(files,options); }
}

const connections = [[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[27,31],[24,26],[26,28],[28,30],[30,32],[28,32]];
export function drawPose(canvas, result) {
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#ffb86b'; ctx.fillStyle = '#ffb86b'; ctx.lineWidth = 2;
  for (const pose of result.landmarks ?? []) {
    const visible = p => p && (p.visibility ?? 1) > .5;
    for (const [a,b] of connections) {
      if (!visible(pose[a]) || !visible(pose[b])) continue;
      ctx.beginPath(); ctx.moveTo(pose[a].x*canvas.width,pose[a].y*canvas.height);
      ctx.lineTo(pose[b].x*canvas.width,pose[b].y*canvas.height); ctx.stroke();
    }
    for (const p of pose.slice(11)) {
      if (!visible(p)) continue;
      ctx.beginPath(); ctx.arc(p.x*canvas.width,p.y*canvas.height,3,0,Math.PI*2); ctx.fill();
    }
  }
}
