// PhysicsSim controls, review UI, and level lifecycle.
function updateControls() {
  angleDeg = parseInt(document.getElementById('angleSlider').value, 10);
  const level = LEVELS[currentLevelIndex];

  if (level.lockSpeed) {
    speedMps = level.fixedSpeed;
    document.getElementById('speedSlider').value = speedMps;
    document.getElementById('speedSlider').disabled = true;
    document.getElementById('btnSpeedDown').disabled = true;
    document.getElementById('btnSpeedUp').disabled = true;
    document.getElementById('speedSubtext').textContent = 'Speed locked at 20 m/s to isolate the angle effect.';
  } else {
    speedMps = parseInt(document.getElementById('speedSlider').value, 10);
    document.getElementById('speedSlider').disabled = false;
    document.getElementById('btnSpeedDown').disabled = false;
    document.getElementById('btnSpeedUp').disabled = false;
    document.getElementById('speedSubtext').textContent = 'Both angle and speed are unlocked.';
  }

  if (level.dragMode === 'on') {
    document.getElementById('dragToggle').checked = true;
    toggleDrag(true);
  } else if (level.lockDrag) {
    document.getElementById('dragToggle').checked = false;
    toggleDrag(false);
  }
  document.getElementById('dragGroup').style.display = (level.lockDrag || level.dragMode === 'on') ? 'none' : '';
  document.getElementById('angleBadge').textContent = `${angleDeg}°`;
  document.getElementById('speedBadge').textContent = `${speedMps} m/s`;

  const radians = (angleDeg * Math.PI) / 180;
  const verticalSpeed = speedMps * Math.sin(radians);
  document.getElementById('flightTimeText').textContent = `${((2 * verticalSpeed) / G).toFixed(2)} sec`;
  document.getElementById('apexHeightText').textContent = `${((verticalSpeed ** 2) / (2 * G)).toFixed(1)} meters`;
  drawScene();
}

function toggleDrag(on) {
  airResistance = on;
  document.getElementById('dragBadge').textContent = on ? 'ON' : 'OFF';
}

function setPhysicsControlsLocked(locked) {
  reflectionLocked = locked;
  ['angleSlider', 'speedSlider', 'dragToggle', 'btnSpeedDown', 'btnSpeedUp', 'btnFire']
    .forEach((id) => { document.getElementById(id).disabled = locked; });
  document.querySelectorAll('.btn-nudge').forEach((button) => { button.disabled = locked; });
}

function renderShotHistory() {
  document.getElementById('shotHistoryBody').innerHTML = shotHistory.map((shot, index) => `
    <tr><td>${index + 1}</td><td>${shot.time.toFixed(2)}s</td>
    <td>${shot.apex.toFixed(1)}m</td><td>${shot.distance.toFixed(1)}m</td></tr>
  `).join('');
}

function buildPhysicsQuestion() {
  const level = LEVELS[currentLevelIndex];
  const target = level.targetDistance;
  const average = shotHistory.reduce((sum, shot) => sum + shot.distance, 0) / Math.max(1, shotHistory.length);
  const short = average < target - 2;
  const long = average > target + 2;
  const distanceText = short ? 'short of' : long ? 'past' : 'close to';
  const dragText = airResistance ? ' Air resistance is active, so expect some range loss.' : '';
  let correct;
  let correctLabel;
  let alternateLabel;
  if (short) {
    correct = level.lockSpeed ? 'raise_angle' : 'raise_speed';
    correctLabel = level.lockSpeed ? 'Increase the launch angle while keeping speed fixed.' : 'Increase the launch speed while keeping the angle unchanged.';
    alternateLabel = level.lockSpeed ? 'Increase speed, even though this level fixes it.' : 'Increase the launch angle and speed together.';
  } else if (long) {
    correct = level.lockSpeed ? 'lower_angle' : 'lower_speed';
    correctLabel = level.lockSpeed ? 'Reduce the launch angle while keeping speed fixed.' : 'Reduce the launch speed while keeping the angle unchanged.';
    alternateLabel = level.lockSpeed ? 'Reduce speed, even though this level fixes it.' : 'Reduce the launch angle and speed together.';
  } else {
    correct = 'small_change';
    correctLabel = 'Change one control slightly, then compare the next distance.';
    alternateLabel = 'Change both controls at once so the result is harder to explain.';
  }
  physicsPrediction = { correct, explanation: `Your shots are ${distanceText} the target. Use one control deliberately and compare the result.${dragText}` };
  document.getElementById('physicsQuestion').textContent = `Your shots are ${distanceText} the target. Which specific adjustment should you test next?${dragText}`;
  const options = [
    [correct, correctLabel],
    ['opposite_control', alternateLabel],
    ['inspect_data', 'Read the data again but make no adjustment at all.'],
    ['random_change', 'Change angle and speed randomly until the target is reached.'],
  ];
  document.getElementById('physicsOptions').innerHTML = options.map(([value, label]) =>
    `<button class="learning-option" type="button" data-learning-selected="${value}" data-learning-correct="${correct}">${label}</button>`
  ).join('');
}

function physicsConceptMet() {
  const level = LEVELS[currentLevelIndex];
  return (!level.requiredDrag || airResistance)
    && (level.minAngle === undefined || angleDeg >= level.minAngle)
    && (level.maxAngle === undefined || angleDeg <= level.maxAngle);
}

function checkPhysicsPrediction(selected, correct) {
  const feedback = document.getElementById('physicsFeedback');
  if (selected !== correct) {
    feedback.textContent = physicsPrediction?.explanation || 'Compare the distance pattern with the target, then choose one deliberate control change.';
    return;
  }
  feedback.textContent = 'Good reasoning. Now make a deliberate adjustment.';
  document.getElementById('physicsUnlock').disabled = false;
  document.querySelectorAll('#physicsOptions .learning-option').forEach((button) => { button.disabled = true; });
  if (window.StemGameAuth) PhysicsAdapter.recordMistake(currentLevelIndex, 'prediction_completed', { selected });
}

function showReviewPanel(restore = false) {
  renderShotHistory();
  document.getElementById('reviewPanel').style.display = 'grid';
  setPhysicsControlsLocked(true);
  buildPhysicsQuestion();
  document.getElementById('physicsFeedback').textContent = '';
  document.getElementById('physicsUnlock').disabled = true;
  document.getElementById('reviewHint').textContent = buildReviewHint();
  if (!restore) showReviewAnalysis();
  triggerMessage('Three misses. Study the data and make a prediction.', 'error');
}

function registerMiss(distance) {
  shotHistory.push({
    time: currentBall.elapsedTime,
    apex: (GROUND_Y - currentBall.maxY) / SCALE,
    distance,
  });
  missCount += 1;
  failedAttempts += 1;
  document.getElementById('attemptsRemainingText').textContent = Math.max(0, 3 - missCount);
  if (missCount >= 3) showReviewPanel();
}

function buildReviewHint() {
  const level = LEVELS[currentLevelIndex];
  const target = level.targetDistance;
  const averageDistance = shotHistory.reduce((sum, shot) => sum + shot.distance, 0) / shotHistory.length;
  const distanceGap = target - averageDistance;
  let hint = distanceGap > 2
    ? `Your shots are landing about ${distanceGap.toFixed(1)}m short. ${level.lockSpeed ? 'Test a higher launch angle while keeping speed fixed.' : 'Test a higher launch speed while keeping the angle unchanged.'}`
    : distanceGap < -2
      ? `Your shots are landing about ${Math.abs(distanceGap).toFixed(1)}m long. ${level.lockSpeed ? 'Test a lower launch angle while keeping speed fixed.' : 'Test a lower launch speed while keeping the angle unchanged.'}`
      : 'Your average distance is close to the target. Change one control slightly and compare the next result.';
  if (airResistance) hint += ' Air resistance is active, so it is reducing the forward distance.';
  else if (angleDeg >= 60) hint += ' Your high angle increases flight time and apex, but gives less forward motion.';
  else if (angleDeg <= 30) hint += ' Your low angle gives more forward motion but less height and flight time.';
  return hint;
}

function showReviewAnalysis() {
  document.getElementById('reviewHint').textContent = buildReviewHint();
  if (!window.StemGameAuth) return;
  PhysicsAdapter.analyzeMistake(currentLevelIndex, 'three_shot_review', {
    target: LEVELS[currentLevelIndex].targetDistance,
    angle: angleDeg,
    speed: speedMps,
    airResistance,
    shots: shotHistory,
  }).then((insight) => {
    if (!insight) return;
    const message = insight.hint || insight.explanation;
    if (message) document.getElementById('reviewHint').textContent = message;
  });
}

function unlockAfterReview() {
  missCount = 0;
  shotHistory = [];
  document.getElementById('attemptsRemainingText').textContent = '3';
  document.getElementById('reviewPanel').style.display = 'none';
  setPhysicsControlsLocked(false);
  updateControls();
  triggerMessage('Tutor feedback reviewed. Adjust the launch and try again!', 'success');
  if (window.StemGameAuth) PhysicsAdapter.recordMistake(currentLevelIndex, 'reflection_completed', { reviewed: true });
}

function nudgeAngle(delta) {
  if (isFlying) return;
  const element = document.getElementById('angleSlider');
  element.value = Math.max(5, Math.min(85, parseInt(element.value, 10) + delta));
  updateControls();
}

function nudgeSpeed(delta) {
  if (isFlying || LEVELS[currentLevelIndex].lockSpeed) return;
  const element = document.getElementById('speedSlider');
  element.value = Math.max(10, Math.min(35, parseInt(element.value, 10) + delta));
  updateControls();
}

function triggerMessage(text, statusClass) {
  const message = document.getElementById('statusMessage');
  message.textContent = text;
  message.className = `status-toast ${statusClass ? `toast-${statusClass}` : ''}`;
}

function resetShot() {
  currentBall = null;
  previousTrail = null;
  document.getElementById('lastShotDistanceText').textContent = '---';
  drawScene();
  triggerMessage('Trajectory cleared. Adjust controls and fire!', '');
}

async function restoreLearningCheckpoint() {
  const state = await PhysicsAdapter.restoreCheckpoint(currentLevelIndex);
  if (!state || state.failures.length < 3) return;
  shotHistory = state.failures.slice(-3).map((event) => {
    const details = event.details || {};
    return { time: Number(details.time || 0), apex: Number(details.apex || 0), distance: Number(details.distance || 0) };
  });
  missCount = 3;
  document.getElementById('attemptsRemainingText').textContent = '0';
  showReviewPanel(true);
}

function changeLevel(index) {
  const nextIndex = parseInt(index, 10);
  if (!PhysicsAdapter.isLevelUnlocked(nextIndex)) {
    document.getElementById('levelPicker').value = currentLevelIndex;
    return;
  }
  currentLevelIndex = nextIndex;
  const level = LEVELS[currentLevelIndex];
  if (level.debugSetup) {
    document.getElementById('angleSlider').value = level.debugSetup.angle;
    document.getElementById('speedSlider').value = level.debugSetup.speed;
    if (typeof level.debugSetup.drag === 'boolean') document.getElementById('dragToggle').checked = level.debugSetup.drag;
  }
  document.getElementById('levelTitle').textContent = level.title;
  document.getElementById('levelInstruction').innerHTML = level.instruction;
  missCount = 0;
  failedAttempts = 0;
  lastReward = 0;
  reflectionLocked = false;
  shotHistory = [];
  document.getElementById('attemptsRemainingText').textContent = '3';
  document.getElementById('reviewPanel').style.display = 'none';
  setPhysicsControlsLocked(false);
  document.getElementById('targetDistanceText').textContent = `${level.targetDistance.toFixed(1)} meters`;
  resetShot();
  updateControls();
  restoreLearningCheckpoint();
}
