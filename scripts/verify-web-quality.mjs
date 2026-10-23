import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'login.html', 'dashboard.html', 'PhysicsSim/index.html', 'RoboMaze/index.html', 'RoboMaze/creator.html', 'SubmarineMath/index.html', 'SignalDecrypter/index.html', 'Chemistry/index.html'];

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
    const csp = extractContentSecurityPolicy(html);
    if (hasUnsafeInlineScript(csp)) errors.push(`${relativePage}: script-src must not allow unsafe-inline`);
    if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${relativePage}: missing page title`);
    if (/<script\b[^>]*\bsrc=["']https?:/i.test(html)) errors.push(`${relativePage}: executable third-party scripts must be bundled locally`);

    for (const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
      const reference = match[1];
      if (/^(?:https?:|data:|mailto:|javascript:|\/\/)/i.test(reference)) continue;
      const target = resolveLocalReference(relativePage, reference);
      if (target && !fs.existsSync(target)) errors.push(`${relativePage}: missing local asset ${reference}`);
    }

    for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attributes = script[1];
      const body = script[2].trim();
      if (body && !/\bsrc=["']/i.test(attributes)) {
        errors.push(`${relativePage}: inline executable script remains`);
      }
    }
  }

  for (const gamePage of ['PhysicsSim/index.html', 'PhysicsSim/ui.js', 'RoboMaze/index.html', 'RoboMaze/ui.js']) {
    const html = fs.readFileSync(path.join(repositoryRoot, gamePage), 'utf8');
    for (const method of ['recordAttempt', 'recordMistake', 'analyzeMistake', 'recordAchievement']) {
      if (new RegExp(`StemGameAuth\\.${method}\\s*\\(`).test(html)) {
        errors.push(`${gamePage}: direct ${method} call bypasses the game adapter`);
      }
    }
  }

  const roboMaze = fs.readFileSync(path.join(repositoryRoot, 'RoboMaze/index.html'), 'utf8');
  if (/\son(?:click|change|input|load)=/i.test(roboMaze)) {
    errors.push('RoboMaze/index.html: inline event handler remains');
  }
  const physics = fs.readFileSync(path.join(repositoryRoot, 'PhysicsSim/index.html'), 'utf8');
  if (/\son(?:click|change|input|load)=/i.test(physics)) {
    errors.push('PhysicsSim/index.html: inline event handler remains');
  }

  for (const [page, label] of [['PhysicsSim/index.html', 'Projectile trajectory simulation'], ['RoboMaze/index.html', 'Robot maze game board'], ['SubmarineMath/index.html', 'Submarine depth navigation']]) {
    const html = fs.readFileSync(path.join(repositoryRoot, page), 'utf8');
    if (!new RegExp(`<canvas\\b[^>]*aria-label=["']${label}["']`, 'i').test(html)) {
      errors.push(`${page}: game canvas is missing its accessible label`);
    }
  }

  return errors;
}

export function extractContentSecurityPolicy(html) {
  const tag = html.match(/<meta\b(?=[^>]*\bhttp-equiv\s*=\s*(["'])Content-Security-Policy\1)[^>]*>/i)?.[0];
  if (!tag) return '';
  return (tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2] ?? '')
    .replace(/&apos;|&#0*39;|&#x0*27;/gi, "'")
    .replace(/&quot;|&#0*34;|&#x0*22;/gi, '"');
}

export function hasUnsafeInlineScript(csp) {
  return /(?:^|;)\s*script-src\b[^;]*'unsafe-inline'/i.test(csp);
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
