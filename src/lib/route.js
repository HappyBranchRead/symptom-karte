import {createHandler} from '../../lib/api.js';

// Keep the existing, tested API behavior behind a Web Request/Response adapter.
export function createRoute(route, getRedis) {
 return async request => {
  const url = new URL(request.url), groups = url.searchParams.getAll('group');
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
  let status = 200, payload;
  const headers = new Headers();
  const response = {setHeader(key, value) {headers.set(key, value);}, status(value) {status = value; return this;}, json(value) {payload = value;}};
  await createHandler(route, getRedis)({method: request.method, body, query: {group: groups.length > 1 ? groups : groups[0]}, headers: {}}, response);
  return Response.json(payload, {status, headers});
 };
}
