# Game module contract

Each game exposes a module through `StemGameModule.create`. The contract keeps
game rules and rendering inside the game while shared authentication and
progress code remains outside it.

```js
const game = StemGameModule.create({
  gameId: "example_game",
  levels: LEVELS,
  loadLevel(levelNumber) {},
  reset() {},
  getAttemptPayload() { return {}; },
  renderFeedback(feedback) {}
});
```

## Responsibilities

- `gameId`: stable database game identifier.
- `levels`: display and simulation metadata used by the module.
- `loadLevel(levelNumber)`: prepares one level without changing server progress.
- `reset()`: returns the current level to its initial state.
- `getAttemptPayload()`: returns raw attempt data for server validation.
- `renderFeedback(feedback)`: displays the server result safely.

The module must not decide whether a level is unlocked, completed, or rewarded.
Those decisions belong to the authenticated backend response.
