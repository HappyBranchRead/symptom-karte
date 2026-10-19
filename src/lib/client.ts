export type Field = 'root' | 'remedy';
export type Revisions = Record<Field, number>;
export type Chart = Record<Field, string> & {group: number; revisions: Revisions; updatedAt: string | null};
export const labels: Record<Field, string> = {root: '原因分析', remedy: '処方'};
export const fields: Field[] = ['root', 'remedy'];
export function storage(method: 'getItem' | 'setItem' | 'removeItem', key: string, value = '') {
 try { if (method === 'getItem') return localStorage.getItem(key); if (method === 'setItem') localStorage.setItem(key, value); else localStorage.removeItem(key); } catch {}
 return null;
}
export class ApiError extends Error {
 constructor(message: string, public status = 0) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
 let response;
 try { response = await fetch('/api/' + path, {...options, cache: 'no-store', signal: AbortSignal.timeout(15000), headers: {'Content-Type': 'application/json', ...options.headers}}); }
 catch { throw new ApiError('通信を確認して、もう一度お試しください。下書きはこの端末に残っています。'); }
 let result;
 try { result = await response.json(); } catch { throw new ApiError('接続できませんでした。時間をおいて再試行してください。'); }
 if (!response.ok) throw new ApiError(result.error || '通信に失敗しました', response.status);
 return result;
}
