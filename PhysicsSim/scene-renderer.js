export function createPhysicsSceneRenderer({ canvas, levels, rings, originX, groundY, scale, getLevelIndex, getAngle, getPreviousTrail, getCurrentBall }) {
  const ctx = canvas.getContext('2d');

  function drawCannon() {
    const angleRad = (getAngle() * Math.PI) / 180;
    ctx.save();
    ctx.translate(originX, groundY);
    ctx.rotate(-angleRad);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, -6, 30, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -6, 30, 12);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(originX, groundY, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#475569';
    ctx.stroke();
  }

  return function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const level = levels[getLevelIndex()];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let meters = 0; meters <= 55; meters += 5) {
      const x = originX + meters * scale;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, groundY);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${meters}m`, x, groundY + 16);
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    const targetX = originX + level.targetDistance * scale;
    [...rings].reverse().forEach((ring, index) => {
      ctx.fillStyle = `rgba(251, 191, 36, ${0.1 + index * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(targetX, groundY + 2, ring.r * scale, ring.r * scale * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(targetX, groundY - 32);
    ctx.lineTo(targetX + 16, groundY - 24);
    ctx.lineTo(targetX, groundY - 16);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(targetX, groundY);
    ctx.lineTo(targetX, groundY - 32);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(targetX, groundY + 2, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (level.wall) {
      const wallX = originX + level.wall.x * scale;
      const wallHeight = level.wall.height * scale;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(wallX - 6, groundY - wallHeight, 12, wallHeight);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(wallX - 6, groundY - wallHeight, 12, wallHeight);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '10px sans-serif';
      ctx.fillText('WALL', wallX, groundY - wallHeight - 6);
    }

    const previousTrail = getPreviousTrail();
    if (previousTrail?.length > 1) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(previousTrail[0].x, previousTrail[0].y);
      previousTrail.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.restore();
    }

    const currentBall = getCurrentBall();
    if (currentBall?.trail?.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(currentBall.trail[0].x, currentBall.trail[0].y);
      currentBall.trail.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(currentBall.x, currentBall.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    drawCannon();
  };
}
