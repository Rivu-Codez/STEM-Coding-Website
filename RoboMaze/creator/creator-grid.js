const SIZE = 8;

export function createBlankGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

export function createInitialDraft() {
  return { grid: createBlankGrid(), start: { x: 0, y: 0, dir: 1 }, goal: { x: 7, y: 7 } };
}

function key(x, y) { return x + ':' + y; }

export function cycleCell(draft, x, y) {
  const next = structuredClone(draft);
  const isStart = next.start.x === x && next.start.y === y;
  const isGoal = next.goal.x === x && next.goal.y === y;
  const current = isStart ? 'start' : isGoal ? 'goal' : next.grid[y][x] === 1 ? 'wall' : 'empty';
  const tile = { empty: 'wall', wall: 'start', start: 'goal', goal: 'empty' }[current];
  next.grid[y][x] = 0;
  if (tile === 'wall') next.grid[y][x] = 1;
  if (tile === 'start') next.start = { x, y, dir: 1 };
  if (tile === 'goal') next.goal = { x, y };
  if (current === 'start' && tile !== 'start') next.start = { x: -1, y: -1, dir: 1 };
  if (current === 'goal' && tile !== 'goal') next.goal = { x: -1, y: -1 };
  return next;
}

export function validateDraft(draft, academyLevel) {
  const errors = [];
  const start = draft.start;
  const goal = draft.goal;
  const inBounds = point => point && point.x >= 0 && point.x < SIZE && point.y >= 0 && point.y < SIZE;
  const walls = draft.grid.flat().filter(cell => cell === 1).length;
  if (!inBounds(start) || !inBounds(goal) || (start.x === goal.x && start.y === goal.y)) errors.push('Choose one different start and goal cell.');
  if (inBounds(start) && draft.grid[start.y][start.x] === 1) errors.push('The start cell cannot be a wall.');
  if (inBounds(goal) && draft.grid[goal.y][goal.x] === 1) errors.push('The goal cell cannot be a wall.');
  if (academyLevel === 31 && walls < 3) errors.push('Level 31 needs at least 3 wall tiles.');
  if (academyLevel === 33 && walls < 1) errors.push('Level 33 needs at least 1 wall obstacle behind the target route.');
  if (academyLevel === 34 && walls < 3) errors.push('Level 34 needs at least 3 walls for a meaningful debugging challenge.');
  if (!errors.length) {
    const queue = [[start.x, start.y]];
    const visited = new Set([key(start.x, start.y)]);
    while (queue.length) {
      const [x, y] = queue.shift();
      [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(([nx, ny]) => {
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE || draft.grid[ny][nx] === 1) return;
        const nextKey = key(nx, ny);
        if (!visited.has(nextKey)) { visited.add(nextKey); queue.push([nx, ny]); }
      });
    }
    if (!visited.has(key(goal.x, goal.y))) errors.push('The goal must be reachable from the start.');
  }
  return { valid: errors.length === 0, errors, walls, maxCommands: academyLevel === 32 ? 9 : 40 };
}
