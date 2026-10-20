// Pure RoboMaze movement helpers. UI and persistence stay outside this module.
const RoboMazeSimulation = {
  directions: [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ],

  expandProgramToSteps(program) {
    const steps = [];
    program.forEach((command, originalIndex) => {
      if (command.type === 'REPEAT_FORWARD') {
        for (let count = 0; count < command.count; count += 1) {
          steps.push({ action: 'FORWARD', originalIndex });
        }
      } else {
        steps.push({ action: command.type, originalIndex });
      }
    });
    return steps;
  },

  nextPosition(robot) {
    const direction = this.directions[robot.dir];
    return { x: robot.x + direction.x, y: robot.y + direction.y };
  },

  isBlocked(grid, position) {
    return position.x < 0 || position.x >= 8 || position.y < 0 || position.y >= 8
      || grid[position.y][position.x] === 1;
  },

  isGoal(grid, robot) {
    return grid[robot.y][robot.x] === 2;
  },
};
