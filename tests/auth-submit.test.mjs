import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loginHarness(mode, rejectedMethod) {
  const ids = ['loginEmail', 'loginPassword', 'confirmPassword', 'displayName', 'loginMessage', 'authSubmit', 'modeToggle', 'authTitle', 'authDescription', 'confirmRow', 'displayNameRow', 'passwordRules', 'authForm', 'togglePassword'];
  const elements = Object.fromEntries(ids.map(id => [id, {
    id, value: '', textContent: '', disabled: false, hidden: false, type: id === 'loginPassword' ? 'password' : 'text',
    setAttribute() {}, focus() {},
  }]));
  elements.loginEmail.value = 'student@example.test';
  elements.loginPassword.value = 'long-enough-password';
  elements.confirmPassword.value = 'long-enough-password';
  elements.displayName.value = 'Student';
  const calls = [];
  const authApi = {
    getSession: async () => ({ data: { session: null } }),
    signIn: async () => { calls.push('login'); if (rejectedMethod === 'login') throw new Error('offline'); return { data: { session: {} } }; },
    signUp: async () => { calls.push('signup'); if (rejectedMethod === 'signup') throw new Error('offline'); return { data: { session: {} } }; },
  };
  const platform = { initClient: () => true, redirectToLogin() {} };
  const document = {
    head: { appendChild() {} },
    createElement: () => ({ setAttribute() {}, textContent: '' }),
    getElementById: id => elements[id] || null,
  };
  const context = { document, console, window: { StemGamePlatform: platform, StemAuthApi: authApi, StemProgressApi: {} } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/game-auth.js'), 'utf8'), context);
  return { elements, context, calls, mode };
}

for (const mode of ['login', 'signup']) {
  test(`a rejected ${mode} request reports an error and restores submit state`, async () => {
    const { elements, context, calls } = loginHarness(mode, mode);
    await context.window.StemGameAuth.initLoginPage();
    if (mode === 'signup') elements.modeToggle.onclick();
    const pending = elements.authForm.onsubmit({ preventDefault() {} });
    assert.equal(elements.authSubmit.disabled, true);
    await pending;
    assert.equal(elements.authSubmit.disabled, false);
    assert.equal(elements.modeToggle.disabled, false);
    assert.match(elements.loginMessage.textContent, /could not reach the account service/i);
    assert.deepEqual(calls, [mode]);
  });
}

test('the shared game shell exposes live announcements and disables attempt controls while busy', () => {
  const status = { textContent: '', setAttribute() {}, dataset: {} };
  const button = { disabled: false, setAttribute() {} };
  const rootElement = {
    dataset: { gameRoot: 'chemistry' },
    classList: { add() {} },
    querySelector: () => status,
    querySelectorAll: () => [button],
    setAttribute() {},
    prepend() {},
  };
  const document = { querySelectorAll: () => [rootElement], createElement: () => status };
  const context = { document, window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/game-shell.js'), 'utf8'), context);
  context.window.StemGameShell.setBusy('chemistry', true);
  context.window.StemGameShell.announce('chemistry', 'Water synthesized.');
  assert.equal(button.disabled, true);
  assert.equal(status.textContent, 'Water synthesized.');
  assert.equal(context.window.StemGameShell.getState('chemistry'), 'checking');
  context.window.StemGameShell.setState('chemistry', 'complete');
  assert.equal(context.window.StemGameShell.getState('chemistry'), 'complete');
});
