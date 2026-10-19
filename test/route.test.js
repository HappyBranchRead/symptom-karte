import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoute} from '../src/lib/route.js';

test('Web adapter preserves group validation, JSON errors and no-store headers', async () => {
 const route = createRoute('karte', () => {throw Error('must not connect');});
 for (const query of ['group=1&group=2', 'group=5', '']) {
  const response = await route(new Request('http://localhost/api/karte?' + query));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.ok((await response.json()).error);
 }
 const response = await route(new Request('http://localhost/api/karte?group=1', {method: 'PUT', body: '{bad'}));
 assert.equal(response.status, 400);
});

test('Web adapter forwards reads and atomic saves to the existing handler', async () => {
 let captured;
 const db = {hgetall: async () => ({root: '原因', remedy: '処方', rootRev: 2, remedyRev: 3}), get: async () => null,
  eval: async (...args) => {captured = args; return [1, 3, 4];}};
 const route = createRoute('karte', () => db);
 const read = await route(new Request('http://localhost/api/karte?group=1'));
 assert.equal(read.status, 200);
 assert.deepEqual((await read.json()).revisions, {root: 2, remedy: 3});
 const saved = await route(new Request('http://localhost/api/karte?group=1', {method: 'PUT', body: JSON.stringify({root: '新しい原因', remedy: '新しい処方', revisions: {root: 2, remedy: 3}})}));
 assert.deepEqual((await saved.json()).revisions, {root: 3, remedy: 4});
 assert.deepEqual(captured[1], ['board:1']);
 assert.deepEqual(captured[2].slice(0, 4), ['新しい原因', '新しい処方', 2, 3]);
 const invalidMethod = await route(new Request('http://localhost/api/karte?group=1', {method: 'DELETE'}));
 assert.equal(invalidMethod.status, 405);
 assert.equal(invalidMethod.headers.get('Allow'), 'GET, PUT');
});
