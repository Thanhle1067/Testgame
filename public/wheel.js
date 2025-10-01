
class Wheel {
  constructor(canvas, labels) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.labels = labels;
    this.rotation = 0;
    this.sectorAngle = (Math.PI * 2) / labels.length;
  }
  setLabels(labels) {
    this.labels = labels;
    this.sectorAngle = (Math.PI * 2) / labels.length;
    this.rotation = 0;
    this.draw();
  }
  draw() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const r = Math.min(width, height) / 2 - 10;
    const cx = width/2, cy = height/2;
    ctx.clearRect(0,0,width,height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);

    for (let i=0;i<this.labels.length;i++){
      const start = i * this.sectorAngle;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,r,start,start+this.sectorAngle,false);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#e6e6e6' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + this.sectorAngle/2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#111';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText(this.labels[i], r - 16, 8);
      ctx.restore();
    }
    ctx.restore();
  }
  spinToIndex(index, cb) {
    const targetAngle = (Math.PI * 1.5) - (index * this.sectorAngle) - (this.sectorAngle/2);
    const extra = Math.PI * 2 * (3 + Math.floor(Math.random()*3));
    const final = targetAngle + extra;
    const start = this.rotation;
    const duration = 4000 + Math.random()*1000;
    const t0 = performance.now();
    const animate = (t)=>{
      const p = Math.min(1, (t - t0) / duration);
      const k = 1 - Math.pow(1-p, 3);
      this.rotation = start + (final - start) * k;
      this.draw();
      if (p < 1) requestAnimationFrame(animate);
      else cb && cb();
    };
    requestAnimationFrame(animate);
  }
  indexAtPointer() {
    let a = (Math.PI*1.5 - this.rotation) % (Math.PI*2);
    if (a < 0) a += Math.PI*2;
    return Math.floor(a / this.sectorAngle);
  }
}
window.Wheel = Wheel;
