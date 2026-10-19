import {WorkshopIntro} from '../components/workshop-intro';
import {Editor} from '../components/editor';
import {ProjectReference} from '../components/project-reference';
export default async function Page({searchParams}: {searchParams: Promise<{g?: string | string[]}>}) {
 const {g} = await searchParams;
 const group = typeof g === 'string' && /^[1-4]$/.test(g) ? Number(g) : 0;
 if (group) return <main><ProjectReference/><Editor key={group} group={group}/></main>;
 return <WorkshopIntro/>;
}
