function distance(a, b) { return Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z); }
export class HandMotion {
  constructor() { this.reset(); }
  reset() { this.history = new Map(); this.activeUntil = 0; }
  update(result, now, aspect = 4/3) {
    const seen = new Set();
    for (const [index, hand] of (result.landmarks ?? []).entries()) {
      const key = result.handedness?.[index]?.[0]?.categoryName ?? String(index);
      if (seen.has(key)) continue;
      seen.add(key);
      const p = hand.map(point => ({x:point.x*aspect,y:point.y,z:point.z*aspect}));
      const size = distance(p[0],p[9]);
      const folded = [9,13,17].every(i => distance(p[i],p[i+1]) > size*.1 && distance(p[i],p[i+3]) < distance(p[i],p[i+1])*1.6);
      if (size < .01 || !folded) { this.history.delete(key); continue; }
      let state = this.history.get(key);
      if (!state || now-state.last > 180) state = {openFrames:0,closedFrames:0,armed:false,armedAt:0,openGap:0};
      state.last = now;
      const gap = distance(p[4],p[8])/size;
      // Separate open/closed thresholds prevent retriggering from small landmark jitter.
      if (gap > .75) {
        state.openFrames++; state.closedFrames = 0;
        if (state.openFrames >= 2) { state.armed = true; state.armedAt = now; state.openGap = gap; }
      } else {
        state.openFrames = 0;
        if (state.armed && now-state.armedAt > 2000) state.armed = false;
        state.closedFrames = gap < .5 && gap < state.openGap*.55 ? state.closedFrames+1 : 0;
        if (state.armed && state.closedFrames >= 2) {
          this.activeUntil = now+1100; state.armed = false; state.closedFrames = 0;
        }
      }
      this.history.set(key,state);
    }
    for (const key of this.history.keys()) if (!seen.has(key)) this.history.delete(key);
    return now < this.activeUntil ? 'PINCH' : null;
  }
}
