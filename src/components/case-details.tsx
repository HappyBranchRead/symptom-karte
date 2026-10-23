import type {cases} from '../lib/content';
type Case = (typeof cases)[number];

export function CaseDetails({caseData: c}: {caseData: Case}) {
 return <section className="case-card symptom case-details">
  <h1>{c.name}</h1>
  <section className="clinical-entry"><h2 className="case-subheading">この場面の出来事</h2><p className="case-scope">{c.feature} ／ {c.stages}</p><p className="symptom-text">{c.summary}</p></section>
  <section className="clinical-entry"><h2 className="case-subheading">現在のAI活用とチームの運用</h2><p className="symptom-text">{c.operation}</p></section>
  <section className="clinical-entry"><h2 className="case-subheading">この場面で起きたこと</h2><p className="symptom-text">{c.symptom}</p></section>
  <section className="clinical-entry"><h2 className="case-subheading">その後の状況</h2><p className="symptom-text">{c.impact}</p></section>
  <details className="case-background" open>
   <summary>このカルテの前提</summary>
  <dl className="case-context">
   <div><dt>関係する機能</dt><dd>{c.feature}</dd></div>
   <div><dt>関係する工程</dt><dd>{c.stages}</dd></div>
  </dl>
  <h2 className="case-subheading">この時の進め方</h2>
  <dl className="case-context">
   <div><dt>AIに依頼したこと</dt><dd>{c.ai}</dd></div>
   <div><dt>担当者が確認したこと</dt><dd>{c.human}</dd></div>
  </dl>
  </details>
 </section>;
}
