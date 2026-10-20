// Physics reflection lock boundary.
(function () {
  function create() {
    let locked = false;

    function applyLock(value) {
      ['angleSlider', 'speedSlider', 'dragToggle', 'btnSpeedDown', 'btnSpeedUp', 'btnFire']
        .forEach((id) => { document.getElementById(id).disabled = value; });
      document.querySelectorAll('.btn-nudge').forEach((button) => { button.disabled = value; });
    }

    return Object.freeze({
      isLocked: () => locked,
      setLocked(value) {
        locked = Boolean(value);
        applyLock(locked);
      },
      reset() {
        locked = false;
        applyLock(false);
      },
    });
  }

  window.PhysicsLearningGate = Object.freeze({ create });
})();
