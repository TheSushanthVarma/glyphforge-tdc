// Post-build: rename out/_next -> out/n for hosts that reserve "_" paths (e.g. claude.ai artifacts).
import fs from 'node:fs'; import path from 'node:path';
const out = path.resolve('out');
fs.renameSync(path.join(out, '_next'), path.join(out, 'n'));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(out)) {
  if (!/\.(html|js|css|txt)$/.test(f)) continue;
  const s = fs.readFileSync(f, 'utf8'), r = s.replaceAll('_next/static', 'n/static').replaceAll('"./_next/"', '"./n/"').replaceAll('/_next/${', '/n/${');
  if (r !== s) fs.writeFileSync(f, r);
}
console.log('renamed _next -> n');
