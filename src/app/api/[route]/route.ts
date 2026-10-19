import {createRoute} from '../../../lib/route.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = {params: Promise<{route: string}>};
async function handle(request: Request, context: Context) {
 const {route} = await context.params;
 if (!['karte', 'posts', 'all'].includes(route)) return Response.json({error: 'APIが見つかりません'}, {status: 404});
 return createRoute(route)(request);
}
export {handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH, handle as OPTIONS};
