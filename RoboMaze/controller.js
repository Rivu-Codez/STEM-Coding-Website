// --- B. GAME STATE VARIABLES ---
    let currentLevelIndex = 0;
    let robot = { x: 1, y: 1, dir: 1 };
    let studentProgram = []; // Array of command objects: { type, count }
    let isExecuting = false;
    let currentStepIndex = 0;
    let userXP = 100;
    let activeView = 'blocks'; // 'blocks' or 'python'
    let learningFailures = 0;
    let failedAttempts = 0;
    let learningLocked = false;
    let lastProgramSignature = '';
    const rewardedLevels = new Set();
    let lastReward = 0;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const GRID_SIZE = 8;
    const TILE_SIZE = 45; // 8x8 grid on 360x360 canvas

    // --- C. RENDER 2D GRID & ROBOT SPRITE ---
    function drawGame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const grid = LEVELS[currentLevelIndex].grid;

      // 1. Draw Grid Tiles
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const type = grid[r][c];
          if (type === 1) {
            ctx.fillStyle = "#1e293b"; // Wall Obstacle
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#334155";
            ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          } else {
            ctx.fillStyle = "#0f172a"; // Walkable Path
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#1e293b";
            ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }

          // Draw Target Star Goal
          if (type === 2) {
            ctx.font = "30px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("⭐", c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2);
          }
        }
      }

      // 2. Draw Robot Sprite (Circular body with eyes and direction pointer)
      const rx = robot.x * TILE_SIZE + TILE_SIZE / 2;
      const ry = robot.y * TILE_SIZE + TILE_SIZE / 2;

      // Robot Body Glow & Circle
      ctx.beginPath();
      ctx.arc(rx, ry, 21, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Robot Direction Pointer
      const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]; // UP, RIGHT, DOWN, LEFT
      const angle = angles[robot.dir];
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + Math.cos(angle) * 16, ry + Math.sin(angle) * 16);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#090d16";
      ctx.stroke();

      // Robot Eye Indicator
      ctx.beginPath();
      ctx.arc(rx + Math.cos(angle) * 6, ry + Math.sin(angle) * 6, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    // --- E. EXECUTION ENGINE (Conditionals, Step & Run) ---
    const expandProgramToSteps = (program) => RoboMazeSimulation.expandProgramToSteps(program);

    function executeSingleStep(stepObj) {
      // Directions: 0=UP, 1=RIGHT, 2=DOWN, 3=LEFT
      const grid = LEVELS[currentLevelIndex].grid;

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
            if (window.StemGameAuth) RoboMazeAdapter.recordMistake(currentLevelIndex, 'concept_not_applied', {
              requiredBlock: LEVELS[currentLevelIndex].requiredBlock
            });
            resetLevel();
            triggerMessage('Goal reached, but this level requires the highlighted concept. Revise your program.', 'error');
            registerLearningFailure('concept_not_applied');
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
            RoboMazeAdapter.recordMistake(currentLevelIndex, "wall_collision", {
              command: stepObj.action, position: { x: robot.x, y: robot.y }
            });
            if (window.StemTutor) StemTutor.show("robo_maze", "wall_collision");
            RoboMazeAdapter.analyzeMistake(currentLevelIndex, "wall_collision", {
              command: stepObj.action, position: { x: robot.x, y: robot.y }
            }).then(insight => {
              if (insight && window.StemTutor) StemTutor.show("robo_maze", "wall_collision", insight);
            });
            RoboMazeAdapter.submitAttempt(currentLevelIndex, "collision", "wall_collision", {
              command: stepObj.action, program: studentProgram
            });
          }
          registerLearningFailure("wall_collision", { position: { x: robot.x, y: robot.y } });
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
      if (LEVELS[currentLevelIndex].grid[robot.y][robot.x] === 2) {
        if (!conceptRequirementMet()) {
          triggerMessage('Goal reached, but this level requires the highlighted concept. Revise your program.', 'error');
          if (window.StemGameAuth) {
            RoboMazeAdapter.recordMistake(currentLevelIndex, 'concept_not_applied', {
              requiredBlock: LEVELS[currentLevelIndex].requiredBlock
            });
          }
          resetLevel();
          triggerMessage('Goal reached, but this level requires the highlighted concept. Revise your program.', 'error');
          registerLearningFailure('concept_not_applied');
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
      if (window.StemGameAuth && !StemGameAuth.allowLevel(currentLevelIndex + 1)) return;
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
        RoboMazeAdapter.recordMistake(currentLevelIndex, failureCategory, {
          steps: steps.length
        });
        if (window.StemTutor) StemTutor.show("robo_maze", failureCategory);
        RoboMazeAdapter.analyzeMistake(currentLevelIndex, failureCategory, {
          steps: steps.length, program: studentProgram
        }).then(insight => {
          if (insight && window.StemTutor) StemTutor.show("robo_maze", failureCategory, insight);
        });
        RoboMazeAdapter.submitAttempt(currentLevelIndex, "miss", "goal_not_reached", {
          steps: steps.length, program: studentProgram
        });
      }
      registerLearningFailure(failureCategory, { steps: steps.length });
      clearHighlights();
      isExecuting = false;
      enableControls();
    }

    // Step Button (Single Step Execution for Code.org-Style Debugging)
    function stepSingleCommand() {
      if (!loadPythonProgram()) return;
      if (studentProgram.length === 0 || learningLocked) return;
      if (!validateProgramRules()) return;
      if (window.StemGameAuth && !StemGameAuth.allowLevel(currentLevelIndex + 1)) return;
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
      const level = LEVELS[currentLevelIndex];
      let stars = 0;
      let reward = 0;
      if (window.StemGameAuth) {
        const attempt = await RoboMazeAdapter.submitAttempt(currentLevelIndex, "success", null, {
          steps: studentProgram.length, program: studentProgram
        });
        if (!attempt?.ok || attempt.data?.server_result !== "success") {
          triggerMessage('The server could not confirm this maze solution. Please try again.', 'error');
          return;
        }
        const achievement = await RoboMazeAdapter.recordAchievement(currentLevelIndex);
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
        RoboMazeAdapter.recordMistake(currentLevelIndex, 'level_completed', { steps: studentProgram.length });
      }
      document.getElementById('modalTitle').textContent = `${level.title} Passed! ${'⭐'.repeat(stars)} (+${reward} XP)`;
      modal.style.display = 'flex';
    }
    function closeModalAndNext() {
      document.getElementById('victoryModal').style.display = 'none';
      if (currentLevelIndex < LEVELS.length - 1) {
        changeLevel(currentLevelIndex + 1);
        document.getElementById('levelPicker').value = currentLevelIndex;
      } else {
        alert("🎉 Congratulations! You have completed all 30 levels in the RoboLogic Maze!");
        resetLevel();
      }
    }

    const RoboMazeModule = StemGameModule.create({
      gameId: 'robo_maze',
      levels: LEVELS,
      loadLevel(levelNumber) {
        changeLevel(levelNumber - 1);
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
        StemGameAuth.init("robo_maze", { requireSession: true }).then(() => RoboMazeModule.loadLevel(1));
      } else {
        RoboMazeModule.loadLevel(1);
      }
    };

// RoboMaze DOM event wiring keeps HTML free of inline handlers.
(function () {
  function bind() {
    document.querySelector('[data-action="change-level"]')?.addEventListener('change', (event) => {
      changeLevel(event.target.value);
    });
    document.querySelectorAll('[data-command]').forEach((button) => {
      button.addEventListener('click', () => addCommand(button.dataset.command));
    });
    document.querySelector('[data-action="add-loop"]')?.addEventListener('click', addLoopPrompt);
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => switchView(button.dataset.view));
    });
    document.querySelector('[data-action="run"]')?.addEventListener('click', runProgram);
    document.querySelector('[data-action="step"]')?.addEventListener('click', stepSingleCommand);
    document.querySelector('[data-action="reset"]')?.addEventListener('click', resetLevel);
    document.querySelector('[data-action="next-level"]')?.addEventListener('click', closeModalAndNext);
    document.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-command]');
      if (removeButton) removeCommand(Number(removeButton.dataset.removeCommand));
      const learningButton = event.target.closest('[data-learning-selected]');
      if (learningButton) checkMazePrediction(
        learningButton.dataset.learningSelected,
        learningButton.dataset.learningCorrect,
      );
    });
  }
  bind();
})();

