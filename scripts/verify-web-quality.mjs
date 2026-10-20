import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'login.html', 'dashboard.html', 'PhysicsSim/index.html', 'RoboMaze/index.html'];
const pinnedSupabase = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0';

function resolveLocalReference(page, reference) {
  const cleanReference = reference.split(/[?#]/, 1)[0];
  if (!cleanReference || cleanReference.startsWith('#')) return null;
  return path.resolve(path.dirname(path.join(root, page)), cleanReference);
}

export function verifyWebQuality(repositoryRoot = root) {
  const errors = [];

  for (const relativePage of pages) {
    const pagePath = path.join(repositoryRoot, relativePage);
    if (!fs.existsSync(pagePath)) {
      errors.push(`Missing web page: ${relativePage}`);
      continue;
    }

    const html = fs.readFileSync(pagePath, 'utf8');
    if (!/<html\b[^>]*\blang=["'][^"']+["']/i.test(html)) errors.push(`${relativePage}: missing html lang`);
    if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) errors.push(`${relativePage}: missing viewport metadata`);
    if (!/<meta\b[^>]*name=["']referrer["'][^>]*strict-origin-when-cross-origin/i.test(html)) errors.push(`${relativePage}: missing referrer policy`);
    if (!/<meta\b[^>]*http-equiv=["']Content-Security-Policy["']/i.test(html)) errors.push(`${relativePage}: missing content security policy`);
    if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${relativePage}: missing page title`);
    if (html.includes('@supabase/supabase-js@') && !html.includes(pinnedSupabase)) {
      errors.push(`${relativePage}: Supabase browser dependency is not pinned`);
    }

    for (const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
      const reference = match[1];
      if (/^(?:https?:|data:|mailto:|javascript:|\/\/)/i.test(reference)) continue;
      const target = resolveLocalReference(relativePage, reference);
      if (target && !fs.existsSync(target)) errors.push(`${relativePage}: missing local asset ${reference}`);
    }
  }

  for (const gamePage of ['PhysicsSim/index.html', 'RoboMaze/index.html']) {
    const html = fs.readFileSync(path.join(repositoryRoot, gamePage), 'utf8');
    for (const method of ['recordAttempt', 'recordMistake', 'analyzeMistake', 'recordAchievement']) {
      if (new RegExp(`StemGameAuth\\.${method}\\s*\\(`).test(html)) {
        errors.push(`${gamePage}: direct ${method} call bypasses the game adapter`);
      }
    }
  }

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = verifyWebQuality();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Web quality verification passed.');
  }
}
