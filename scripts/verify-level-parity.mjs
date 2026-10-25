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
  if (relativePath === 'SubmarineMath/levels.js') {
    vm.runInContext(source, context);
    return JSON.parse(JSON.stringify(context.window.SubmarineMathLevels));
  }
  if (relativePath === 'SignalDecrypter/levels.js') {
    vm.runInContext(source, context);
    return JSON.parse(JSON.stringify(context.window.SignalDecrypterLevels));
  }
  if (relativePath === 'Chemistry/levels.js') {
    vm.runInContext(source, context);
    return JSON.parse(JSON.stringify(context.window.ChemistryLevels));
  }
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
  if (gameId === 'submarine_math') {
    return { gameId, levelNumber: level.id, title: level.title,
      instruction: cleanInstruction(level.question), configuration: Object.fromEntries(Object.entries(level)
        .filter(([key]) => !['moves', 'numericVal', 'correctAnswer', 'question', 'hint', 'lessonRule', 'lessonSteps'].includes(key))) };
  }
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
  if (gameId === 'signal_decrypter') {
    return { gameId, levelNumber: level.id, title: level.title,
      instruction: cleanInstruction(level.question),
      configuration: { id: level.id, room: level.room, mode: level.mode } };
  }
  if (gameId === 'chemistry') {
    return { gameId, levelNumber: level.id, title: level.title,
      instruction: cleanInstruction(level.instruction),
      configuration: { compound: level.compound, formula: level.formula, mode: level.mode, atoms: level.atoms } };
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
    ['submarine_math', 'SubmarineMath/levels.js'],
    ['signal_decrypter', 'SignalDecrypter/levels.js'],
    ['chemistry', 'Chemistry/levels.js'],
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
