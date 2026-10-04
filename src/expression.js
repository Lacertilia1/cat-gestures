export function isMouthOpen(result, aspect = 4/3) {
  const categories = result?.faceBlendshapes?.[0]?.categories ?? [];
  const jaw = categories.find(item => item.categoryName === 'jawOpen');
  if (jaw) return jaw.score >= .25;
  const face = result?.faceLandmarks?.[0];
  if (!face) return false;
  const width = Math.hypot((face[61].x-face[291].x)*aspect, face[61].y-face[291].y);
  return width > .01 && Math.abs(face[13].y-face[14].y)/width > .18;
}
