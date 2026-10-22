import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadSignalTools() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'SignalDecrypter/levels.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'SignalDecrypter/engine.js'), 'utf8'), context);
  return context.window;
}

test('Signal Decrypter canonical operations produce every level output', () => {
  const { SignalDecrypterLevels, SignalDecrypterEngine } = loadSignalTools();
  for (const level of SignalDecrypterLevels) {
    const operations = level.operations.filter(operation => operation.role === 'correct' || level.mode === 'python');
    assert.equal(SignalDecrypterEngine.execute(level.signal, operations), level.output, `level ${level.id}`);
  }
});

test('Signal Decrypter missions expose timing and decoy choices without leaking the answer', () => {
  const { SignalDecrypterLevels } = loadSignalTools();
  assert.equal(SignalDecrypterLevels.length, 15);
  assert.ok(SignalDecrypterLevels.every(level => level.timeLimit > 0 && level.interferenceLimit > 0));
  assert.ok(SignalDecrypterLevels.slice(0, 10).every(level => level.operations.some(operation => operation.role === 'decoy')));
  assert.equal(Array.from(SignalDecrypterLevels[0].operations.filter(operation => operation.role === 'correct'), operation => operation.type).join(','), 'reverse');
});

test('Signal Decrypter parses only the approved Python string subset', () => {
  const { SignalDecrypterEngine } = loadSignalTools();
  assert.deepEqual(JSON.parse(JSON.stringify(SignalDecrypterEngine.parseCode(' signal . upper ( ) '))), { operations: [{ type: 'upper' }] });
  assert.deepEqual(JSON.parse(JSON.stringify(SignalDecrypterEngine.parseCode('signal[::-1]'))), { operations: [{ type: 'reverse' }] });
  assert.match(SignalDecrypterEngine.parseCode('import os').error, /Start with signal/);
  assert.match(SignalDecrypterEngine.parseCode('signal.__class__').error, /outside this level/);
});

test('Signal Decrypter keeps literal separator indexes', () => {
  const { SignalDecrypterLevels, SignalDecrypterEngine } = loadSignalTools();
  const findLevel = id => SignalDecrypterLevels.find(level => level.id === id);
  assert.equal(SignalDecrypterEngine.execute(findLevel(9).signal, findLevel(9).operations.filter(operation => operation.role === 'correct')), 'A-L-I-E-N');
  assert.equal(SignalDecrypterEngine.execute(findLevel(12).signal, findLevel(12).operations), '4');
});
