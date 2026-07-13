import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));

function request(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        body: Buffer.concat(chunks).toString('utf8'),
        headers: response.headers,
        status: response.statusCode,
      }));
    });
    req.on('error', reject);
  });
}

function waitForPort(child) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => reject(new Error(`server startup timed out: ${stderr}`)), 5000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const match = stdout.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      if (code && !stdout.match(/http:\/\/127\.0\.0\.1:(\d+)/)) {
        clearTimeout(timeout);
        reject(new Error(`server exited with ${code}: ${stderr}`));
      }
    });
  });
}

test('development server serves app files but blocks hidden paths and listings', async (t) => {
  const child = spawn('python3', ['-u', 'serve.py', '--host', '127.0.0.1', '--port', '0'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await once(child, 'exit');
    }
  });

  const port = await waitForPort(child);
  const home = await request(port, '/index.html');
  assert.equal(home.status, 200);
  assert.match(home.headers['cache-control'], /no-store/);

  for (const path of [
    '/.git/config',
    '/%2egit/config',
    '/%252egit/config',
    '/assets/%2e%2e/.git/config',
  ]) {
    assert.equal((await request(port, path)).status, 404, path);
  }

  assert.equal((await request(port, '/tests/')).status, 404);
  assert.equal((await request(port, '/manifest.webmanifest')).status, 200);
});
