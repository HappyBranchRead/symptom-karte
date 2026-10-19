import Link from 'next/link';
import {Overview} from './overview';

export function WorkshopOverview() {
 return <main className="overview">
  <Link href="/" className="back-link">← プロジェクト概要・ワークの進め方</Link>
  <h1 className="page-title">チームのカルテ</h1>
  <Overview/>
 </main>;
}
