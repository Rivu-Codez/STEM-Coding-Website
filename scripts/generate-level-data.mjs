import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const games = [
  { id: 'physics', file: 'PhysicsSim/levels.js' },
  { id: 'robo_maze', file: 'RoboMaze/levels.js' },
  { id: 'submarine_math', file: 'SubmarineMath/levels.js' },
  { id: 'signal_decrypter', file: 'SignalDecrypter/levels.js' },
  { id: 'chemistry', file: 'Chemistry/levels.js' },
];

function cleanInstruction(value) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function frontendFile(game, levels) {
  const json = JSON.stringify(levels, null, 2);
  if (game.id === 'physics' || game.id === 'robo_maze') {
    return `// Generated from data/levels/${game.id}.json. Run npm run generate:levels.\nconst ALL_LEVELS = ${json};\nconst LEVELS = ALL_LEVELS.slice(0, 15);\nwindow.LEVELS = LEVELS;\nwindow.ALL_LEVELS = ALL_LEVELS;\nexport { LEVELS, ALL_LEVELS };\n`;
  }
  if (game.id === 'submarine_math') return `// Generated from data/levels/${game.id}.json. Run npm run generate:levels.\nwindow.SubmarineMathLevels = ${json};\n`;
  if (game.id === 'signal_decrypter') return `// Generated from data/levels/${game.id}.json. Run npm run generate:levels.\nwindow.SignalDecrypterLevels = Object.freeze(${json}.map(level => Object.freeze(level)));\n`;
  return `// Generated from data/levels/${game.id}.json. Run npm run generate:levels.\nwindow.ChemistryLevels = ${json};\n`;
}

function normalizedRow(gameId, level, index) {
  if (gameId === 'physics') {
    const { title, instruction, targetDistance, lockSpeed, lockDrag, fixedSpeed, wall, dragMode, targetTolerance, requiredDrag, minAngle, maxAngle, debugSetup } = level;
    return { number: index + 1, title, instruction: cleanInstruction(instruction), config: {
      targetDistance, lockSpeed, lockDrag, fixedSpeed, wall: wall ?? null, dragMode: dragMode ?? null,
      targetTolerance: targetTolerance ?? null,
      ...(requiredDrag === undefined ? {} : { requiredDrag }), ...(minAngle === undefined ? {} : { minAngle }),
      ...(maxAngle === undefined ? {} : { maxAngle }), ...(debugSetup === undefined ? {} : { debugSetup }),
    } };
  }
  if (gameId === 'robo_maze') {
    const { title, instruction, grid, start, requiredBlock, maxBlocks } = level;
    return { number: index + 1, title, instruction: cleanInstruction(instruction), config: {
      grid, start, ...(requiredBlock === undefined ? {} : { requiredBlock }), ...(maxBlocks === undefined ? {} : { maxBlocks }),
    } };
  }
  if (gameId === 'submarine_math') {
    const { question, hint, lessonRule, lessonSteps, ...configuration } = level;
    return { number: level.id, title: level.title, instruction: cleanInstruction(question), config: configuration };
  }
  if (gameId === 'signal_decrypter') {
    const availableOperations = level.operations.map(operation => operation.type);
    return { number: level.id, title: level.title, instruction: cleanInstruction(level.question), config: {
      id: level.id, question: level.question, signal: level.signal, mode: level.mode, timeLimit: level.timeLimit,
      interferenceLimit: level.interferenceLimit, hintCost: level.hintCost,
      ...(level.mode === 'blocks' ? { availableOperations } : {}),
    } };
  }
  return { number: level.id, title: level.title, instruction: cleanInstruction(level.instruction), config: {
    compound: level.compound, formula: level.formula, mode: level.mode, atoms: level.atoms,
  } };
}

function quote(value) { return `'${String(value).replaceAll("'", "''")}'`; }

function buildSeed(manifests) {
  const rows = games.flatMap(game => manifests.get(game.id).map((level, index) => ({ gameId: game.id, ...normalizedRow(game.id, level, index) })));
  const values = rows.map(row => `  (${quote(row.gameId)}, ${row.number}, ${quote(row.title)}, ${quote(row.instruction)}, '${JSON.stringify(row.config).replaceAll("'", "''")}'::jsonb, false, null)`).join(',\n');
  return `-- Generated from data/levels/*.json. Run npm run generate:levels.\n-- Answer keys remain in server migrations and are not stored in these public manifests.\n\ninsert into public.game_levels\n  (game_id, level_number, title, instruction, configuration, is_bonus, bonus_number)\nvalues\n${values}\non conflict (game_id, level_number) do update set\n  title = excluded.title, instruction = excluded.instruction, configuration = excluded.configuration,\n  is_bonus = excluded.is_bonus, bonus_number = excluded.bonus_number;\n`;
}

export function generateLevelData({ check = false, repositoryRoot = root } = {}) {
  const manifests = new Map();
  const differences = [];
  for (const game of games) {
    const manifestPath = path.join(repositoryRoot, 'data/levels', `${game.id}.json`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.gameId !== game.id || !Array.isArray(manifest.levels)) throw new Error(`Invalid level manifest: ${manifestPath}`);
    const serialized = JSON.stringify(manifest.levels);
    if (/"(?:answer|answerKey|correctAnswer|solution|expectedAnswer)"\s*:/i.test(serialized)) throw new Error(`${game.id} public manifest contains an answer key.`);
    manifests.set(game.id, manifest.levels);
    const generated = frontendFile(game, manifest.levels);
    const target = path.join(repositoryRoot, game.file);
    if (check) {
      if (fs.readFileSync(target, 'utf8') !== generated) differences.push(`${game.id}: frontend level file differs from manifest`);
    } else fs.writeFileSync(target, generated);
  }
  const seedPath = path.join(repositoryRoot, 'supabase/seed/001_game_levels.sql');
  const generatedSeed = buildSeed(manifests);
  if (check) {
    if (fs.readFileSync(seedPath, 'utf8') !== generatedSeed) differences.push('seed SQL differs from level manifests');
  } else fs.writeFileSync(seedPath, generatedSeed);
  return differences;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const differences = generateLevelData({ check: process.argv.includes('--check') });
  if (differences.length) {
    console.error(differences.join('\n'));
    process.exitCode = 1;
  } else console.log(process.argv.includes('--check') ? 'Level manifest parity passed.' : 'Generated frontend levels and seed SQL.');
}
