import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('..', import.meta.url));
if (process.env.NODE_ENV === 'production') throw new Error('Use npm run server for production; development login is local only.');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 200).unref();
}
function start(args, env = process.env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
}
start(['--import', 'tsx', 'server/index.ts'], { ...process.env, DEV_AUTH: process.env.DEV_AUTH ?? '1' });
start(['node_modules/vite/bin/vite.js', '--configLoader', 'runner']);
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
