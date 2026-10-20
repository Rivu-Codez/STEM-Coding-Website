// RoboMaze learning reflection and retry lock boundary.
(function () {
  function create({ getLevel, setLocked, triggerMessage, onReflection }) {
    let failures = 0;

    function render(category) {
      const question = category === 'wall_collision'
        ? 'The robot hit a wall. What should you inspect before trying again?'
        : category === 'concept_not_applied'
          ? 'The robot reached the goal, but the level concept was not used. What should you change?'
          : 'The program ended without reaching the goal. What should you do next?';
      const correct = category === 'wall_collision' ? 'inspect_direction' : category === 'concept_not_applied' ? 'use_required_concept' : 'inspect_route';
      const options = category === 'wall_collision'
        ? [['inspect_direction', 'Inspect the next movement and the robot\'s orientation.'], ['add_random', 'Add random commands until it works.'], ['ignore_wall', 'Keep the same movement and ignore the wall.']]
        : category === 'concept_not_applied'
          ? [['use_required_concept', 'Revise the program to use the required concept.'], ['keep_program', 'Keep the same program because it reached the goal.'], ['add_random', 'Add unrelated blocks without checking the concept.']]
          : [['inspect_route', 'Inspect the route and choose the needed loop or condition.'], ['repeat_same', 'Run the unchanged program again.'], ['remove_all', 'Delete the whole program without inspecting it.']];

      document.getElementById('mazeQuestion').textContent = question;
      document.getElementById('mazeOptions').innerHTML = options.map(([value, label]) =>
        `<button class="learning-option" type="button" data-learning-selected="${value}" data-learning-correct="${correct}">${label}</button>`
      ).join('');
      document.getElementById('mazeFeedback').textContent = '';
      document.getElementById('learningGate').style.display = 'block';
      setLocked(true);
      triggerMessage('Three failed runs. Review the program before continuing.', 'error');
    }

    return Object.freeze({
      isLocked: () => failures >= 3,
      reset() { failures = 0; setLocked(false); },
      registerFailure(category) {
        failures += 1;
        if (failures >= 3) render(category);
      },
      restore(category) {
        failures = 3;
        render(category);
      },
      check(selected, correct) {
        const feedback = document.getElementById('mazeFeedback');
        if (selected !== correct) {
          feedback.textContent = 'Use the failure message to decide what part of the program needs inspection.';
          return;
        }
        feedback.textContent = 'Good reasoning. Inspect the route, then edit and run deliberately.';
        document.querySelectorAll('#mazeOptions .learning-option').forEach((button) => { button.disabled = true; });
        failures = 0;
        document.getElementById('learningGate').style.display = 'none';
        setLocked(false);
        onReflection?.(selected);
      },
      currentLevel() { return getLevel(); },
    });
  }

  window.RoboMazeLearningGate = Object.freeze({ create });
})();
