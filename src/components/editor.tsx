'use client';
import {useEffect, useRef, useState} from 'react';
import {cases} from '../lib/content';
import {CaseDetails} from './case-details';
import {LoadingIndicator} from './loading-indicator';
import {SaveActions} from './save-actions';
import {ChartNumber} from './chart-number';
import {api, ApiError, Chart, Field, fields, labels, placeholders, Revisions, storage} from '../lib/client';
type Draft = {value: string; revision: number; dirty: boolean};
type Drafts = Record<Field, Draft>;
const empty = (): Drafts => ({issue: {value: '', revision: 0, dirty: false}, root: {value: '', revision: 0, dirty: false}, remedy: {value: '', revision: 0, dirty: false}});
export function Editor({group}: {group: number}) {
 const [drafts, setDrafts] = useState<Drafts>(empty), draftRef = useRef(drafts);
 const [loaded, setLoaded] = useState(false), [saving, setSaving] = useState(false);
 const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false);
 const [message, setMessage] = useState('');
 const [conflict, setConflict] = useState<Chart | null>(null);
 const busy = useRef(false), fetching = useRef<Promise<Chart | null> | null>(null);
 const refreshRef = useRef<() => Promise<Chart | null>>(async () => null);
 const dirty = fields.some(field => drafts[field].dirty);
 const key = (field: Field) => `karte-summary-draft-${group}-${field}`;
 function update(next: Drafts) {draftRef.current = next; setDrafts(next);}
 useEffect(() => {
  let active = true, pending: Promise<Chart | null> | null = null;
  for (const field of fields) storage('removeItem', key(field));
  update(empty());
  async function refresh(): Promise<Chart | null> {
   if (pending) return pending;
   if (active) {setLoading(true); setLoadError(false);}
   pending = (async () => {
    try {
     const chart = await api<Chart>('karte?group=' + group);
     if (!active) return null;
     if (!busy.current) {
      const next = {...draftRef.current};
      for (const field of fields) if (!next[field].dirty) next[field] = {value: chart[field], revision: chart.revisions[field], dirty: false};
      update(next);
     }
     setLoaded(true); return chart;
    } catch {if (active) {setLoadError(true);} return null;}
    finally {pending = null; if (active) {fetching.current = null; setLoading(false);}}
   })();
   fetching.current = pending;
   return pending;
  }
  refreshRef.current = refresh;
  void refresh();
  const timer = setInterval(() => {if (!document.hidden && !busy.current) void refresh();}, 5000);
  const visibility = () => {if (!document.hidden && !busy.current) void refresh();};
  const unload = (event: BeforeUnloadEvent) => {if (busy.current || fields.some(f => draftRef.current[f].dirty)) {event.preventDefault(); event.returnValue = '';}};
  document.addEventListener('visibilitychange', visibility); window.addEventListener('beforeunload', unload);
  return () => {active = false; fetching.current = null; clearInterval(timer); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('beforeunload', unload);};
 }, [group]); // The editor is keyed by group; its draft lifecycle follows that group.
 function edit(field: Field, value: string) {
  const next = {...draftRef.current, [field]: {...draftRef.current[field], value, dirty: true}};
  update(next); setMessage('');
 }
 async function save(event: React.FormEvent) {
  event.preventDefault(); if (busy.current || !loaded || !dirty || conflict) return;
  busy.current = true; setSaving(true); setMessage('');
  try {
   if (fetching.current) await fetching.current;
   const snapshot = draftRef.current;
   const result = await api<{revisions: Revisions}>('karte?group=' + group, {method: 'PUT', body: JSON.stringify({issue: snapshot.issue.value, root: snapshot.root.value, remedy: snapshot.remedy.value, revisions: {issue: snapshot.issue.revision, root: snapshot.root.revision, remedy: snapshot.remedy.revision}})});
   const next = {...snapshot};
   for (const field of fields) {next[field] = {...snapshot[field], revision: result.revisions[field], dirty: false}; storage('removeItem', key(field));}
   update(next); setMessage('カルテを保存しました。');
  } catch (error) {
   setMessage(error instanceof Error ? error.message : '保存できませんでした。もう一度お試しください。');
   if (error instanceof ApiError && error.status === 409) {
    const latest = await refreshRef.current();
    if (latest) setConflict(latest);
   }
  } finally {busy.current = false; setSaving(false);}
 }
 function confirmConflict() {
  if (!conflict) return;
  const next = {...draftRef.current};
  for (const field of fields) {next[field] = {value: next[field].dirty ? next[field].value : conflict[field], revision: conflict.revisions[field], dirty: next[field].dirty};}
  update(next); setConflict(null); setMessage('最新の内容を確認しました。下書きを見直してから保存してください。');
 }
 const c = cases[group - 1];
 return <><div className="section-head editor-toolbar"><ChartNumber number={group}/>{!loaded && loading ? <LoadingIndicator/> : loadError ? <span className="connection" role="status">接続を確認してください</span> : null}</div><CaseDetails caseData={c}/><form className="direct-entry" onSubmit={save}><div className="grid entry-fields">{fields.map(field => <section className="summary-card" data-field={field} key={field}><label className="field-label" htmlFor={'summary-' + field}>{labels[field]}</label><textarea id={'summary-' + field} maxLength={2000} rows={field === 'issue' ? 4 : 6} disabled={saving || !loaded} value={drafts[field].value} onChange={event => edit(field, event.target.value)} placeholder={placeholders[field]}/><div className="character-count">{drafts[field].value.length} / 2,000文字</div></section>)}</div>{conflict && <section className="conflict" role="alert"><h2>ほかの参加者が更新しました</h2><p>下書きは残っています。最新の内容と見比べてから、編集を続けてください。</p>{fields.map(field => <div key={field}><h3>最新の{labels[field]}</h3><p className="answer">{conflict[field] || '（未入力）'}</p></div>)}<button type="button" onClick={confirmConflict}>最新の内容を確認して編集を続ける</button></section>}<p className="edit-message" role="status">{message}</p><SaveActions><span className="field-status" role="status">{saving ? '保存中…' : dirty ? '未保存' : loaded ? '保存済み' : '読み込み中'}</span><button className="primary" disabled={!loaded || !dirty || saving || Boolean(conflict)}>{saving ? '保存中…' : 'カルテを保存'}</button></SaveActions>{!loaded && !loading && loadError && <button type="button" onClick={() => void refreshRef.current()}>接続を再試行</button>}</form></>;
}
