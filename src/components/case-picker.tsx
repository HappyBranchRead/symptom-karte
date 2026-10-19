'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {cases} from '../lib/content';
import {ChartNumber} from './chart-number';

export function CasePicker() {
 const track = useRef<HTMLDivElement>(null);
 const [selected, setSelected] = useState(0);
 function syncSelection() {
  const container = track.current;
  if (!container || !matchMedia('(max-width: 540px)').matches) return;
  const cards = Array.from(container.children) as HTMLElement[];
  const origin = cards[0]?.offsetLeft || 0;
  let nearest = 0;
  cards.forEach((card, index) => {
   if (Math.abs(card.offsetLeft - origin - container.scrollLeft) < Math.abs(cards[nearest].offsetLeft - origin - container.scrollLeft)) nearest = index;
  });
  setSelected(nearest);
 }
 function select(index: number) {
  const container = track.current;
  if (!container) return;
  const card = container.children[Math.max(0, Math.min(cases.length - 1, index))] as HTMLElement;
  const first = container.children[0] as HTMLElement;
  container.scrollTo({left: card.offsetLeft - first.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
 }
 useEffect(() => {
  const observer = new ResizeObserver(syncSelection);
  if (track.current) observer.observe(track.current);
  return () => observer.disconnect();
 }, []);
 return <div className="case-picker">
  <div ref={track} id="case-picker-track" className="case-picker-track" role="region" aria-label="カルテを選ぶ" tabIndex={0} onScroll={syncSelection} onKeyDown={event => {
   if (event.target !== event.currentTarget) return;
   if (event.key === 'ArrowRight') {event.preventDefault(); select(selected + 1);}
   if (event.key === 'ArrowLeft') {event.preventDefault(); select(selected - 1);}
  }}>
   {cases.map(c => <article key={c.group} className="case-card picker-card">
    <ChartNumber number={c.group}/>
    <h3 className="card-title">{c.name}</h3>
    <h4 className="card-label">症状・課題</h4>
    <p className="case-scope">{c.feature} ／ {c.stages}</p>
    <p className="symptom-text">{c.summary}</p>
    <Link className="open-case" href={'/?g=' + c.group} aria-label={'カルテ 0' + c.group + '「' + c.name + '」を開く'}>カルテを開く →</Link>
   </article>)}
  </div>
  <div className="case-picker-controls">
   <button type="button" aria-label="前のカルテ" aria-controls="case-picker-track" disabled={selected === 0} onClick={() => select(selected - 1)}>←</button>
   <span className="case-picker-position" role="status" aria-live="polite" aria-atomic="true">{selected + 1} / {cases.length}</span>
   <button type="button" aria-label="次のカルテ" aria-controls="case-picker-track" disabled={selected === cases.length - 1} onClick={() => select(selected + 1)}>→</button>
  </div>
 </div>;
}
