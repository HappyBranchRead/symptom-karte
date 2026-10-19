import {projectFeatures, projectSummary} from '../lib/content';
import {FeatureFlow} from './feature-flow';

export function ProjectOverview() {
 return <div className="project-overview">
  <p className="project-summary">{projectSummary}</p>
  <details className="project-details">
   <summary>機能のつながりと業務条件を確認する</summary>
  <section className="project-detail" aria-labelledby="features-heading">
   <h3 id="features-heading" className="project-detail-title">機能のつながり</h3>
   <FeatureFlow/>
   <dl>{projectFeatures.map(feature => <div key={feature.name}><dt>{feature.name}</dt><dd>{feature.description}</dd></div>)}</dl>
  </section>
  </details>
 </div>;
}
