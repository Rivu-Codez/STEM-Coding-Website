import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadAcademyLevels() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'SignalDecrypter/levels.js'), 'utf8'), context);
  return context.window;
}

test('The Locked Academy contains fifteen print-and-variables missions', () => {
  const { SignalDecrypterLevels } = loadAcademyLevels();
  assert.equal(SignalDecrypterLevels.length, 15);
  assert.ok(SignalDecrypterLevels.every(level => level.question && Number.isInteger(level.room)));
  assert.deepEqual([...new Set(SignalDecrypterLevels.map(level => level.mode))].sort(), ['blocks', 'fill', 'type']);
  assert.equal(SignalDecrypterLevels.at(-1).title, 'The Exit Report');
});

test('public level data does not expose expected answers or canonical solutions', () => {
  const { SignalDecrypterLevels } = loadAcademyLevels();
  for (const level of SignalDecrypterLevels) {
    assert.equal('output' in level, false, `level ${level.id}`);
    assert.equal('answer' in level, false, `level ${level.id}`);
    assert.equal(JSON.stringify(level).includes('"role"'), false, `level ${level.id}`);
  }
});
