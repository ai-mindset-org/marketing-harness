/* Example markup comes from the same DOM that renders the component. */
document.querySelectorAll('[data-live-code]').forEach(pre=>{
  const sample=document.getElementById(pre.dataset.liveCode);
  if(!sample)return;
  const refresh=()=>{
    const copy=sample.cloneNode(true);
    copy.removeAttribute('id');
    copy.querySelectorAll('canvas').forEach(canvas=>{canvas.removeAttribute('width');canvas.removeAttribute('height');});
    copy.querySelectorAll('a[href^="#"]').forEach(a=>a.setAttribute('href','index.html'+a.getAttribute('href')));
    pre.textContent=`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Компоненты Design System Template</title>
<link rel="stylesheet" href="aim-material-system.css">
<link rel="stylesheet" href="components/section-card.css">
<link rel="stylesheet" href="template-preview.css">
<script src="components/section-card-scenes.js" defer></script>
</head>
<body>
<main style="max-width:760px;margin:32px auto;padding:16px">
${copy.outerHTML}
</main>
</body>
</html>`;
  };
  refresh();
  const details=pre.closest('details');
  if(details)details.addEventListener('toggle',()=>{if(details.open)refresh();});
  document.querySelectorAll('[data-download-live="'+pre.dataset.liveCode+'"]').forEach(button=>{
    button.addEventListener('click',()=>{
      refresh();
      const url=URL.createObjectURL(new Blob([pre.textContent],{type:'text/html;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download='section-card-example.html';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  });
});
