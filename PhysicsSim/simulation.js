// Pure helpers for the deterministic PhysicsSim projectile model.
const PhysicsSimulation = {
  constants: {
    G: 9.8,
    SCALE: 10,
    DRAG_COEFF: 0.0018,
    RESTITUTION: 0.45,
    GROUND_FRICTION: 0.15,
    SUCTION_RADIUS: 1.2,
  },

  createBall({ angleDeg, speedMps, originX, groundY, scale }) {
    const radians = (angleDeg * Math.PI) / 180;
    return {
      x: originX,
      y: groundY,
      vx: speedMps * Math.cos(radians) * scale,
      vy: -speedMps * Math.sin(radians) * scale,
      trail: [{ x: originX, y: groundY }],
      elapsedTime: 0,
      maxY: groundY,
    };
  },

  advance(ball, { dt, useDrag, gravity, scale, dragCoefficient }) {
    ball.elapsedTime += dt;
    if (useDrag) {
      const speed = Math.hypot(ball.vx, ball.vy);
      ball.vx -= dragCoefficient * speed * ball.vx * dt;
      ball.vy -= dragCoefficient * speed * ball.vy * dt;
    }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.vy += gravity * scale * dt;
    ball.maxY = Math.min(ball.maxY, ball.y);
    ball.trail.push({ x: ball.x, y: ball.y });
    return ball;
  },

  ringForDistance(delta, rings, tolerance) {
    const captured = delta <= this.constants.SUCTION_RADIUS;
    return captured ? rings[0] : rings.find((ring) => delta <= Math.min(ring.r, tolerance));
  },
};
