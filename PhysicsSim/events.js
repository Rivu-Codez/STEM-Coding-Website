export function bindPhysicsEvents({ changeLevel, nudgeAngle, updateControls, nudgeSpeed, toggleDrag, unlockAfterReview, fireCannon, resetShot, closeModalAndNext, checkPhysicsPrediction }) {
  document.querySelector('[data-action="change-level"]')?.addEventListener('change', (event) => changeLevel(event.target.value));
  document.querySelectorAll('[data-nudge-angle]').forEach((button) => {
    button.addEventListener('click', () => nudgeAngle(Number(button.dataset.nudgeAngle)));
  });
  document.getElementById('angleSlider')?.addEventListener('input', updateControls);
  document.querySelectorAll('[data-nudge-speed]').forEach((button) => {
    button.addEventListener('click', () => nudgeSpeed(Number(button.dataset.nudgeSpeed)));
  });
  document.getElementById('speedSlider')?.addEventListener('input', updateControls);
  document.getElementById('dragToggle')?.addEventListener('change', (event) => toggleDrag(event.target.checked));
  document.querySelector('[data-action="unlock-review"]')?.addEventListener('click', unlockAfterReview);
  document.querySelector('[data-action="fire"]')?.addEventListener('click', fireCannon);
  document.querySelector('[data-action="reset"]')?.addEventListener('click', resetShot);
  document.querySelector('[data-action="next-level"]')?.addEventListener('click', closeModalAndNext);
  document.addEventListener('click', (event) => {
    const learningButton = event.target.closest('[data-learning-selected]');
    if (learningButton) checkPhysicsPrediction(learningButton.dataset.learningSelected, learningButton.dataset.learningCorrect);
  });
}
