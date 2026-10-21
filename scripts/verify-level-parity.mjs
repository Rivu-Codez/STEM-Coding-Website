import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadFrontendLevels(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
    .replace(/export\s*\{[^}]+\};?/g, '');
  const context = {};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__levels = LEVELS; globalThis.__allLevels = typeof ALL_LEVELS === 'undefined' ? LEVELS : ALL_LEVELS;`, context);
  return context.__allLevels;
}

function parseSeedRows() {
  const rows = [];
  for (const line of fs.readFileSync(path.join(root, 'supabase/seed/001_game_levels.sql'), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*\('([^']+)',\s*(\d+),\s*'((?:''|[^'])*)',\s*'((?:''|[^'])*)',\s*'(.+)'::jsonb,\s*(?:true|false),/);
    if (!match) continue;
    rows.push({
      gameId: match[1],
      levelNumber: Number(match[2]),
      title: match[3].replaceAll("''", "'"),
      instruction: match[4].replaceAll("''", "'"),
      configuration: JSON.parse(match[5].replaceAll("''", "'")),
    });
  }
  return rows;
}

function cleanInstruction(value) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizedFrontend(gameId, level, index) {
  if (gameId === 'physics') {
    const { title, instruction, targetDistance, lockSpeed, lockDrag, fixedSpeed, wall, dragMode,
      targetTolerance, requiredDrag, minAngle, maxAngle, debugSetup } = level;
    return { gameId, levelNumber: index + 1, title, instruction: cleanInstruction(instruction),
      configuration: { targetDistance, lockSpeed, lockDrag, fixedSpeed, wall: wall ?? null,
        dragMode: dragMode ?? null, targetTolerance: targetTolerance ?? null,
        ...(requiredDrag === undefined ? {} : { requiredDrag }),
        ...(minAngle === undefined ? {} : { minAngle }),
        ...(maxAngle === undefined ? {} : { maxAngle }),
        ...(debugSetup === undefined ? {} : { debugSetup }) } };
  }
  const { title, instruction, grid, start, requiredBlock, maxBlocks } = level;
  return { gameId, levelNumber: index + 1, title, instruction: cleanInstruction(instruction),
    configuration: { grid, start, ...(requiredBlock === undefined ? {} : { requiredBlock }),
      ...(maxBlocks === undefined ? {} : { maxBlocks }) } };
}

function compare(left, right, pathName, differences) {
  if (JSON.stringify(left) !== JSON.stringify(right)) differences.push(`${pathName}: frontend and seed values differ`);
}

export function verifyLevelParity(repositoryRoot = root) {
  const differences = [];
  const seed = parseSeedRows();
  const games = [
    ['physics', 'PhysicsSim/levels.js'],
    ['robo_maze', 'RoboMaze/levels.js'],
  ];
  for (const [gameId, file] of games) {
    const frontend = loadFrontendLevels(file).map((level, index) => normalizedFrontend(gameId, level, index));
    const rows = seed.filter((row) => row.gameId === gameId);
    if (frontend.length !== rows.length) differences.push(`${gameId}: level count differs (${frontend.length} vs ${rows.length})`);
    for (let index = 0; index < Math.max(frontend.length, rows.length); index += 1) {
      const left = frontend[index];
      const right = rows[index];
      if (!left || !right) continue;
      compare(left.levelNumber, right.levelNumber, `${gameId} level ${index + 1} number`, differences);
      compare(left.title, right.title, `${gameId} level ${index + 1} title`, differences);
      compare(left.instruction, cleanInstruction(right.instruction), `${gameId} level ${index + 1} instruction`, differences);
      compare(left.configuration, right.configuration, `${gameId} level ${index + 1} configuration`, differences);
    }
  }
  return differences;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const differences = verifyLevelParity();
  if (differences.length) {
    console.error(differences.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Level parity verification passed.');
  }
}
