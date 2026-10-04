function angle(a, b, c) {
  const u = [a.x-b.x, a.y-b.y, a.z-b.z];
  const v = [c.x-b.x, c.y-b.y, c.z-b.z];
  const norm = Math.hypot(...u) * Math.hypot(...v);
  return norm ? Math.acos(Math.max(-1, Math.min(1, u.reduce((sum, n, i) => sum+n*v[i], 0)/norm))) * 180/Math.PI : 0;
}
function distance(a, b) {
  return Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
}
export function detectGesture(result, aspectRatio = 4/3, preferredGesture = 'DEFAULT', mirrored = true, mouthOpen = false) {
  const hands = (result.landmarks ?? []).map((landmarks, index) => detectHand(landmarks, result.gestures?.[index]?.[0], aspectRatio, mirrored, mouthOpen));
  const fist = hands.find(hand => hand.gesture === 'FIST');
  if (fist) return { gesture:'FIST', side:fist.side, metrics:fist.metrics };
  if (hands.length === 2 && hands.every(hand => hand.metrics.openPalm)) {
    return { gesture: 'HANDS_UP', metrics: { hand: true, hands: hands.map(hand => hand.metrics) } };
  }
  // Keep the active gesture while either hand holds it, independent of detection order.
  const priority = ['MIDDLE_FINGER', 'VICTORY', 'SHAKA', 'SHAKA_RIGHT', 'POINT_UP', 'POINT_CAMERA', 'THUMB_UP', 'POINT_LEFT', 'POINT_RIGHT', 'FIST'];
  const gesture = hands.some(hand => hand.gesture === preferredGesture) && preferredGesture !== 'DEFAULT'
    ? preferredGesture
    : priority.find(name => hands.some(hand => hand.gesture === name)) ?? 'DEFAULT';
  const selected = hands.find(hand => hand.gesture === gesture);
  return { gesture, side: selected?.side ?? null, metrics: { hand: hands.length > 0, hands: hands.map(hand => ({ gesture: hand.gesture, ...hand.metrics })) } };
}
function detectHand(landmarks, category, aspectRatio, mirrored, mouthOpen) {
  if (!landmarks) return { gesture: 'DEFAULT', metrics: { hand: false } };
  // Normalized x and y use different image dimensions; restore their proportions.
  const points = landmarks.map(p => ({ x:p.x*aspectRatio, y:p.y, z:p.z*aspectRatio }));
  const bends = [5,9,13,17].map(i => angle(points[i], points[i+1], points[i+3]));
  const dx = points[8].x-points[5].x;
  const dy = points[8].y-points[5].y;
  const score = category?.score ?? 0;
  const palmSize = distance(points[0], points[9]);
  const thumbToPalm = palmSize > .001 ? distance(points[4], points[5])/palmSize : Infinity;
  const curled = [5,9,13,17].map((i, index) =>
    bends[index] < 155 && distance(points[i], points[i+1]) > palmSize*.08 &&
    distance(points[i], points[i+3]) < distance(points[i], points[i+1])*1.65
  );
  const compactFingers = [5,9,13,17].map(i => distance(points[i],points[i+3]) < palmSize*1.05);
  // Relative 3D distances and joint angles do not depend on hand direction.
  // The thumb must stay near the palm so a raised thumb is not a fist.
  const fingerReturns = [5,9,13,17].map(i =>
    distance(points[0],points[i+3]) < distance(points[0],points[i+1])*.98
  );
  const indexClearlyExtended = !fingerReturns[0] && bends[0] > 145 && distance(points[5],points[8]) > distance(points[5],points[6])*1.7;
  // Folded tips return toward the wrist even when occlusion makes joint angles unreliable.
  const returnedFist = fingerReturns[0] && fingerReturns.filter(Boolean).length >= 3 &&
    thumbToPalm < 1.3;
  const geometryFist = palmSize > .001 && !indexClearlyExtended && compactFingers[0] &&
    (returnedFist || (compactFingers.filter(Boolean).length >= 3 && curled.filter(Boolean).length >= 2 && thumbToPalm < 1.2));
  const straightFingers = [5,9,13,17].every((i, index) =>
    bends[index] > 130 && distance(points[i], points[i+3]) > palmSize*.45
  );
  // Accept open palms at any position and rotation, with either model or geometry evidence.
  const openPalm = (category?.categoryName === 'Open_Palm' && score >= .5) ||
    (palmSize > .001 && straightFingers && thumbToPalm > .65);
  const palmX = [0,5,9,13,17].reduce((sum,i) => sum+landmarks[i].x/5, 0);
  const screenX = mirrored ? 1-palmX : palmX;
  const side = screenX < .5 ? 'left' : 'right';
  const metrics = { hand:true, classifier:category?.categoryName, score:+score.toFixed(2), fingerAngles:bends.map(Math.round), geometryFist, thumbToPalm, openPalm, directionX:+dx.toFixed(3), directionY:+dy.toFixed(3) };
  const pinkyExtended = bends[3] > 130 && distance(points[17],points[20]) > distance(points[17],points[18])*1.6;
  const shaka = palmSize > .001 && pinkyExtended &&
    bends.slice(0,3).every(a => a < 155) && thumbToPalm > .65;
  if (shaka) return { gesture:screenX < .5 ? 'SHAKA' : 'SHAKA_RIGHT', metrics, side };
  if (category?.categoryName === 'Closed_Fist' && score >= .45 && !indexClearlyExtended && !pinkyExtended) return { gesture:'FIST', metrics, side };
  const middleFinger = palmSize > .001 && bends[1] > 140 &&
    [0,2,3].every(i => bends[i] < 145) &&
    distance(points[9],points[12]) > palmSize*.85;
  if (middleFinger) return { gesture:'MIDDLE_FINGER', metrics, side };
  const victory = palmSize > .001 && bends[0] > 135 && bends[1] > 135 &&
    bends[2] < 150 && bends[3] < 150 &&
    [5,9].every(i => distance(points[i],points[i+3]) > palmSize*.75 &&
      distance(points[0],points[i+3]) > distance(points[0],points[i+1])*1.08) &&
    distance(points[8],points[12]) > palmSize*.25;
  if (victory) return { gesture:'VICTORY', metrics, side };
  // Confirmed fists take priority over permissive pointing rules when fingers overlap.
  if (geometryFist && category?.categoryName !== 'Thumb_Up') return { gesture:'FIST', metrics, side };
  const indexLength = distance(points[5], points[8]);
  const indexDepth = points[5].z-points[8].z;
  const indexScreenLength = Math.hypot(dx, dy);
  // A finger aimed at the camera is shortened on screen but extends toward negative z.
  const pointUp = palmSize > .001 && bends[0] > 145 && bends.slice(1).every(a => a < 145) &&
    indexLength > palmSize*.65 && -dy > palmSize*.5 &&
    -dy > Math.abs(dx)*1.5 && Math.abs(indexDepth) < -dy*.7;
  if (pointUp) return { gesture:'POINT_UP', metrics, side };
  const relaxedPoint = mouthOpen && indexClearlyExtended && bends.slice(1).every(a => a < 155);
  const pointCamera = relaxedPoint || palmSize > .001 && bends[0] > 130 && bends.slice(1).every(a => a < 155) &&
    indexLength > palmSize*.55 && indexDepth > palmSize*.25 && indexDepth > indexScreenLength*.65;
  metrics.pointCamera = pointCamera;
  if (pointCamera) return { gesture:'POINT_CAMERA', metrics, side };
  // A straight index plus three folded fingers works for horizontal pointing too.
  if (bends[0] > 140 && bends.slice(1).every(a => a < 145) && Math.abs(dx) > .055 && Math.abs(dx) > Math.abs(dy)*1.25) {
    return { gesture: (mirrored ? -dx : dx) < 0 ? 'POINT_LEFT' : 'POINT_RIGHT', metrics, side };
  }
  if (score >= .65 && category.categoryName === 'Thumb_Up' && points[4].y < points[2].y-.025) return { gesture:'THUMB_UP', metrics, side };
  if (geometryFist || (score >= .65 && category?.categoryName === 'Closed_Fist' && !indexClearlyExtended)) return { gesture:'FIST', metrics, side };
  return { gesture:'DEFAULT', metrics, side };
}
