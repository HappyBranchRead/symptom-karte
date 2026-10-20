'use client';
import Link from 'next/link';
import {CasePicker} from './case-picker';
import {LoadingIndicator} from './loading-indicator';
import {ChartNumber} from './chart-number';
import {useEffect, useState} from 'react';
import {cases} from '../lib/content';
import {api, Chart, fields, labels, placeholders} from '../lib/client';
export function Overview() {
 const [charts, setCharts] = useState<Chart[] | null>(null);
 const [retry, setRetry] = useState(0);
 const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
 useEffect(() => {
  let active = true, refreshing = false;
  async function refresh() {
   if (refreshing) return; refreshing = true;
   if (active) {setLoading(true); setError(null);}
   try {const data = await api<{groups: Chart[]}>('all'); if (active) {setCharts(data.groups);}}
   catch (error) {if (active) {setError(error instanceof Error ? error.message : '取得できませんでした');}}
   finally {refreshing = false; if (active) setLoading(false);}
  }
  void refresh(); const timer = setInterval(() => {if (!document.hidden) void refresh();}, 5000);
  const visibility = () => {if (!document.hidden) void refresh();}; document.addEventListener('visibilitychange', visibility);
  return () => {active = false; clearInterval(timer); document.removeEventListener('visibilitychange', visibility);};
 }, [retry]);
 return <><details className="discussion-hints"><summary>議論のヒント</summary><p>話し合いに迷ったときの参考にしてください。すべてに答える必要はありません。</p><dl>{fields.map(field => <div key={field}><dt>{labels[field]}</dt><dd>{placeholders[field]}</dd></div>)}</dl></details>{charts ? <><div className="overview-picker"><CasePicker/></div><div className="grid overview-grid">{charts.map(chart => {const c = cases[chart.group - 1]; return <Link key={chart.group} className="overview-item" href={'/?g=' + chart.group} aria-label={'カルテ 0' + chart.group + ' ' + c.name + 'を編集する'}><article className="case-card chart"><ChartNumber number={chart.group}/><h2 className="card-title">{c.name}</h2><h3 className="card-label">この場面の出来事</h3><p className="case-scope">{c.feature} ／ {c.stages}</p><p className="symptom-text">{c.summary}</p><div className="chart-summary">{fields.map(field => <section key={field}><h3>{labels[field]}</h3><p className={'answer' + (chart[field] ? '' : ' placeholder')}>{chart[field] || 'まだ記入されていません'}</p></section>)}</div></article></Link>;})}</div></> : <div className="empty-state">{loading ? <LoadingIndicator/> : <><p role="alert">{error}</p><button onClick={() => setRetry(value => value + 1)}>再読み込み</button></>}</div>}</>;
}
