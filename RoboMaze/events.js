export function bindRoboMazeEvents({ changeLevel, addCommand, addLoopPrompt, switchView, runProgram, stepSingleCommand, resetLevel, closeModalAndNext, removeCommand, learningGate }) {
  document.querySelector('[data-action="change-level"]')?.addEventListener('change', (event) => changeLevel(event.target.value));
  document.querySelectorAll('[data-command]').forEach((button) => {
    button.addEventListener('click', () => addCommand(button.dataset.command));
  });
  document.querySelector('[data-action="add-loop"]')?.addEventListener('click', addLoopPrompt);
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });
  document.querySelector('[data-action="run"]')?.addEventListener('click', runProgram);
  document.querySelector('[data-action="step"]')?.addEventListener('click', stepSingleCommand);
  document.querySelector('[data-action="reset"]')?.addEventListener('click', resetLevel);
  document.querySelector('[data-action="next-level"]')?.addEventListener('click', closeModalAndNext);
  document.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-command]');
    if (removeButton) removeCommand(Number(removeButton.dataset.removeCommand));
    const learningButton = event.target.closest('[data-learning-selected]');
    if (learningButton) learningGate.check(learningButton.dataset.learningSelected, learningButton.dataset.learningCorrect);
  });
}
