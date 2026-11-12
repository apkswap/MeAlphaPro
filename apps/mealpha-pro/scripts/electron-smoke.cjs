const { spawn } = require('node:child_process');
const path = require('node:path');

const executable = process.argv[2] || path.resolve(__dirname, '..', 'release', 'win-unpacked', 'MeAlpha Pro.exe');
const child = spawn(executable, ['--smoke-test'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', (chunk) => process.stdout.write(chunk));
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
let finished = false;
const timeout = setTimeout(() => {
  if (finished) return;
  finished = true;
  child.kill();
  console.error('Windows packaged-app smoke test timed out after 35 seconds.');
  process.exitCode = 1;
}, 35000);

child.once('error', (error) => {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  console.error('Could not launch the packaged MeAlpha Pro application:', error.message);
  process.exitCode = 1;
});

child.once('exit', (code, signal) => {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  if (code !== 0) {
    console.error(`Packaged-app smoke test failed (exit=${code}, signal=${signal || 'none'}).`);
    process.exitCode = 1;
    return;
  }
  console.log('Packaged Windows app launched and mounted its renderer successfully.');
});
