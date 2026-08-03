import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

function loadWorker({
  cacheKeys = [],
  fetchImpl = async () => makeResponse(),
  matchImpl = async () => undefined,
} = {}) {
  const listeners = {};
  const state = {
    addedAssets: [],
    claimed: 0,
    deleted: [],
    puts: [],
    skipWaiting: 0,
  };

  const cache = {
    async addAll(assets) {
      state.addedAssets.push(...assets);
    },
    async put(request, response) {
      state.puts.push({ request, response });
    },
    async match(request) {
      return matchImpl(request);
    },
  };

  const self = {
    registration: { scope: 'https://example.test/yoyo-words/' },
    clients: {
      async claim() {
        state.claimed += 1;
      },
    },
    async skipWaiting() {
      state.skipWaiting += 1;
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
  };

  const caches = {
    async delete(key) {
      state.deleted.push(key);
      return true;
    },
    async keys() {
      return cacheKeys;
    },
    async open() {
      return cache;
    },
  };

  vm.runInNewContext(workerSource, {
    URL,
    caches,
    fetch: fetchImpl,
    Promise,
    self,
  });

  return { listeners, state };
}

function makeResponse({
  ok = true,
  type = 'basic',
  url = 'https://example.test/yoyo-words/index.html',
  cacheControl = '',
} = {}) {
  return {
    ok,
    type,
    url,
    headers: { get: () => cacheControl },
    clone() {
      return { ...this };
    },
  };
}

test('service worker lifecycle waits for activation and only deletes its own old caches', async () => {
  const { listeners, state } = loadWorker({
    cacheKeys: ['yoyo-words-v14', 'yoyo-words-v21', 'yoyo-words-v22', 'yoyo-words-v23', 'yoyo-words-v24', 'yoyo-words-v25', 'yoyo-words-v26', 'yoyo-words-v27', 'yoyo-words-v28', 'another-app-v9', 'shared-cache'],
  });

  let installWork;
  listeners.install({ waitUntil: (promise) => { installWork = promise; } });
  await installWork;
  assert.equal(state.skipWaiting, 1);
  assert.ok(state.addedAssets.includes('./index.html'));
  assert.ok(state.addedAssets.includes('./css/style.css?v=28'));
  assert.ok(state.addedAssets.includes('./js/app.js?v=28'));
  assert.ok(state.addedAssets.includes('./js/speech.js'));
  assert.ok(state.addedAssets.includes('./js/adult-words.js'));

  let activateWork;
  listeners.activate({ waitUntil: (promise) => { activateWork = promise; } });
  await activateWork;
  assert.deepEqual(state.deleted, ['yoyo-words-v14', 'yoyo-words-v21', 'yoyo-words-v22', 'yoyo-words-v23', 'yoyo-words-v24', 'yoyo-words-v25', 'yoyo-words-v26', 'yoyo-words-v27']);
  assert.equal(state.claimed, 1);
});

test('service worker only handles same-origin GET requests inside its scope', async () => {
  let fetchCount = 0;
  const { listeners, state } = loadWorker({
    fetchImpl: async () => {
      fetchCount += 1;
      return makeResponse();
    },
  });

  for (const request of [
    { method: 'POST', url: 'https://example.test/yoyo-words/index.html' },
    { method: 'GET', url: 'https://example.test/other-app/index.html' },
    { method: 'GET', url: 'https://cdn.example.test/yoyo-words/index.html' },
  ]) {
    let responded = false;
    listeners.fetch({
      request,
      respondWith: () => { responded = true; },
      waitUntil: () => {},
    });
    assert.equal(responded, false);
  }

  const waits = [];
  let responsePromise;
  const request = { method: 'GET', url: 'https://example.test/yoyo-words/index.html' };
  listeners.fetch({
    request,
    respondWith: (promise) => { responsePromise = promise; },
    waitUntil: (promise) => { waits.push(promise); },
  });

  assert.equal((await responsePromise).ok, true);
  await Promise.all(waits);
  assert.equal(fetchCount, 1);
  assert.equal(state.puts.length, 1);
  assert.equal(state.puts[0].request, request);
});

test('service worker skips unsuitable responses and falls back to cache offline', async () => {
  const notFound = makeResponse({ ok: false });
  let setup = loadWorker({ fetchImpl: async () => notFound });
  let responsePromise;
  const waits = [];
  setup.listeners.fetch({
    request: { method: 'GET', url: 'https://example.test/yoyo-words/missing.js' },
    respondWith: (promise) => { responsePromise = promise; },
    waitUntil: (promise) => { waits.push(promise); },
  });
  assert.equal(await responsePromise, notFound);
  assert.equal(waits.length, 1);
  await Promise.all(waits);
  assert.equal(setup.state.puts.length, 0);

  const cached = { source: 'cache' };
  setup = loadWorker({
    fetchImpl: async () => { throw new Error('offline'); },
    matchImpl: async () => cached,
  });
  setup.listeners.fetch({
    request: { method: 'GET', url: 'https://example.test/yoyo-words/index.html' },
    respondWith: (promise) => { responsePromise = promise; },
    waitUntil: () => {},
  });
  assert.equal(await responsePromise, cached);
});

test('manifest pins the app identity and does not claim maskable icons', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8')
  );
  assert.equal(manifest.id, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.start_url, './');
  assert.ok(manifest.icons.every((icon) => icon.purpose === 'any'));
});
