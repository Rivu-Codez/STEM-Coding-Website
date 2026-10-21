const COMMANDS = Object.freeze({
  'robot.move_forward()': { type: 'FORWARD', count: 1 },
  'robot.turn_left()': { type: 'TURN_LEFT', count: 1 },
  'robot.turn_right()': { type: 'TURN_RIGHT', count: 1 },
});

export function parseCreatorProgram(source) {
  const commands = [];
  const errors = [];
  const lines = String(source || '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const direct = COMMANDS[line];
    if (direct) {
      commands.push({ ...direct });
      continue;
    }
    const repeat = line.match(/^for\s+_\s+in\s+range\((\d+)\):$/);
    if (repeat) {
      const next = lines[index + 1]?.trim();
      const command = COMMANDS[next];
      const count = Number(repeat[1]);
      if (!command || count < 2 || count > 5) {
        errors.push(`Line ${index + 1}: use a repeat count from 2 to 5 followed by an indented robot command.`);
        continue;
      }
      commands.push({ ...command, type: 'REPEAT_FORWARD', count });
      index += 1;
      continue;
    }
    if (/^\s/.test(rawLine) && commands.at(-1)?.type === 'REPEAT_FORWARD') continue;
    errors.push(`Line ${index + 1}: unsupported command.`);
  }
  return { commands, errors };
}

export function runCreatorProgram(draft, commands) {
  const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  let robot = { ...draft.start };
  let steps = 0;
  let solved = false;
  let halted = false;
  for (const command of commands) {
    const repeat = command.type === 'REPEAT_FORWARD' ? command.count : 1;
    for (let i = 0; i < repeat; i += 1) {
      steps += 1;
      if (steps > 200) return { solved: false, halted: true, steps };
      if (command.type === 'TURN_LEFT') robot.dir = (robot.dir + 3) % 4;
      else if (command.type === 'TURN_RIGHT') robot.dir = (robot.dir + 1) % 4;
      else {
        const direction = directions[robot.dir];
        const x = robot.x + direction.x;
        const y = robot.y + direction.y;
        if (x < 0 || y < 0 || x >= 8 || y >= 8 || draft.grid[y][x] === 1) {
          halted = true;
          return { solved: false, halted, steps };
        }
        robot = { ...robot, x, y };
      }
      if (robot.x === draft.goal.x && robot.y === draft.goal.y) {
        solved = true;
        return { solved, halted, steps };
      }
    }
  }
  return { solved, halted, steps };
}

export function formatCreatorProgram(commands) {
  return commands.map(command => command.type === 'REPEAT_FORWARD'
    ? `for _ in range(${command.count}):\n    robot.move_forward()`
    : Object.entries(COMMANDS).find(([, value]) => value.type === command.type)?.[0] || '').join('\n');
}
