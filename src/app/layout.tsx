import type {Metadata} from 'next';
import {Header} from '../components/header';
import './globals.css';
export const metadata: Metadata = {title: 'AI開発クリニック', description: 'AI駆動開発の課題を読み解き、改善案や工夫をカルテにまとめるワークショップ'};
export default function Layout({children}: {children: React.ReactNode}) {
 return <html lang="ja" suppressHydrationWarning><body><Header/>{children}</body></html>;
}
