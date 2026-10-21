import { CREATOR_LEVELS } from './creator-levels.js';
import { createInitialDraft, cycleCell, validateDraft } from './creator-grid.js';
import { publishDraft, saveDraft } from './creator-api.js';
import { formatCreatorProgram, parseCreatorProgram, runCreatorProgram } from './creator-program.js';

const state = { draft: createInitialDraft(), id: null, academyLevel: 31, busy: false, program: [] };
const displayLevel = academyLevel => academyLevel - 15;

const $ = id => document.getElementById(id);
const definition = () => ({ grid: state.draft.grid, start: state.draft.start, goal: state.draft.goal, program: state.program });
const setStatus = (text, kind = '') => {
  $('creatorStatus').textContent = text;
  $('creatorStatus').className = 'creator-status ' + kind;
};
const setButtonState = () => {
  $('saveDraft').disabled = state.busy;
  $('publishDraft').disabled = state.busy || !validateDraft(state.draft, state.academyLevel).valid;
};
const testProgram = () => {
  const parsed = parseCreatorProgram($('creatorProgram').value);
  state.program = parsed.commands;
  if (parsed.errors.length) {
    $('programStatus').textContent = parsed.errors.join(' ');
    $('programStatus').className = 'program-status error';
    return false;
  }
  const result = runCreatorProgram(state.draft, state.program);
  const limit = state.academyLevel === 32 ? ` Level ${displayLevel(state.academyLevel)} requires fewer than 10 commands.` : '';
  const withinLimit = state.academyLevel !== 32 || state.program.length < 10;
  $('programStatus').textContent = result.solved && withinLimit
    ? `Solution confirmed in ${result.steps} steps.${limit}`
    : result.solved && !withinLimit
      ? `The route works, but Level ${displayLevel(state.academyLevel)} needs fewer than 10 commands.`
      : result.halted
        ? `The robot hit a wall after ${result.steps} steps. Fix the route and test again.`
        : `The route ended after ${result.steps} steps without reaching the exit.`;
  $('programStatus').className = result.solved && withinLimit ? 'program-status success' : 'program-status error';
  return result.solved && withinLimit;
};
const renderSummary = () => {
  const result = validateDraft(state.draft, state.academyLevel);
  $('wallCount').textContent = result.walls;
  $('validationList').replaceChildren();
  const messages = result.errors.length ? result.errors : [
    result.maxCommands < 40
      ? `Maze ready. Solve it in fewer than 10 commands for Level ${displayLevel(state.academyLevel)}.`
      : 'Ready to test and save this maze.'
  ];
  messages.forEach(error => {
    const item = document.createElement('li');
    item.textContent = error;
    $('validationList').append(item);
  });
  $('validationSummary').textContent = result.valid ? 'Maze ready' : 'Maze needs attention';
  $('validationSummary').className = result.valid ? 'valid' : 'invalid';
  setButtonState();
};
const renderGrid = () => {
  const grid = $('creatorGrid');
  grid.replaceChildren();
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const cell = document.createElement('button');
      const isStart = state.draft.start.x === x && state.draft.start.y === y;
      const isGoal = state.draft.goal.x === x && state.draft.goal.y === y;
      cell.type = 'button';
      cell.className = 'creator-cell ' + (isStart ? 'start' : isGoal ? 'goal' : state.draft.grid[y][x] ? 'wall' : 'empty');
      cell.textContent = isStart ? '▶' : isGoal ? '★' : state.draft.grid[y][x] ? '■' : '';
      cell.setAttribute('aria-label', 'Row ' + (y + 1) + ', column ' + (x + 1));
      cell.addEventListener('click', () => { state.draft = cycleCell(state.draft, x, y); render(); });
      grid.append(cell);
    }
  }
};
const render = () => {
  const level = CREATOR_LEVELS.find(item => item.number === state.academyLevel);
  $('academyTitle').textContent = 'Level ' + displayLevel(state.academyLevel) + ': ' + level.title;
  $('academyHint').textContent = level.hint;
  renderGrid();
  renderSummary();
};
const reset = () => {
  state.draft = createInitialDraft();
  state.id = null;
  $('creatorTitle').value = '';
  $('creatorDescription').value = '';
  state.program = [];
  $('creatorProgram').value = '';
  $('programStatus').textContent = 'Add commands, then test your route.';
  $('programStatus').className = 'program-status';
  setStatus('New draft ready.');
  render();
};
const withBusy = async action => {
  if (state.busy) return;
  state.busy = true; setButtonState();
  try { await action(); } catch (error) { setStatus(error.message || 'Something went wrong.', 'error'); }
  state.busy = false; renderSummary();
};
$('academyLevel').addEventListener('change', event => { state.academyLevel = Number(event.target.value); reset(); });
$('resetGrid').addEventListener('click', reset);
$('checkProgram').addEventListener('click', testProgram);
$('saveDraft').addEventListener('click', () => withBusy(async () => {
  testProgram();
  const result = await saveDraft({ id: state.id, academyLevel: state.academyLevel, title: $('creatorTitle').value.trim() || 'Untitled RoboMaze', description: $('creatorDescription').value.trim(), definition: definition() });
  if (result.error) throw result.error;
  state.id = result.data.creator_level_id;
  setStatus('Draft saved securely.');
}));
$('publishDraft').addEventListener('click', () => withBusy(async () => {
  if (!testProgram()) throw new Error('Test a working solution before publishing this challenge.');
  if (!validateDraft(state.draft, state.academyLevel).valid) return;
  if (!state.id) {
    const saved = await saveDraft({ id: null, academyLevel: state.academyLevel, title: $('creatorTitle').value.trim() || 'Untitled RoboMaze', description: $('creatorDescription').value.trim(), definition: definition() });
    if (saved.error) throw saved.error;
    state.id = saved.data.creator_level_id;
  }
  const result = await publishDraft(state.id);
  if (result.error) throw result.error;
  $('shareCode').textContent = result.data.share_code;
  $('sharePanel').hidden = false;
  setStatus('Published! Your level is ready to share.', 'success');
}));
$('playShared').addEventListener('click', () => {
  const code = $('sharedCode').value.trim();
  if (!/^\d{6}$/.test(code)) {
    setStatus('Enter a valid 6-digit share code.', 'error');
    return;
  }
  window.location.href = `index.html?share=${code}`;
});
$('copyCode').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('shareCode').textContent);
  setStatus('Share code copied.', 'success');
});
window.addEventListener('load', async () => {
  await window.StemGameAuth.init('robo_maze', { requireSession: true });
  if (!window.StemGamePlatform.isCreatorUnlocked()) {
    setStatus('Complete RoboMaze Level 15 to unlock Creator Academy.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    return;
  }
  const requestedLevel = Number(new URLSearchParams(window.location.search).get('academyLevel'));
  if (requestedLevel >= 31 && requestedLevel <= 35) {
    state.academyLevel = requestedLevel;
    $('academyLevel').value = String(requestedLevel);
  }
  const existing = await loadLatestCreatorLevel(state.academyLevel);
  if (!existing.error && existing.data?.status === 'draft' && existing.data.definition?.grid) {
    state.id = existing.data.id;
    state.draft = existing.data.definition;
    $('creatorTitle').value = existing.data.title || '';
    $('creatorDescription').value = existing.data.description || '';
    state.program = Array.isArray(state.draft.program) ? state.draft.program : [];
    $('creatorProgram').value = formatCreatorProgram(state.program);
  }
  render();
});
