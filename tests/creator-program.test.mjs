import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCreatorProgram, runCreatorProgram } from '../RoboMaze/creator/creator-program.js';

test('creator program parser supports commands and repeat blocks', () => {
  const result = parseCreatorProgram('for _ in range(3):\n    robot.move_forward()\nrobot.turn_right()');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.commands.map(({ type, count }) => ({ type, count })), [
    { type: 'REPEAT_FORWARD', count: 3 },
    { type: 'TURN_RIGHT', count: 1 },
  ]);
});

test('creator program runner detects a solved route and a collision', () => {
  const draft = {
    grid: Array.from({ length: 8 }, () => Array(8).fill(0)),
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 2, y: 0 },
  };
  assert.equal(runCreatorProgram(draft, [{ type: 'REPEAT_FORWARD', count: 2 }]).solved, true);
  assert.equal(runCreatorProgram({ ...draft, grid: [[0, 1, 0], ...draft.grid.slice(1)] }, [{ type: 'FORWARD', count: 1 }]).halted, true);
});
