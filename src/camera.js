export class Camera {
  constructor(video) { this.video = video; this.stream = null; }
  async start() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Камера требует localhost или HTTPS.');
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    this.video.srcObject = this.stream;
    try { await this.video.play(); } catch (error) { this.stop(); throw error; }
  }
  stop() { this.stream?.getTracks().forEach(track => track.stop()); this.stream = null; this.video.srcObject = null; }
}
