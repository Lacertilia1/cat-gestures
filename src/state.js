export class GestureState {
  constructor({ holdMs = 220, releaseMs = 450, minFrames = 3 } = {}) {
    Object.assign(this, { holdMs, releaseMs, minFrames }); this.reset();
  }
  reset() { this.current = 'DEFAULT'; this.candidate = 'DEFAULT'; this.since = 0; this.frames = 0; }
  update(gesture, now) {
    if (gesture !== this.candidate) { this.candidate = gesture; this.since = now; this.frames = 1; }
    else this.frames++;
    const delay = gesture === 'DEFAULT' ? this.releaseMs : this.holdMs;
    if (gesture !== this.current && this.frames >= this.minFrames && now-this.since >= delay) this.current = gesture;
    return this.current;
  }
}
