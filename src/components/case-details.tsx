import type {cases} from '../lib/content';
type Case = (typeof cases)[number];

export function CaseDetails({caseData: c}: {caseData: Case}) {
 return <section className="case-card symptom case-details">
  <h1>{c.name}</h1>
  <section className="clinical-entry"><h2 className="case-subheading">起きていること</h2><p className="symptom-text">{c.symptom}</p></section>
  <section className="clinical-entry"><h2 className="case-subheading">その影響</h2><p className="symptom-text">{c.impact}</p></section>
  <details className="case-background">
   <summary>このカルテの前提</summary>
  <dl className="case-context">
   <div><dt>関係する機能</dt><dd>{c.feature}</dd></div>
   <div><dt>関係する工程</dt><dd>{c.stages}</dd></div>
  </dl>
  <h2 className="case-subheading">この場面でのAIと人の作業</h2>
  <dl className="case-context">
   <div><dt>AIの作業</dt><dd>{c.ai}</dd></div>
   <div><dt>人の作業・確認</dt><dd>{c.human}</dd></div>
  </dl>
  </details>
 </section>;
}
