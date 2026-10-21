import { CREATOR_LEVELS } from './creator-levels.js';
import { createInitialDraft, cycleCell, validateDraft } from './creator-grid.js';
import { publishDraft, saveDraft } from './creator-api.js';

const state = { draft: createInitialDraft(), id: null, academyLevel: 31, busy: false };

const $ = id => document.getElementById(id);
const definition = () => ({ grid: state.draft.grid, start: state.draft.start, goal: state.draft.goal });
const setStatus = (text, kind = '') => {
  $('creatorStatus').textContent = text;
  $('creatorStatus').className = 'creator-status ' + kind;
};
const setButtonState = () => {
  $('saveDraft').disabled = state.busy;
  $('publishDraft').disabled = state.busy || !validateDraft(state.draft, state.academyLevel).valid;
};
const renderSummary = () => {
  const result = validateDraft(state.draft, state.academyLevel);
  $('wallCount').textContent = result.walls;
  $('validationList').replaceChildren();
  (result.errors.length ? result.errors : ['Ready to test and save this maze.']).forEach(error => {
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
  $('academyTitle').textContent = 'Level ' + state.academyLevel + ': ' + CREATOR_LEVELS.find(level => level.number === state.academyLevel).title;
  $('academyHint').textContent = CREATOR_LEVELS.find(level => level.number === state.academyLevel).hint;
  renderGrid();
  renderSummary();
};
const reset = () => {
  state.draft = createInitialDraft();
  state.id = null;
  $('creatorTitle').value = '';
  $('creatorDescription').value = '';
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
$('saveDraft').addEventListener('click', () => withBusy(async () => {
  const result = await saveDraft({ id: state.id, academyLevel: state.academyLevel, title: $('creatorTitle').value.trim() || 'Untitled RoboMaze', description: $('creatorDescription').value.trim(), definition: definition() });
  if (result.error) throw result.error;
  state.id = result.data.creator_level_id;
  setStatus('Draft saved securely.');
}));
$('publishDraft').addEventListener('click', () => withBusy(async () => {
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
$('copyCode').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('shareCode').textContent);
  setStatus('Share code copied.', 'success');
});
window.addEventListener('load', () => { window.StemGameAuth.init('robo_maze', { requireSession: true }); render(); });
