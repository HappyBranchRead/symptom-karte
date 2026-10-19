import {ProjectOverview} from './project-overview';
import {Overview} from './overview';

export function WorkshopOverview() {
 return <main className="overview">
  <h1 className="page-title">AI駆動開発の改善案を考える</h1>
  <section className="workshop-section" aria-labelledby="project-heading">
   <h2 id="project-heading" className="section-title">プロジェクト概要</h2>
   <ProjectOverview/>
  </section>
  <section className="workshop-section" aria-labelledby="charts-heading">
   <h2 id="charts-heading" className="section-title">チームのカルテ</h2>
   <Overview/>
  </section>
 </main>;
}
