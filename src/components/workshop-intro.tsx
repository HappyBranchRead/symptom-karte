import Link from 'next/link';
import {cases} from '../lib/content';
import {ChartNumber} from './chart-number';
import {ProjectOverview} from './project-overview';

export function WorkshopIntro() {
 return <main className="workshop-intro">
  <h1 className="page-title">AI駆動開発の改善案を考える</h1>
  <section className="workshop-section" aria-labelledby="project-heading">
   <h2 id="project-heading" className="section-title">プロジェクト概要</h2>
   <ProjectOverview/>
  </section>
  <section className="workshop-section" aria-labelledby="issues-heading">
   <h2 id="issues-heading" className="section-title">今回の課題</h2>
   <p className="workshop-description">このプロジェクトには、次の4つの症状が現れています。個人のAIの使い方に加え、チームの進め方や仕組みの観点から改善案を考えます。</p>
   <ul className="workshop-topics">{cases.map(c => <li key={c.group}><ChartNumber number={c.group}/><span>{c.name}</span></li>)}</ul>
  </section>
  <section className="workshop-section" aria-labelledby="flow-heading">
   <h2 id="flow-heading" className="section-title">ワークの進め方</h2>
   <ol className="workshop-flow">
    <li><strong>カルテを選ぶ</strong><span>話し合う症状のカルテを開き、起きていることと影響を確認します。</span></li>
    <li><strong>原因を話し合う</strong><span>必要に応じて「このカルテの前提」を読み、原因分析を記入します。</span></li>
    <li><strong>処方をまとめて共有する</strong><span>具体的な工夫や仕組みを処方に記入して保存し、カルテ一覧で共有します。</span></li>
   </ol>
  </section>
  <div className="workshop-start"><Link className="primary-link" href="/overview">カルテを選んでワークを始める →</Link></div>
 </main>;
}
