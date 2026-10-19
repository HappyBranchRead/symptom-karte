function FlowNode({x, y, title, detail, width = 210}: {x: number; y: number; title: string; detail: string; width?: number}) {
 return <g transform={`translate(${x},${y})`}><rect width={width} height="76" rx="4"/><text x={width / 2} y="29" className="flow-title">{title}</text><text x={width / 2} y="54" className="flow-detail">{detail}</text></g>;
}
export function FeatureFlow() {
 return <figure className="feature-flow">
  <svg className="flow-desktop" viewBox="0 0 810 360" role="img" aria-labelledby="flow-title-desktop flow-description-desktop">
   <title id="flow-title-desktop">受注・発注と在庫のつながり</title>
   <desc id="flow-description-desktop">受注登録から在庫を引き当て、発注した商品が入荷すると在庫を補充する。受注状況と在庫数は一覧で確認する。</desc>
   <defs><marker id="flow-arrow-desktop" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z"/></marker></defs>
   <g className="flow-edges" markerEnd="url(#flow-arrow-desktop)"><path d="M230 58 H300"/><path d="M230 298 H300"/><path d="M405 260 V96"/><path d="M510 58 H550 V178 H590"/><path d="M510 298 H550 V178"/></g>
   <FlowNode x={20} y={20} title="受注登録" detail="商品・数量・納期を登録"/>
   <FlowNode x={300} y={20} title="在庫引き当て" detail="注文分の在庫を確保"/>
   <FlowNode x={20} y={260} title="発注" detail="不足する商品を仕入れ先へ"/>
   <FlowNode x={300} y={260} title="入荷" detail="届いた分の在庫を増やす"/>
   <FlowNode x={590} y={140} title="受注・在庫一覧" detail="注文状況・在庫数を確認"/>
   <text x="415" y="174" className="flow-edge-label">在庫を補充</text>
  </svg>
  <svg className="flow-mobile" viewBox="0 0 340 600" role="img" aria-labelledby="flow-title-mobile flow-description-mobile">
   <title id="flow-title-mobile">受注・発注と在庫のつながり</title>
   <desc id="flow-description-mobile">受注登録から在庫を引き当て、発注した商品が入荷すると在庫を補充する。受注状況と在庫数は一覧で確認する。</desc>
   <defs><marker id="flow-arrow-mobile" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z"/></marker></defs>
   <g className="flow-edges" markerEnd="url(#flow-arrow-mobile)"><path d="M145 96 V140"/><path d="M145 216 V260"/><path d="M145 500 V456"/><path d="M145 380 V336"/><path d="M270 418 H315 V178 H270"/></g>
   <FlowNode x={20} y={20} title="受注登録" detail="商品・数量・納期を登録" width={250}/>
   <FlowNode x={20} y={140} title="在庫引き当て" detail="注文分の在庫を確保" width={250}/>
   <FlowNode x={20} y={260} title="受注・在庫一覧" detail="注文状況・在庫数を確認" width={250}/>
   <FlowNode x={20} y={380} title="入荷" detail="届いた分の在庫を増やす" width={250}/>
   <FlowNode x={20} y={500} title="発注" detail="不足する商品を仕入れ先へ" width={250}/>
   <text x="326" y="298" className="flow-edge-label" transform="rotate(-90 326 298)">在庫を補充</text>
  </svg>
 </figure>;
}
