// RoboMaze program editor, learning gate, and level UI.
function addCommand(type, count = 1) {
  if (isExecuting || learningLocked || currentLevelIndex >= 19) return;
  studentProgram.push({ type, count });
  renderProgramWorkspace();
  updatePythonCode();
}

function addLoopPrompt() {
  if (isExecuting || learningLocked || currentLevelIndex >= 19) return;
  const times = prompt("How many times should the robot repeat moving forward? (2 to 5)", "3");
  const count = parseInt(times, 10);
  if (count >= 2 && count <= 5) {
    studentProgram.push({ type: 'REPEAT_FORWARD', count });
    renderProgramWorkspace();
    updatePythonCode();
  }
}

function removeCommand(index) {
  if (isExecuting || learningLocked || currentLevelIndex >= 19) return;
  studentProgram.splice(index, 1);
  renderProgramWorkspace();
  updatePythonCode();
}

function switchView(view) {
  if (currentLevelIndex >= 19) view = 'python';
  activeView = view;
  document.getElementById('tabBlocks').className = `tab-btn ${view === 'blocks' ? 'active' : ''}`;
  document.getElementById('tabPython').className = `tab-btn ${view === 'python' ? 'active' : ''}`;
  document.getElementById('programArea').style.display = view === 'blocks' ? 'flex' : 'none';
  document.getElementById('pythonArea').style.display = view === 'python' ? 'flex' : 'none';
}

function updateProgrammingMode() {
  const textMode = currentLevelIndex >= 19;
  document.querySelectorAll('.toolbox .btn-block').forEach((button) => {
    button.disabled = textMode || learningLocked;
  });
  document.getElementById('pythonEditor').style.display = textMode ? 'block' : 'none';
  document.getElementById('pythonEditor').disabled = learningLocked;
  document.getElementById('pythonCodeBox').style.display = textMode ? 'none' : 'block';
  if (textMode) switchView('python');
}

function setLearningLocked(locked) {
  learningLocked = locked;
  document.getElementById('btnRun').disabled = locked;
  document.getElementById('btnStep').disabled = locked;
  updateProgrammingMode();
}

function renderProgramWorkspace() {
  const area = document.getElementById('programArea');
  if (studentProgram.length === 0) {
    area.innerHTML = `<div class="program-empty">Your program is empty.<br>Click blocks above to add commands!</div>`;
    return;
  }

  area.innerHTML = studentProgram.map((command, index) => {
    const labels = {
      FORWARD: ['⬆️ Move Forward', ''],
      TURN_LEFT: ['↺ Turn Left', ''],
      TURN_RIGHT: ['↻ Turn Right', ''],
      REPEAT_FORWARD: [`🔁 Repeat ${command.count}x: [ Move Forward ]`, 'loop-item'],
      IF_WALL_RIGHT: ['❓ If Wall Ahead ➔ Turn Right', 'cond-item'],
      IF_WALL_LEFT: ['❓ If Wall Ahead ➔ Turn Left', 'cond-item'],
      IF_PATH_CLEAR: ['✅ If Path Clear ➔ Move Forward', 'cond-item'],
    };
    const [label, extraClass] = labels[command.type] || ['', ''];
    return `
      <div class="command-item ${extraClass}" id="cmd-${index}">
        <span>${index + 1}. ${label}</span>
        <button class="cmd-del" type="button" data-remove-command="${index}" aria-label="Remove command ${index + 1}">✖</button>
      </div>
    `;
  }).join('');
}

function updatePythonCode() {
  if (currentLevelIndex >= 19) return;
  const box = document.getElementById('pythonCodeBox');
  if (studentProgram.length === 0) {
    box.innerHTML = '<span class="py-comment"># Your program is empty.\n# Click blocks above to generate live Python code!</span>';
    return;
  }

  const lines = ['<span class="py-comment"># RoboLogic STEM Autonomous Program</span>'];
  studentProgram.forEach((command) => {
    if (command.type === 'FORWARD') lines.push('<span class="py-func">robot</span>.<span class="py-method">move_forward</span>()');
    else if (command.type === 'TURN_LEFT') lines.push('<span class="py-func">robot</span>.<span class="py-method">turn_left</span>()');
    else if (command.type === 'TURN_RIGHT') lines.push('<span class="py-func">robot</span>.<span class="py-method">turn_right</span>()');
    else if (command.type === 'REPEAT_FORWARD') {
      lines.push(`<span class="py-kwd">for</span> _ <span class="py-kwd">in</span> <span class="py-kwd">range</span>(${command.count}):`);
      lines.push('    <span class="py-func">robot</span>.<span class="py-method">move_forward</span>()');
    } else if (command.type === 'IF_WALL_RIGHT') {
      lines.push('<span class="py-kwd">if</span> <span class="py-func">robot</span>.<span class="py-method">is_wall_ahead</span>():');
      lines.push('    <span class="py-func">robot</span>.<span class="py-method">turn_right</span>()');
    } else if (command.type === 'IF_WALL_LEFT') {
      lines.push('<span class="py-kwd">if</span> <span class="py-func">robot</span>.<span class="py-method">is_wall_ahead</span>():');
      lines.push('    <span class="py-func">robot</span>.<span class="py-method">turn_left</span>()');
    } else if (command.type === 'IF_PATH_CLEAR') {
      lines.push('<span class="py-kwd">if</span> <span class="py-func">robot</span>.<span class="py-method">is_path_clear</span>():');
      lines.push('    <span class="py-func">robot</span>.<span class="py-method">move_forward</span>()');
    }
  });

  box.innerHTML = lines.map((line, index) => `
    <div class="py-line" id="py-line-${index}">
      <span class="py-num">${(index + 1).toString().padStart(2, ' ')}</span> ${line}
    </div>
  `).join('');
}

function loadPythonProgram() {
  if (currentLevelIndex < 19) return true;
  const lines = document.getElementById('pythonEditor').value.split('\n');
  const program = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#')) continue;
    if (line === 'robot.move_forward()') program.push({ type: 'FORWARD', count: 1 });
    else if (line === 'robot.turn_left()') program.push({ type: 'TURN_LEFT', count: 1 });
    else if (line === 'robot.turn_right()') program.push({ type: 'TURN_RIGHT', count: 1 });
    else {
      const loop = line.match(/^for _ in range\(([2-5])\):$/);
      const condition = line.match(/^if robot\.(is_wall_ahead|is_path_clear)\(\):$/);
      if (!loop && !condition) {
        triggerMessage('Use the supported robot commands shown in the Python panel.', 'error');
        return false;
      }
      const next = lines[++index]?.trim();
      if (loop && next === 'robot.move_forward()') program.push({ type: 'REPEAT_FORWARD', count: Number(loop[1]) });
      else if (condition?.[1] === 'is_wall_ahead' && next === 'robot.turn_right()') program.push({ type: 'IF_WALL_RIGHT', count: 1 });
      else if (condition?.[1] === 'is_wall_ahead' && next === 'robot.turn_left()') program.push({ type: 'IF_WALL_LEFT', count: 1 });
      else if (condition?.[1] === 'is_path_clear' && next === 'robot.move_forward()') program.push({ type: 'IF_PATH_CLEAR', count: 1 });
      else {
        triggerMessage('Each loop or condition needs one indented command.', 'error');
        return false;
      }
    }
  }
  if (!program.length) {
    triggerMessage('Type at least one Python command before running.', 'error');
    return false;
  }
  studentProgram = program;
  return true;
}

function validateProgramRules() {
  const level = LEVELS[currentLevelIndex];
  const maxBlocks = level.maxBlocks || (currentLevelIndex >= 10 ? 12 : Infinity);
  if (studentProgram.length > maxBlocks) {
    triggerMessage(`This level allows at most ${maxBlocks} blocks. Simplify your program.`, 'error');
    return false;
  }
  return true;
}

function conceptRequirementMet() {
  const required = LEVELS[currentLevelIndex].requiredBlock;
  return !required || studentProgram.some((command) => command.type === required);
}

function showLearningGate(category) {
  const question = category === 'wall_collision'
    ? 'The robot hit a wall. What should you inspect before trying again?'
    : category === 'concept_not_applied'
      ? 'The robot reached the goal, but the level concept was not used. What should you change?'
      : 'The program ended without reaching the goal. What should you do next?';
  const correct = category === 'wall_collision' ? 'inspect_direction' : category === 'concept_not_applied' ? 'use_required_concept' : 'inspect_route';
  const options = category === 'wall_collision'
    ? [['inspect_direction', 'Inspect the next movement and the robot\'s orientation.'], ['add_random', 'Add random commands until it works.'], ['ignore_wall', 'Keep the same movement and ignore the wall.']]
    : category === 'concept_not_applied'
      ? [['use_required_concept', 'Revise the program to use the required concept.'], ['keep_program', 'Keep the same program because it reached the goal.'], ['add_random', 'Add unrelated blocks without checking the concept.']]
      : [['inspect_route', 'Inspect the route and choose the needed loop or condition.'], ['repeat_same', 'Run the unchanged program again.'], ['remove_all', 'Delete the whole program without inspecting it.']];
  document.getElementById('mazeQuestion').textContent = question;
  document.getElementById('mazeOptions').innerHTML = options.map(([value, label]) =>
    `<button class="learning-option" type="button" data-learning-selected="${value}" data-learning-correct="${correct}">${label}</button>`
  ).join('');
  document.getElementById('mazeFeedback').textContent = '';
  document.getElementById('learningGate').style.display = 'block';
  setLearningLocked(true);
  triggerMessage('Three failed runs. Review the program before continuing.', 'error');
}

function checkMazePrediction(selected, correct) {
  const feedback = document.getElementById('mazeFeedback');
  if (selected !== correct) {
    feedback.textContent = 'Use the failure message to decide what part of the program needs inspection.';
    return;
  }
  feedback.textContent = 'Good reasoning. Inspect the route, then edit and run deliberately.';
  document.querySelectorAll('#mazeOptions .learning-option').forEach((button) => { button.disabled = true; });
  learningFailures = 0;
  document.getElementById('learningGate').style.display = 'none';
  setLearningLocked(false);
  if (window.StemGameAuth) RoboMazeAdapter.recordMistake(currentLevelIndex, 'reflection_completed', { selected });
}

function registerLearningFailure(category) {
  learningFailures += 1;
  failedAttempts += 1;
  if (learningFailures >= 3) showLearningGate(category);
}

async function restoreLearningCheckpoint() {
  const state = await RoboMazeAdapter.restoreCheckpoint(currentLevelIndex);
  if (!state || state.failures.length < 3) return;
  learningFailures = 3;
  showLearningGate(state.failures[state.failures.length - 1].category);
}

function highlightBlock(index) {
  clearHighlights();
  const element = document.getElementById(`cmd-${index}`);
  if (element) element.classList.add('active-executing');
}

function clearHighlights() {
  document.querySelectorAll('.command-item').forEach((element) => element.classList.remove('active-executing'));
}

function triggerMessage(text, statusClass) {
  const message = document.getElementById('statusMessage');
  message.textContent = text;
  message.className = `status-toast ${statusClass ? `toast-${statusClass}` : ''}`;
}

function enableControls() {
  document.getElementById('btnRun').disabled = learningLocked;
  document.getElementById('btnStep').disabled = learningLocked;
}

function resetLevel() {
  isExecuting = false;
  currentStepIndex = 0;
  clearHighlights();
  enableControls();
  const level = LEVELS[currentLevelIndex];
  robot = { ...level.start };
  drawGame();
  triggerMessage("Robot reset to start tile. Ready to run!", "");
}

function changeLevel(index) {
  const nextIndex = parseInt(index, 10);
  if (!RoboMazeAdapter.isLevelUnlocked(nextIndex)) {
    document.getElementById('levelPicker').value = currentLevelIndex;
    return;
  }
  currentLevelIndex = nextIndex;
  studentProgram = [];
  learningFailures = 0;
  failedAttempts = 0;
  lastProgramSignature = '';
  document.getElementById('learningGate').style.display = 'none';
  setLearningLocked(false);
  renderProgramWorkspace();
  updatePythonCode();
  document.getElementById('pythonEditor').value = '';
  updateProgrammingMode();
  const level = LEVELS[currentLevelIndex];
  document.getElementById('levelTitle').textContent = level.title;
  document.getElementById('levelInstruction').innerHTML = level.instruction;
  resetLevel();
  restoreLearningCheckpoint();
}
