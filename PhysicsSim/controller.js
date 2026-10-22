import { LEVELS } from './levels.js';
import { PhysicsSimulation } from './simulation.js';
import { createPhysicsSceneRenderer } from './scene-renderer.js';
import { bindPhysicsEvents } from './events.js';
import { createGamePersistence } from '../js/game-persistence.js';

// --- A. LEVEL DEFINITIONS ---
    /* Level data is maintained in levels.js. */
    /*
      { title: "Level 1: Projectile Motion", instruction: "🔭 <strong>Concept:</strong> Observe how launch angle creates a curved projectile path.", targetDistance: 30.0, lockSpeed: true, lockDrag: true, fixedSpeed: 20, wall: null },
      { title: "Level 2: Maximum Range", instruction: "📐 <strong>Concept:</strong> Find the 45° angle that produces the greatest range at fixed speed.", targetDistance: 40.8, lockSpeed: true, lockDrag: true, fixedSpeed: 20, wall: null },
      { title: "Level 3: Speed & Distance", instruction: "⚡ <strong>Concept:</strong> Increase launch speed to reach a target farther away.", targetDistance: 50.0, lockSpeed: false, lockDrag: true, fixedSpeed: 20, wall: null },
      { title: "Level 4: Angle & Height", instruction: "📈 <strong>Concept:</strong> Use a steeper angle to increase the projectile's height.", targetDistance: 22.0, lockSpeed: true, lockDrag: true, fixedSpeed: 20, wall: null },
      { title: "Level 5: Match the Target", instruction: "🎯 <strong>Concept:</strong> Combine angle and speed to land within the target ring.", targetDistance: 34.0, lockSpeed: false, lockDrag: true, fixedSpeed: 20, wall: null },
      { title: "Level 6: Two Valid Angles", instruction: "🔀 <strong>Concept:</strong> Discover that low and high launch angles can reach the same distance.", targetDistance: 28.0, lockSpeed: true, lockDrag: true, fixedSpeed: 25, wall: null },
      { title: "Level 7: Clear the Wall", instruction: "🧱 <strong>Concept:</strong> Clear an obstacle by controlling the projectile's height at a given distance.", targetDistance: 42.0, lockSpeed: false, lockDrag: true, fixedSpeed: 25, wall: { x: 20.0, height: 12.0 } },
      { title: "Level 8: Flight Time", instruction: "⏱️ <strong>Concept:</strong> Compare launch angles and notice how vertical velocity changes flight time.", targetDistance: 24.0, lockSpeed: true, lockDrag: true, fixedSpeed: 22, wall: null },
      { title: "Level 9: Apex Height", instruction: "⬆️ <strong>Concept:</strong> Reach a distant target while balancing range and maximum height.", targetDistance: 36.0, lockSpeed: false, lockDrag: true, fixedSpeed: 24, wall: null },
      { title: "Level 10: Air Resistance", instruction: "💨 <strong>Concept:</strong> Turn on air resistance and observe how drag shortens the trajectory.", targetDistance: 24.0, lockSpeed: true, lockDrag: false, dragMode: "on", fixedSpeed: 25, wall: null },
      { title: "Level 11: Drag Comparison", instruction: "🌬️ <strong>Concept:</strong> Compare ideal and drag-affected motion by adjusting the angle.", targetDistance: 22.0, lockSpeed: false, lockDrag: false, fixedSpeed: 25, wall: null },
      { title: "Level 12: Compensate with Speed", instruction: "🚀 <strong>Concept:</strong> Use extra launch speed to overcome air resistance.", targetDistance: 34.0, lockSpeed: false, lockDrag: false, fixedSpeed: 25, dragMode: "on", requiredDrag: true, wall: null },
      { title: "Level 13: Compensate with Angle", instruction: "🧭 <strong>Concept:</strong> Adjust angle as well as speed to recover a lost range.", targetDistance: 30.0, lockSpeed: false, lockDrag: false, fixedSpeed: 25, dragMode: "on", requiredDrag: true, minAngle: 35, maxAngle: 65, wall: null },
      { title: "Level 14: Energy Loss", instruction: "🔄 <strong>Concept:</strong> Observe how a bounce loses vertical and horizontal energy before settling.", targetDistance: 26.0, lockSpeed: false, lockDrag: true, fixedSpeed: 25, wall: null },
      { title: "Level 15: Final Trajectory", instruction: "🏆 <strong>Final Challenge:</strong> Combine angle, speed, drag, height, and range into one accurate shot.", targetDistance: 38.0, lockSpeed: false, lockDrag: false, fixedSpeed: 28, dragMode: "on", wall: { x: 24.0, height: 10.0 } },
      { title: "Level 16: Range with Drag", instruction: "🌬️ <strong>Concept:</strong> Adjust the launch to recover range lost to optional air resistance.", targetDistance: 32.0, lockSpeed: false, lockDrag: false, fixedSpeed: 25, targetTolerance: 3.2, wall: null },
      { title: "Level 17: Drag & Distance", instruction: "🎯 <strong>Concept:</strong> Tune speed and angle for a target while drag is forced on.", targetDistance: 30.0, lockSpeed: false, lockDrag: false, dragMode: "on", fixedSpeed: 24, targetTolerance: 3.0, wall: null },
      { title: "Level 18: High-Wall Clearance", instruction: "🧱 <strong>Concept:</strong> Clear a taller wall by controlling the projectile's apex within a useful angle range.", targetDistance: 46.0, lockSpeed: false, lockDrag: true, fixedSpeed: 30, minAngle: 45, maxAngle: 75, targetTolerance: 3.0, wall: { x: 22.0, height: 14.0 } },
      { title: "Level 19: Repair the Angle", instruction: "🛠️ <strong>Reverse Engineering:</strong> This launch setup is broken. Inspect the target and repair the angle while drag is active.", targetDistance: 26.0, lockSpeed: false, lockDrag: false, dragMode: "on", fixedSpeed: 25, targetTolerance: 2.8, wall: null, debugSetup: { angle: 20, speed: 25 } },
      { title: "Level 20: Speed Limit", instruction: "⚡ <strong>Concept:</strong> Reach the target with a fixed, limited launch speed.", targetDistance: 30.0, lockSpeed: true, lockDrag: true, fixedSpeed: 18, targetTolerance: 3.0, wall: null },
      { title: "Level 21: Low-Speed Precision", instruction: "🎯 <strong>Concept:</strong> Use careful angle control to make a precise low-speed shot.", targetDistance: 18.0, lockSpeed: true, lockDrag: true, fixedSpeed: 16, targetTolerance: 2.0, wall: null },
      { title: "Level 22: Bounce Trajectory", instruction: "🔄 <strong>Concept:</strong> Account for the bounce when choosing the landing path.", targetDistance: 28.0, lockSpeed: false, lockDrag: true, fixedSpeed: 26, targetTolerance: 3.0, wall: null },
      { title: "Level 23: Energy-Loss Landing", instruction: "📉 <strong>Concept:</strong> Observe how lost energy changes the final rolling distance.", targetDistance: 24.0, lockSpeed: false, lockDrag: true, fixedSpeed: 22, targetTolerance: 2.8, wall: null },
      { title: "Level 24: Repair the Trajectory", instruction: "🛠️ <strong>Reverse Engineering:</strong> A steep preset misses the target. Use the flight data to repair the trajectory.", targetDistance: 36.0, lockSpeed: false, lockDrag: true, fixedSpeed: 20, targetTolerance: 2.8, wall: null, debugSetup: { angle: 75, speed: 20 } },
      { title: "Level 25: Drag Calibration", instruction: "💨 <strong>Concept:</strong> Calibrate the same style of shot with air resistance enabled.", targetDistance: 28.0, lockSpeed: false, lockDrag: false, dragMode: "on", requiredDrag: true, fixedSpeed: 24, targetTolerance: 2.6, wall: null },
      { title: "Level 26: Wall with Air Resistance", instruction: "🧱 <strong>Concept:</strong> Clear an obstacle while compensating for air resistance and a limited angle.", targetDistance: 40.0, lockSpeed: false, lockDrag: false, dragMode: "on", requiredDrag: true, minAngle: 40, maxAngle: 75, fixedSpeed: 30, targetTolerance: 2.8, wall: { x: 20.0, height: 12.0 } },
      { title: "Level 27: Maximum Range under Drag", instruction: "🚀 <strong>Concept:</strong> Find the best range compromise when drag is always active.", targetDistance: 38.0, lockSpeed: false, lockDrag: false, dragMode: "on", requiredDrag: true, minAngle: 35, maxAngle: 55, fixedSpeed: 30, targetTolerance: 2.8, wall: null },
      { title: "Level 28: Apex vs Range", instruction: "⬆️ <strong>Concept:</strong> Balance a high apex against the need to reach the target.", targetDistance: 30.0, lockSpeed: false, lockDrag: true, minAngle: 50, maxAngle: 80, fixedSpeed: 24, targetTolerance: 2.5, wall: null },
      { title: "Level 29: Tight Accuracy", instruction: "🎯 <strong>Concept:</strong> Make a highly accurate shot inside a smaller landing zone.", targetDistance: 32.0, lockSpeed: false, lockDrag: false, fixedSpeed: 27, targetTolerance: 1.5, wall: null },
      { title: "Level 30: Debug the Final Shot", instruction: "🛠️ <strong>Final Reverse-Engineering Challenge:</strong> Diagnose the broken preset, then repair angle, speed, drag, and wall clearance.", targetDistance: 42.0, lockSpeed: false, lockDrag: false, dragMode: "on", requiredDrag: true, minAngle: 45, maxAngle: 75, fixedSpeed: 32, targetTolerance: 2.0, wall: { x: 25.0, height: 12.0 }, debugSetup: { angle: 15, speed: 32 } }
    ]; */

    // --- B. GAME STATE & PHYSICS CONSTANTS ---
    const { G, SCALE, DRAG_COEFF, RESTITUTION, GROUND_FRICTION, SUCTION_RADIUS } = PhysicsSimulation.constants;
    const ORIGIN_X = 50; // Cannon base X (pixels)
    const GROUND_Y = 280; // Ground surface Y (pixels)

    const RINGS = [               // concentric zones, metres from cup centre
      { r: 1.0, stars: 3, xp: 100, msg: "Perfect Bullseye!" },
      { r: 2.2, stars: 2, xp: 50,  msg: "Near Miss!" },
      { r: 3.5, stars: 1, xp: 25,  msg: "Close Rim Shot!" }
    ];
    window.G = G;
    window.SCALE = SCALE;
    window.GROUND_Y = GROUND_Y;
    let airResistance = false;

    let currentLevelIndex = 0;
    let angleDeg = 45;
    let speedMps = 20;
    let userXP = 100;

    let isFlying = false;
    let currentBall = null; // { x, y, vx, vy, trail: [] }
    let previousTrail = null; // Ghost trajectory of previous shot
    let missCount = 0;
    let failedAttempts = 0;
    const rewardedLevels = new Set();
    let lastReward = 0;
    let shotHistory = [];
    let physicsPrediction = null;
    const exposeState = (name, read, write) => Object.defineProperty(window, name, {
      configurable: true,
      get: read,
      set: write,
    });
    exposeState('currentLevelIndex', () => currentLevelIndex, (value) => { currentLevelIndex = value; });
    exposeState('airResistance', () => airResistance, (value) => { airResistance = value; });
    exposeState('angleDeg', () => angleDeg, (value) => { angleDeg = value; });
    exposeState('speedMps', () => speedMps, (value) => { speedMps = value; });
    exposeState('userXP', () => userXP, (value) => { userXP = value; });
    exposeState('isFlying', () => isFlying, (value) => { isFlying = value; });
    exposeState('currentBall', () => currentBall, (value) => { currentBall = value; });
    exposeState('previousTrail', () => previousTrail, (value) => { previousTrail = value; });
    exposeState('missCount', () => missCount, (value) => { missCount = value; });
    exposeState('failedAttempts', () => failedAttempts, (value) => { failedAttempts = value; });
    exposeState('lastReward', () => lastReward, (value) => { lastReward = value; });
    exposeState('shotHistory', () => shotHistory, (value) => { shotHistory = value; });
    exposeState('physicsPrediction', () => physicsPrediction, (value) => { physicsPrediction = value; });
    const persistence = createGamePersistence({
      gameId: 'physics',
      auth: window.StemGameAuth,
      progress: window.PhysicsProgress,
    });
    const updateControls = (...args) => window.updateControls(...args);
    const toggleDrag = (...args) => window.toggleDrag(...args);
    const renderShotHistory = (...args) => window.renderShotHistory(...args);
    const buildPhysicsQuestion = (...args) => window.buildPhysicsQuestion(...args);
    const physicsConceptMet = (...args) => window.physicsConceptMet(...args);
    const checkPhysicsPrediction = (...args) => window.checkPhysicsPrediction(...args);
    const showReviewPanel = (...args) => window.showReviewPanel(...args);
    const registerMiss = (...args) => window.registerMiss(...args);
    const buildReviewHint = (...args) => window.buildReviewHint(...args);
    const showReviewAnalysis = (...args) => window.showReviewAnalysis(...args);
    const unlockAfterReview = (...args) => window.unlockAfterReview(...args);
    const nudgeAngle = (...args) => window.nudgeAngle(...args);
    const nudgeSpeed = (...args) => window.nudgeSpeed(...args);
    const triggerMessage = (...args) => window.triggerMessage(...args);
    const resetShot = (...args) => window.resetShot(...args);
    const restoreLearningCheckpoint = (...args) => window.restoreLearningCheckpoint(...args);
    const changeLevel = (...args) => window.changeLevel(...args);
    const physicsLearningGate = window.PhysicsLearningGate.create();
    window.PhysicsLearningGateInstance = physicsLearningGate;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // --- C. RENDER CANVAS WORLD ---
    const drawScene = createPhysicsSceneRenderer({
      canvas,
      levels: LEVELS,
      rings: RINGS,
      originX: ORIGIN_X,
      groundY: GROUND_Y,
      scale: SCALE,
      getLevelIndex: () => currentLevelIndex,
      getAngle: () => angleDeg,
      getPreviousTrail: () => previousTrail,
      getCurrentBall: () => currentBall,
    });
    window.drawScene = drawScene;
    drawScene();

    function fireCannon() {
      if (isFlying || physicsLearningGate.isLocked()) return;
      if (window.StemGameAuth && !window.StemGameAuth.allowLevel(currentLevelIndex + 1)) return;
      isFlying = true;
      document.getElementById('btnFire').disabled = true;
      triggerMessage("Ball in flight...", "");

      currentBall = PhysicsSimulation.createBall({
        angleDeg,
        speedMps,
        originX: ORIGIN_X,
        groundY: GROUND_Y,
        scale: SCALE,
      });

      // Use real frame time so the projectile does not slow down on a busy or
      // lower-refresh display. The multiplier preserves the previous brisk feel.
      const simulationRate = 1.35;
      let previousTimestamp = null;
      const useDrag = airResistance; // fixed for the whole flight
      const lvl = LEVELS[currentLevelIndex];

      function physicsLoop(timestamp) {
        const frameSeconds = previousTimestamp === null
          ? 1 / 60
          : Math.min((timestamp - previousTimestamp) / 1000, 0.05);
        previousTimestamp = timestamp;
        const dt = frameSeconds * simulationRate;
        PhysicsSimulation.advance(currentBall, {
          dt,
          useDrag,
          gravity: G,
          scale: SCALE,
          dragCoefficient: DRAG_COEFF,
        });

        // 1. Check Wall Collision (Level 3)
        if (lvl.wall) {
          const wallPx = ORIGIN_X + lvl.wall.x * SCALE;
          const wallTopY = GROUND_Y - lvl.wall.height * SCALE;
          if (Math.abs(currentBall.x - wallPx) < 7 && currentBall.y >= wallTopY) {
            triggerMessage("💥 Boom! Smashed into the wall obstacle. Try an angle >60° to arc over it!", "error");
            registerMiss((currentBall.x - ORIGIN_X) / SCALE);
            if (window.StemGameAuth) {
              persistence.recordMistake(currentLevelIndex, "wall_collision", {
                angle: angleDeg, speed: speedMps, wall: lvl.wall,
                time: currentBall.elapsedTime, apex: (GROUND_Y - currentBall.maxY) / SCALE,
                distance: (currentBall.x - ORIGIN_X) / SCALE
              });
            }
            if (window.StemTutor) window.StemTutor.show("physics", "wall_collision");
            endShot(false);
            return;
          }
        }

        // 2. Check Ground Hit
        if (currentBall.y >= GROUND_Y) {
          currentBall.y = GROUND_Y;
          const finalMeters = (currentBall.x - ORIGIN_X) / SCALE;
          document.getElementById('lastShotDistanceText').textContent = `${finalMeters.toFixed(1)} meters`;

          // Evaluate bullseye rings (within 3.5m of hole); suction captures within 1.2m
          const targetDist = lvl.targetDistance;
          const delta = Math.abs(finalMeters - targetDist);
          const captured = delta <= SUCTION_RADIUS;
          const tolerance = lvl.targetTolerance ?? 3.5;
          const ring = PhysicsSimulation.ringForDistance(delta, RINGS, tolerance);

          if (ring) {
            if (!physicsConceptMet()) {
              registerMiss(finalMeters);
              if (window.StemGameAuth) {
                persistence.recordMistake(currentLevelIndex, 'concept_not_applied', {
                  requiredDrag: lvl.requiredDrag, minAngle: lvl.minAngle, maxAngle: lvl.maxAngle,
                  angle: angleDeg, airResistance
                });
              }
              triggerMessage('Target reached, but the level constraint was not satisfied. Adjust the setup and try again.', 'error');
              endShot(false);
              return;
            }
            const penaltySteps = Math.floor(failedAttempts / 3);
            const reward = rewardedLevels.has(currentLevelIndex) ? 0 : Math.max(10, Math.round(ring.xp * Math.pow(0.75, penaltySteps)));
            lastReward = reward;
            triggerMessage(`🎯 ${ring.msg} Landed at ${finalMeters.toFixed(1)}m. Confirming result...`, "success");
            settleOnGreen(captured, () => {
              showVictoryModal(finalMeters, ring).finally(() => endShot(true));
            });
          } else {
            const shortOrLong = finalMeters < targetDist ? "short" : "long";
            registerMiss(finalMeters);
            if (window.StemGameAuth) {
              persistence.recordMistake(currentLevelIndex, "shot_missed", {
                distance: finalMeters, target: targetDist, angle: angleDeg, speed: speedMps,
                time: currentBall.elapsedTime, apex: (GROUND_Y - currentBall.maxY) / SCALE
              });
            }
            if (window.StemTutor) window.StemTutor.show("physics", "shot_missed");
            triggerMessage(`Missed! Landed ${Math.abs(targetDist - finalMeters).toFixed(1)}m ${shortOrLong}. Adjust and try again!`, "error");
            endShot(false);
          }
          return;
        }

        drawScene();
        requestAnimationFrame(physicsLoop);
      }

      requestAnimationFrame(physicsLoop);
    }

    // Ball hops/rolls after landing near the hole; captured balls get pulled into the cup
    function settleOnGreen(captured, onDone) {
      const b = currentBall;
      const cupX = ORIGIN_X + LEVELS[currentLevelIndex].targetDistance * SCALE;
      (function step() {
        if (captured) {
          b.x += (cupX - b.x) * 0.25; // hole gravity
          b.y += 0.8;                 // golf-drop
          if (b.y >= GROUND_Y + 8) return onDone();
        } else {
          b.x += b.vx * 0.025;
          b.y += b.vy * 0.025;
          b.vy += G * SCALE * 0.025;
          if (b.y >= GROUND_Y) {
            b.y = GROUND_Y;
            if (b.vy < 20) return onDone(); // too slow to bounce: settled
            b.vy = -b.vy * RESTITUTION;
            b.vx *= GROUND_FRICTION;
          }
        }
        drawScene();
        requestAnimationFrame(step);
      })();
    }

    function endShot(isWin) {
      isFlying = false;
      document.getElementById('btnFire').disabled = physicsLearningGate.isLocked();
      previousTrail = [...currentBall.trail]; // save ghost trail
      drawScene();
      if (!isWin && window.StemGameAuth) {
        persistence.submitAttempt(currentLevelIndex, "miss", "trajectory_miss", {
          distance: currentBall ? (currentBall.x - ORIGIN_X) / SCALE : null,
          angle: angleDeg, speed: speedMps, airResistance,
          flightTime: currentBall?.elapsedTime || 0,
          apex: currentBall ? (GROUND_Y - currentBall.maxY) / SCALE : 0
        });
      }
    }

    // --- F. LEVEL MANAGEMENT & MODALS ---
    async function showVictoryModal(dist, ring) {
      const modal = document.getElementById('victoryModal');
      if (window.StemGameAuth) {
        const attempt = await persistence.submitAttempt(currentLevelIndex, "success", null, {
          distance: dist, stars: ring.stars, angle: angleDeg, speed: speedMps,
          airResistance, flightTime: currentBall?.elapsedTime || 0,
          apex: currentBall ? (GROUND_Y - currentBall.maxY) / SCALE : 0
        });
        if (!attempt?.ok || attempt.data?.server_result !== "success") {
          triggerMessage('The server could not confirm this trajectory. Please try the shot again.', 'error');
          return;
        }
        const achievement = await persistence.recordAchievement(currentLevelIndex);
        if (!achievement?.ok) {
          triggerMessage('The result was confirmed, but the reward could not be saved. Please refresh and retry.', 'error');
          return;
        }
        const serverStars = achievement.data?.stars || ring.stars;
        const serverXp = achievement.data?.awarded ? (achievement.data.xp || 0) : 0;
        lastReward = serverXp;
        if (achievement.data?.awarded && !rewardedLevels.has(currentLevelIndex)) {
          rewardedLevels.add(currentLevelIndex);
          userXP += serverXp;
          document.getElementById('xpCount').textContent = `${userXP} XP`;
        }
        persistence.recordMistake(currentLevelIndex, 'level_completed', { distance: dist });
        ring = { ...ring, stars: serverStars };
      }
      document.getElementById('modalTitle').textContent = `${LEVELS[currentLevelIndex].title} Passed!`;
      document.getElementById('modalDesc').innerHTML = `${"⭐".repeat(ring.stars)}<br><strong>${ring.msg}</strong> Landed at <strong>${dist.toFixed(1)} meters</strong>! You discovered the exact kinematic relationship required for this target.`;
      modal.style.display = 'flex';
    }

    function closeModalAndNext() {
      document.getElementById('victoryModal').style.display = 'none';
      if (currentLevelIndex < LEVELS.length - 1) {
        changeLevel(currentLevelIndex + 1);
        document.getElementById('levelPicker').value = currentLevelIndex;
      } else {
        alert("🎉 Congratulations! You have completed all 15 STEM Kinematics levels!");
        resetShot();
      }
    }

    window.PhysicsModule = window.StemGameModule.create({
      gameId: 'physics',
      levels: LEVELS,
      loadLevel(levelNumber) {
        changeLevel(levelNumber - 1);
      },
      reset() {
        resetShot();
      },
      getAttemptPayload() {
        return {
          angle: angleDeg,
          speed: speedMps,
          drag: airResistance,
          distance: currentBall ? (currentBall.x - ORIGIN_X) / SCALE : null,
          flightTime: currentBall?.elapsedTime || 0,
          apex: currentBall ? (GROUND_Y - currentBall.maxY) / SCALE : 0,
        };
      },
      renderFeedback(feedback) {
        if (feedback?.message) triggerMessage(feedback.message, feedback.statusClass || '');
      },
    });

    // Initialize on window load
    window.onload = () => {
      if (window.StemGameAuth) {
        window.StemGameAuth.init("physics", { requireSession: true }).then(() => window.PhysicsModule.loadLevel(1));
      } else {
        window.PhysicsModule.loadLevel(1);
      }
    };

  bindPhysicsEvents({ changeLevel, nudgeAngle, updateControls, nudgeSpeed, toggleDrag, unlockAfterReview, fireCannon, resetShot, closeModalAndNext, checkPhysicsPrediction });
