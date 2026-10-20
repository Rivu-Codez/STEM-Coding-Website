export function drawCannon(ctx, { originX, groundY, angleDeg }) {
  const angleRad = (angleDeg * Math.PI) / 180;
  const barrelLen = 30;

  ctx.save();
  ctx.translate(originX, groundY);
  ctx.rotate(-angleRad);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, -6, barrelLen, 12);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, -6, barrelLen, 12);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(originX, groundY, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#475569';
  ctx.stroke();
}
