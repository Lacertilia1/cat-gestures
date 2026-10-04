export function detectCheekGesture(hands, faceResult, aspect = 4/3, mirrored = true) {
  const face = faceResult?.faceLandmarks?.[0];
  if (!face) return null;
  const distance = (a,b) => Math.hypot((a.x-b.x)*aspect,a.y-b.y);
  const width = distance(face[234],face[454]);
  if (width < .03) return null;
  for (const hand of hands.landmarks ?? []) {
    const indexExtended = distance(hand[5],hand[8]) > distance(hand[5],hand[6])*1.25;
    const folded = [9,13,17].every(i => distance(hand[i],hand[i+3]) < distance(hand[i],hand[i+1])*1.8);
    if (!indexExtended || !folded) continue;
    const tip = hand[8];
    const lip = { x:(face[13].x+face[14].x)/2, y:(face[13].y+face[14].y)/2 };
    const vertical = hand[5].y-tip.y > Math.abs((hand[5].x-tip.x)*aspect)*.8;
    const fingerNearLips = Math.min(...[6,7,8].map(i => distance(hand[i],lip))) < width*.23;
    if (vertical && fingerNearLips) return 'SHUSH';

  }
  return null;
}
