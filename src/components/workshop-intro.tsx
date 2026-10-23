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
   <p className="workshop-description">このチームはAIによる実装・テストに加え、共通ルールやレビューの仕組みも導入しています。各グループでカルテを1つ選び、改善したい場面を1つに絞ります。現在の仕組みがどう機能しているかを考え、次の開発で試せる具体的な改善案をまとめましょう。</p>
   <ul className="workshop-topics">{cases.map(c => <li key={c.group}><ChartNumber number={c.group}/><span>{c.name}</span></li>)}</ul>
  </section>
  <section className="workshop-section" aria-labelledby="flow-heading">
   <h2 id="flow-heading" className="section-title">ワークの進め方</h2>
   <p className="workshop-description">目安は25分です。特定のツールや技術を使う必要はありません。設定やコードを完成させるより、改善案を実際にどう動かすかを説明できることを目指します。</p>
   <ol className="workshop-flow">
    <li><strong>現在の運用と出来事をたどる（5分）</strong><span>カルテの「現在のAI活用とチームの運用」と「この場面で起きたこと」を読み、「このカルテの前提」でAIに依頼したことと担当者が確認したことを確かめます。うまく機能している点にも目を向けます。</span></li>
    <li><strong>取り組む問題を1つ選ぶ（5分）</strong><span>誰が何に困っているかを話し合い、今回扱う問題を「着目した問題」に記入します。</span></li>
    <li><strong>原因の仮説と処方を考える（10分）</strong><span>原因を事実と推測に分けて考え、AI・ツール・人の役割と、渡す情報・受け取る結果を具体化します。不足する情報は仮定や確認事項として残します。</span></li>
    <li><strong>次に試す形にまとめる（5分）</strong><span>「いつ動かす → 何を渡して何をする → 結果を誰が確認し、次へつなぐ」の流れと、効果の確かめ方を「試す処方」に書きます。このあと全体で共有します。</span></li>
   </ol>
  </section>
  <div className="workshop-start"><Link className="primary-link" href="/overview">カルテを選んでワークを始める →</Link></div>
 </main>;
}
