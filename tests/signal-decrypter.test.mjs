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

test('Signal Decrypter contains fifteen question-driven missions', () => {
  const { SignalDecrypterLevels } = loadSignalTools();
  assert.equal(SignalDecrypterLevels.length, 15);
  assert.ok(SignalDecrypterLevels.every(level => level.question && level.signal && level.timeLimit > 0));
  assert.equal(SignalDecrypterLevels.filter(level => level.mode === 'blocks').length, 10);
  assert.equal(SignalDecrypterLevels.filter(level => level.mode === 'python').length, 5);
});

test('public level data does not expose expected answers or canonical solutions', () => {
  const { SignalDecrypterLevels } = loadSignalTools();
  for (const level of SignalDecrypterLevels) {
    assert.equal('output' in level, false, `level ${level.id}`);
    assert.equal('answer' in level, false, `level ${level.id}`);
    assert.equal(JSON.stringify(level).includes('"role"'), false, `level ${level.id}`);
  }
});

test('decoder engine handles real-world cleanup operations', () => {
  const { SignalDecrypterEngine } = loadSignalTools();
  assert.equal(SignalDecrypterEngine.execute('0-C', [{ type: 'remove', chars: '-' }]), '0C');
  assert.equal(SignalDecrypterEngine.execute('SxOxS', [{ type: 'slice_step', start: 0, step: 2 }]), 'SOS');
  assert.equal(SignalDecrypterEngine.execute('C0', [{ type: 'swap', first: 0, second: 1 }]), '0C');
  assert.equal(SignalDecrypterEngine.execute('NEIL*ARMSTRONG', [{ type: 'replace', from: '*', to: '' }]), 'NEILARMSTRONG');
  assert.equal(SignalDecrypterEngine.execute('#EDIXOIDNOBRAC#', [{ type: 'strip', chars: '#' }, { type: 'reverse' }]), 'CARBONDIOXIDE');
  assert.equal(SignalDecrypterEngine.execute('#n-i-k-s#', [{ type: 'strip', chars: '#' }, { type: 'reverse' }, { type: 'remove', chars: '-' }, { type: 'lower' }]), 'skin');
});

test('Signal Decrypter parses the approved Python solution subset', () => {
  const { SignalDecrypterEngine } = loadSignalTools();
  assert.deepEqual(JSON.parse(JSON.stringify(SignalDecrypterEngine.parseCode('signal[::-1]'))), { operations: [{ type: 'reverse' }] });
  assert.deepEqual(JSON.parse(JSON.stringify(SignalDecrypterEngine.parseCode('signal.strip("#")[::-1].replace("-", "")'))), {
    operations: [{ type: 'strip', chars: '#' }, { type: 'reverse' }, { type: 'remove', chars: '-' }]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(SignalDecrypterEngine.parseCode("signal.replace(',', '')[::-1]"))), {
    operations: [{ type: 'remove', chars: ',' }, { type: 'reverse' }]
  });
  assert.match(SignalDecrypterEngine.parseCode('import os').error, /Start with signal/);
  assert.match(SignalDecrypterEngine.parseCode('signal.__class__').error, /outside this level/);
});
