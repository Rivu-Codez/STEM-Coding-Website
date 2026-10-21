(function () {
  function parseRoute(raw) {
    const source = String(raw ?? '').replace(/[−–]/g, '-').trim();
    if (!source) return { ok: false, moves: [], message: 'Enter a route such as +25,-10,+15.' };
    const tokens = source.split(/[\s,→>]+/).map(token => token.trim()).filter(Boolean);
    const moves = [];
    for (const token of tokens) {
      const normalized = token.replace(/^up/i, '+').replace(/^down/i, '-');
      if (!/^[+-]\d+(?:\.\d+)?$/.test(normalized)) return { ok: false, moves, message: `“${token}” is not a signed move. Use +25 or -10.` };
      const value = Number(normalized);
      if (!Number.isFinite(value) || value === 0) return { ok: false, moves, message: 'Every move must be a non-zero signed number.' };
      moves.push(value);
    }
    return { ok: true, moves, normalized: moves.map(value => `${value > 0 ? '+' : ''}${value}`).join(',') };
  }

  function validateRoute(level, raw) {
    const parsed = parseRoute(raw);
    if (!parsed.ok) return { ...parsed, code: 'invalid_format' };
    const expected = level.moves || [];
    if (parsed.moves.length !== expected.length) return { ok: false, code: 'move_count', moves: parsed.moves, message: `This mission needs exactly ${expected.length} moves.` };
    let depth = level.startDepth;
    const positions = [];
    let distance = 0;
    for (let i = 0; i < parsed.moves.length; i += 1) {
      const move = parsed.moves[i];
      depth += move;
      distance += Math.abs(move);
      if (depth > 0) return { ok: false, code: 'above_surface', step: i + 1, positions, finalDepth: depth, message: `Move ${i + 1} would take the submarine above sea level (+${depth}m).` };
      const hazard = (level.hazards || []).find(item => depth >= item.min && depth <= item.max);
      if (hazard) return { ok: false, code: 'hazard', step: i + 1, positions, finalDepth: depth, message: `Move ${i + 1} enters a hazard band from ${hazard.min}m to ${hazard.max}m.` };
      positions.push(depth);
      if (move !== expected[i]) return { ok: false, code: 'wrong_move', step: i + 1, positions, finalDepth: depth, message: `Move ${i + 1} is incorrect. Check the direction and distance at this waypoint.` };
    }
    const checkpointMismatch = (level.checkpoints || []).findIndex((checkpoint, index) => positions[index] !== checkpoint);
    if (checkpointMismatch >= 0) return { ok: false, code: 'checkpoint', step: checkpointMismatch + 1, positions, finalDepth: depth, message: `The submarine missed checkpoint ${checkpointMismatch + 1}. Recalculate that waypoint.` };
    if (level.maxDistance !== undefined && distance > level.maxDistance) return { ok: false, code: 'fuel', positions, finalDepth: depth, distance, message: `That route uses ${distance}m of fuel distance; the limit is ${level.maxDistance}m.` };
    return { ok: true, code: 'success', moves: parsed.moves, normalized: parsed.normalized, positions, finalDepth: depth, distance };
  }

  window.SubmarineMissionEngine = Object.freeze({ parseRoute, validateRoute });
}());
