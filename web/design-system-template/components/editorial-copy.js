/* End-punctuation polyfill, scoped to the editorial-copy component. */
(() => {
  if (window.CSS?.supports?.('hanging-punctuation', 'allow-end')) return;
  const PUNCT = /[,.;:!?»)…]/;
  const unwrap = el => { el.querySelectorAll('span.hang').forEach(sp => sp.replaceWith(document.createTextNode(sp.textContent))); el.normalize(); };
  const nextText = (node, root) => { const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); w.currentNode=node; let n; while((n=w.nextNode())) if(/\S/.test(n.nodeValue)) return n; return null; };
  const hang = el => {
    unwrap(el); if(el.isContentEditable) return;
    const nodes=[], walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let node;
    while((node=walker.nextNode())) nodes.push(node);
    const range=document.createRange();
    for(let k=nodes.length-1;k>=0;k--) { const text=nodes[k].nodeValue;
      for(let i=text.length-1;i>=0;i--) { if(!PUNCT.test(text.charAt(i))) continue; if(i+1<text.length&&!/\s/.test(text.charAt(i+1))) continue;
        range.setStart(nodes[k],i); range.setEnd(nodes[k],i+1); const rect=range.getClientRects()[0]; if(!rect?.width) continue;
        let j=i+1; while(j<text.length&&/\s/.test(text.charAt(j))) j++; let last=false;
        if(j<text.length) { range.setStart(nodes[k],j); range.setEnd(nodes[k],j+1); const next=range.getClientRects()[0]; last=!!next&&next.top>rect.top+2; }
        else { const next=nextText(nodes[k],el); if(next){range.setStart(next,0);range.setEnd(next,1);const r=range.getClientRects()[0];last=!!r&&r.top>rect.top+2;} }
        if(!last) continue; range.setStart(nodes[k],i); range.setEnd(nodes[k],i+1); const span=document.createElement('span'); span.className='hang'; try{range.surroundContents(span)}catch{}
      }
    }
  };
  const all=()=>document.querySelectorAll('.aim-editorial-copy p').forEach(hang);
  let timer; const later=()=>{clearTimeout(timer);timer=setTimeout(all,120)};
  document.fonts?.ready?.then(later) ?? later(); addEventListener('load',later); addEventListener('resize',later);
})();
