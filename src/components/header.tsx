'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect} from 'react';
import {storage} from '../lib/client';
export function Header() {
 const pathname = usePathname();
 useEffect(() => {const theme = storage('getItem', 'karte-theme'); if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;}, []);
 function toggle() {
  const current = document.documentElement.dataset.theme;
  const dark = current ? current === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme; storage('setItem', 'karte-theme', theme);
 }
 return <header><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">＋</span>AI開発クリニック</Link><nav>{pathname !== '/overview' && <Link href="/overview">チームのカルテ ↗</Link>}<button type="button" className="theme-toggle" aria-label="配色を切り替え" onClick={toggle}>◐</button></nav></header>;
}
