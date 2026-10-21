import { LEVELS } from './levels.js';
import { RoboMazeSimulation } from './simulation.js';
import { createRoboMazeRenderer } from './renderer.js';
import { bindRoboMazeEvents } from './events.js';
import { createGamePersistence } from '../js/game-persistence.js';
import { loadLatestCreatorLevel, submitCreatorAttempt } from './creator/creator-api.js';

// --- B. GAME STATE VARIABLES ---
    let currentLevelIndex = 0;
    let robot = { x: 1, y: 1, dir: 1 };
    let studentProgram = []; // Array of command objects: { type, count }
    let isExecuting = false;
    let currentStepIndex = 0;
    let userXP = 100;
    let activeView = 'blocks'; // 'blocks' or 'python'
    let learningLocked = false;
    let lastProgramSignature = '';
    const rewardedLevels = new Set();
    let lastReward = 0;
    let creatorMode = false;
    let creatorLevel = null;
    const runtimeLevels = [...LEVELS];
    window.LEVELS = runtimeLevels;
    window.RoboMazeCreatorMode = { isActive: () => creatorMode };
    const persistence = createGamePersistence({
      gameId: 'robo_maze',
      auth: window.StemGameAuth,
      progress: window.RoboMazeProgress,
    });
    const submitAttempt = (levelIndex, outcome, category, details) => creatorMode
      ? submitCreatorAttempt(creatorLevel.id, details.program || studentProgram)
      : persistence.submitAttempt(levelIndex, outcome, category, details);
    const recordMistake = (levelIndex, category, details) => creatorMode
      ? Promise.resolve({ ok: true })
      : persistence.recordMistake(levelIndex, category, details);
    const analyzeMistake = (levelIndex, category, details) => creatorMode
      ? Promise.resolve(null)
      : persistence.analyzeMistake(levelIndex, category, details);
    const recordAchievement = (levelIndex) => creatorMode
      ? Promise.resolve({ ok: true, data: { stars: 3, xp: 0, awarded: false } })
      : persistence.recordAchievement(levelIndex);

    // ui.js is still a classic script, so expose its shared state explicitly.
    const exposeState = (name, read, write) => Object.defineProperty(window, name, {
      configurable: true,
      get: read,
      set: write,
    });
    exposeState('currentLevelIndex', () => currentLevelIndex, (value) => { currentLevelIndex = value; });
    exposeState('robot', () => robot, (value) => { robot = value; });
    exposeState('studentProgram', () => studentProgram, (value) => { studentProgram = value; });
    exposeState('isExecuting', () => isExecuting, (value) => { isExecuting = value; });
    exposeState('currentStepIndex', () => currentStepIndex, (value) => { currentStepIndex = value; });
    exposeState('activeView', () => activeView, (value) => { activeView = value; });
    exposeState('learningLocked', () => learningLocked, (value) => { learningLocked = value; });
    exposeState('lastProgramSignature', () => lastProgramSignature, (value) => { lastProgramSignature = value; });
    const triggerMessage = (...args) => window.triggerMessage(...args);
    const updateProgrammingMode = (...args) => window.updateProgrammingMode(...args);
    const loadPythonProgram = (...args) => window.loadPythonProgram(...args);
    const validateProgramRules = (...args) => window.validateProgramRules(...args);
    const conceptRequirementMet = (...args) => window.conceptRequirementMet(...args);
    const highlightBlock = (...args) => window.highlightBlock(...args);
    const clearHighlights = (...args) => window.clearHighlights(...args);
    const enableControls = (...args) => window.enableControls(...args);
    const resetLevel = (...args) => window.resetLevel(...args);
    const changeLevel = (...args) => window.changeLevel(...args);
    const learningGate = window.RoboMazeLearningGate.create({
      getLevel: () => runtimeLevels[currentLevelIndex],
      setLocked(locked) {
        learningLocked = locked;
        updateProgrammingMode();
      },
      triggerMessage,
      onReflection(selected) {
        if (window.StemGameAuth) recordMistake(currentLevelIndex, 'reflection_completed', { selected });
      },
    });
    window.RoboMazeLearningGateInstance = learningGate;

    const canvas = document.getElementById('gameCanvas');
    const drawGame = createRoboMazeRenderer({
      canvas,
      levels: runtimeLevels,
      getLevelIndex: () => currentLevelIndex,
      getRobot: () => robot,
    });
    window.drawGame = drawGame;
    drawGame();

    // --- E. EXECUTION ENGINE (Conditionals, Step & Run) ---
    const expandProgramToSteps = (program) => RoboMazeSimulation.expandProgramToSteps(program);

    function executeSingleStep(stepObj) {
      // Directions: 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
      const grid = runtimeLevels[currentLevelIndex].grid;

      // 1.1 Conditional Evaluation
      if (stepObj.action === 'IF_PATH_CLEAR') {
        const next = RoboMazeSimulation.nextPosition(robot);
        const clear = !RoboMazeSimulation.isBlocked(grid, next);
        if (clear) {
          robot.x = next.x;
          robot.y = next.y;
          triggerMessage('Condition TRUE: Path clear. Robot moved forward.', 'success');
        } else {
          triggerMessage('Condition FALSE: Wall detected. Robot stayed in place.', '');
        }
        drawGame();
        if (grid[robot.y][robot.x] === 2) {
          if (!conceptRequirementMet()) {
            if (window.StemGameAuth) recordMistake(currentLevelIndex, 'concept_not_applied', {
              requiredBlock: runtimeLevels[currentLevelIndex].requiredBlock
            });
            resetLevel();
            triggerMessage('Goal reached, but this level requires the highlighted concept. Revise your program.', 'error');
            learningGate.registerFailure('concept_not_applied');
            return 'CONCEPT_MISSING';
          }
          showVictoryModal();
          return 'WIN';
        }
        return true;
      }

      if (stepObj.action === 'IF_WALL_RIGHT' || stepObj.action === 'IF_WALL_LEFT') {
        const next = RoboMazeSimulation.nextPosition(robot);
        const isWall = RoboMazeSimulation.isBlocked(grid, next);

        if (isWall) {
          if (stepObj.action === 'IF_WALL_RIGHT') robot.dir = (robot.dir + 1) % 4;
          if (stepObj.action === 'IF_WALL_LEFT') robot.dir = (robot.dir + 3) % 4;
          triggerMessage("Condition TRUE: Wall detected ahead! Robot turned.", "success");
        } else {
          triggerMessage("Condition FALSE: Path ahead is clear. No turn needed.", "");
        }
        drawGame();
        return true;
      }

      if (stepObj.action === 'FORWARD') {
        const next = RoboMazeSimulation.nextPosition(robot);

        // Check Wall Collision
        if (RoboMazeSimulation.isBlocked(grid, next)) {
          triggerMessage("⚠️ Ouch! The robot bumped into a wall. Check your code!", "error");
          if (window.StemGameAuth) {
            recordMistake(currentLevelIndex, "wall_collision", {
              command: stepObj.action, position: { x: robot.x, y: robot.y }
            });
            if (window.StemTutor) window.StemTutor.show("robo_maze", "wall_collision");
            analyzeMistake(currentLevelIndex, "wall_collision", {
              command: stepObj.action, position: { x: robot.x, y: robot.y }
            }).then(insight => {
              if (insight && window.StemTutor) window.StemTutor.show("robo_maze", "wall_collision", insight);
            });
            submitAttempt(currentLevelIndex, "collision", "wall_collision", {
              command: stepObj.action, program: studentProgram
            });
          }
          learningGate.registerFailure("wall_collision");
          return false; // Collision halt
        }
        robot.x = next.x;
        robot.y = next.y;
      } else if (stepObj.action === 'TURN_LEFT') {
        robot.dir = (robot.dir + 3) % 4;
      } else if (stepObj.action === 'TURN_RIGHT') {
        robot.dir = (robot.dir + 1) % 4;
      }

      drawGame();

      // Check Victory Condition
      if (runtimeLevels[currentLevelIndex].grid[robot.y][robot.x] === 2) {
        if (!conceptRequirementMet()) {
          triggerMessage('Goal reached, but this level requires the highlighted concept. Revise your program.', 'error');
          if (window.StemGameAuth) {
            recordMistake(currentLevelIndex, 'concept_not_applied', {
              requiredBlock: runtimeLevels[currentLevelIndex].requiredBlock
            });
          }
          resetLevel();
          triggerMessage('Goal reached, but this level requires the highlighted concept. Revise your program.', 'error');
          learningGate.registerFailure('concept_not_applied');
          return 'CONCEPT_MISSING';
        }
        triggerMessage("🎉 Goal reached. Confirming result...", "success");
        showVictoryModal();
        return "WIN";
      }

      return true;
    }

    // Run Full Program Automatically
    async function runProgram() {
      if (!loadPythonProgram()) return;
      if (studentProgram.length === 0 || isExecuting || learningLocked) return;
      if (!validateProgramRules()) return;
      if (window.StemGameAuth && !creatorMode && !window.StemGameAuth.allowLevel(currentLevelIndex + 1)) return;
      isExecuting = true;
      document.getElementById('btnRun').disabled = true;
      triggerMessage("Robot executing program...", "");

      const steps = expandProgramToSteps(studentProgram);

      for (let i = 0; i < steps.length; i++) {
        highlightBlock(steps[i].originalIndex);
        const result = executeSingleStep(steps[i]);

        if (result === false || result === "WIN" || result === "CONCEPT_MISSING") {
          isExecuting = false;
          enableControls();
          return;
        }

        await new Promise(r => setTimeout(r, 450)); // 450ms animation delay
      }

      // If program ended without reaching star
      triggerMessage("Program ended, but robot didn't reach the star. Try again!", "");
      const signature = JSON.stringify(studentProgram);
      const failureCategory = signature === lastProgramSignature ? "unchanged_program" : "program_incomplete";
      lastProgramSignature = signature;
      if (window.StemGameAuth) {
        recordMistake(currentLevelIndex, failureCategory, {
          steps: steps.length
        });
        if (window.StemTutor) window.StemTutor.show("robo_maze", failureCategory);
        analyzeMistake(currentLevelIndex, failureCategory, {
          steps: steps.length, program: studentProgram
        }).then(insight => {
          if (insight && window.StemTutor) window.StemTutor.show("robo_maze", failureCategory, insight);
        });
        submitAttempt(currentLevelIndex, "miss", "goal_not_reached", {
          steps: steps.length, program: studentProgram
        });
      }
      learningGate.registerFailure(failureCategory);
      clearHighlights();
      isExecuting = false;
      enableControls();
    }

    // Step Button (Single Step Execution for Code.org-Style Debugging)
    async function stepSingleCommand() {
      if (!loadPythonProgram()) return;
      if (studentProgram.length === 0 || learningLocked) return;
      if (!validateProgramRules()) return;
      if (window.StemGameAuth && !creatorMode && !window.StemGameAuth.allowLevel(currentLevelIndex + 1)) return;
      const steps = expandProgramToSteps(studentProgram);
      if (currentStepIndex >= steps.length) {
        triggerMessage("Program ended. Tap 'Reset' to step again.", "");
        return;
      }

      highlightBlock(steps[currentStepIndex].originalIndex);
      const res = executeSingleStep(steps[currentStepIndex]);
      currentStepIndex++;

      if (res === false || res === "WIN") {
        currentStepIndex = steps.length;
      }
    }

    // Victory Modal Handlers
    async function showVictoryModal() {
      const modal = document.getElementById('victoryModal');
      const level = runtimeLevels[currentLevelIndex];
      let stars = 0;
      let reward = 0;
      if (window.StemGameAuth) {
        const attempt = await submitAttempt(currentLevelIndex, "success", null, {
          steps: studentProgram.length, program: studentProgram
        });
        if (!attempt?.ok || attempt.data?.server_result !== "success") {
          triggerMessage('The server could not confirm this maze solution. Please try again.', 'error');
          return;
        }
        const achievement = await recordAchievement(currentLevelIndex);
        if (!achievement?.ok) {
          triggerMessage('The solution was confirmed, but the reward could not be saved. Please refresh and retry.', 'error');
          return;
        }
        stars = achievement.data?.stars || 0;
        reward = achievement.data?.awarded ? (achievement.data.xp || 0) : 0;
        if (achievement.data?.awarded && !rewardedLevels.has(currentLevelIndex)) {
          rewardedLevels.add(currentLevelIndex);
          lastReward = reward;
          userXP += reward;
          document.getElementById('xpCount').textContent = `${userXP} XP`;
        }
        recordMistake(currentLevelIndex, 'level_completed', { steps: studentProgram.length });
      }
      document.getElementById('modalTitle').textContent = `${level.title} Passed! ${'⭐'.repeat(stars)} (+${reward} XP)`;
      modal.style.display = 'flex';
    }
    function closeModalAndNext() {
      document.getElementById('victoryModal').style.display = 'none';
      if (!creatorMode && currentLevelIndex < runtimeLevels.length - 1) {
        changeLevel(currentLevelIndex + 1);
        document.getElementById('levelPicker').value = currentLevelIndex;
      } else {
        alert(creatorMode
          ? "🎉 Your Creator Academy Level 31 is complete!"
          : "🎉 Congratulations! You have completed all 30 levels in the RoboLogic Maze!");
        resetLevel();
      }
    }

    function toRuntimeCreatorLevel(row) {
      const definition = row?.definition;
      if (!row?.id || !definition?.grid || !definition.start || !definition.goal) return null;
      const grid = definition.grid.map((line, y) => line.map((cell, x) => (
        x === definition.goal.x && y === definition.goal.y ? 2 : cell
      )));
      return {
        id: row.id,
        title: `Level 31: ${row.title || 'Trap Master'}`,
        instruction: `<strong>Creator Academy:</strong> Navigate the maze you designed. Your solution is validated securely by the server.`,
        grid,
        start: { ...definition.start },
      };
    }

    async function loadCreatorLevel() {
      const result = await loadLatestCreatorLevel(31);
      if (result.error) return null;
      creatorLevel = toRuntimeCreatorLevel(result.data);
      if (creatorLevel) runtimeLevels.push(creatorLevel);
      return creatorLevel;
    }

    async function selectLevel(index) {
      if (index === 'creator-31') {
        if (!creatorLevel) {
          triggerMessage('Design and save your Level 31 in Creator Academy first.', 'error');
          window.location.href = 'creator.html?academyLevel=31';
          return;
        }
        creatorMode = true;
        window.RoboMazeCreatorMode.isActive = () => creatorMode;
        window.changeLevel(30);
        return;
      }
      creatorMode = false;
      window.RoboMazeCreatorMode.isActive = () => creatorMode;
      changeLevel(index);
    }

    window.RoboMazeModule = window.StemGameModule.create({
      gameId: 'robo_maze',
      levels: runtimeLevels,
      loadLevel(levelNumber) {
        selectLevel(levelNumber === 31 ? 'creator-31' : levelNumber - 1);
      },
      reset() {
        resetLevel();
      },
      getAttemptPayload() {
        return { program: studentProgram };
      },
      renderFeedback(feedback) {
        if (feedback?.message) triggerMessage(feedback.message, feedback.statusClass || '');
      },
    });

    // Start on window load
    window.onload = () => {
      if (window.StemGameAuth) {
        window.StemGameAuth.init("robo_maze", { requireSession: true }).then(async () => {
          await loadCreatorLevel();
          bindCreatorPickerState();
          window.RoboMazeModule.loadLevel(1);
        });
      } else {
        window.RoboMazeModule.loadLevel(1);
      }
    };

    const bindCreatorPickerState = () => {
      const option = document.querySelector('[data-creator-level="31"]');
      if (option) option.textContent = creatorLevel
        ? `🛠️ Creator Academy: Level 31 — ${creatorLevel.title.replace(/^Level 31:\s*/, '')}`
        : '🛠️ Creator Academy: Level 31 — design first';
    };

  bindRoboMazeEvents({ changeLevel: selectLevel, addCommand, addLoopPrompt, switchView, runProgram, stepSingleCommand, resetLevel, closeModalAndNext, removeCommand, learningGate });
