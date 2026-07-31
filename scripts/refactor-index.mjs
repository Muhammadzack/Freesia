import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(process.cwd());
const indexPath = resolve(root, 'index.html');
const backupPath = resolve(root, 'index.backup.html');
const cssPath = resolve(root, 'assets/css/app.css');
const jsPath = resolve(root, 'assets/js/app.js');

const html = await readFile(indexPath, 'utf8');

const styleMatches = [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)];
const inlineScriptMatches = [...html.matchAll(/<script(?![^>]*\bsrc=)(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];

if (styleMatches.length !== 1) {
  throw new Error(`Expected exactly 1 inline <style> block, found ${styleMatches.length}`);
}

if (inlineScriptMatches.length < 1) {
  throw new Error('No inline <script> block found');
}

const appScriptMatch = inlineScriptMatches.find(
  (match) => match[1].includes('CHAIN_ID_EXPECTED')
);

if (!appScriptMatch) {
  throw new Error(
    `Could not identify the Freesia application script among ${inlineScriptMatches.length} inline script blocks`
  );
}

const css = styleMatches[0][1].trim() + '\n';
const js = appScriptMatch[1].trim() + '\n';

if (!css.includes(':root') || !js.includes('CHAIN_ID_EXPECTED')) {
  throw new Error('Safety check failed: extracted content does not look like the Freesia application');
}

await mkdir(dirname(cssPath), { recursive: true });
await mkdir(dirname(jsPath), { recursive: true });
await copyFile(indexPath, backupPath);
await writeFile(cssPath, css, 'utf8');
await writeFile(jsPath, js, 'utf8');

let nextHtml = html.replace(styleMatches[0][0], '    <link rel="stylesheet" href="/assets/css/app.css">');
nextHtml = nextHtml.replace(appScriptMatch[0], '    <script src="/assets/js/app.js" defer></script>');

// Remove repeated empty lines without touching visible content.
nextHtml = nextHtml.replace(/\n{4,}/g, '\n\n\n');

await writeFile(indexPath, nextHtml, 'utf8');

console.log('Refactor complete');
console.log(`- backup: ${backupPath}`);
console.log(`- CSS: ${cssPath}`);
console.log(`- JS: ${jsPath}`);
console.log(`- index: ${indexPath}`);
console.log('\nNext checks:');
console.log('1. Open index.html through a local HTTP server');
console.log('2. Test wallet connect, swap quote, pool, earn, portfolio, stats, and language/theme toggles');
console.log('3. Commit index.html and assets/, then delete index.backup.html after verification');
