export function ChartNumber({number}: {number: string | number}) {
 return <span className="chart-number"><span>カルテ </span><strong>{String(number).padStart(2, '0')}</strong></span>;
}
