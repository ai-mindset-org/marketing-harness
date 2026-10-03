/* Project adapter for the copied Site Edit Overlay runtime. */
(() => {
  const config = window.StudentPageEditorConfig;
  if (!config || !window.SiteEditOverlay) return;
  let revision = config.revision;
  const clean = (element) => {
    if (!element) throw new Error('Не найдено редактируемое поле');
    return element.innerText.replaceAll('\u00a0', ' ').replaceAll('\u200b', '');
  };
  const field = (name) => clean(document.querySelector(`[data-edit-field="${name}"]`));
  const editor = window.SiteEditOverlay.install({
    blockSelector: 'main > section[id]',
    controlSelector: 'header nav a[href^="#"]',
    sliceContainerSelector: '[data-edit-slice-container]',
    sliceItemSelector: 'li',
    save: async () => {
      const page = {
        kicker: field('kicker'),
        title: field('title'),
        intro: field('intro'),
        outcomesHeading: field('outcomesHeading'),
        ctaTitle: field('ctaTitle'),
        ctaLabel: field('ctaLabel'),
        blocks: Array.from(document.querySelectorAll('main > section[id]'), (section) => section.id),
      };
      const shared = {
        siteName: field('siteName'),
        navigation: Array.from(document.querySelectorAll('header nav a'), (link) => ({
          href: link.getAttribute('href'),
          label: clean(link.querySelector('[data-edit-field="nav-label"]')),
        })),
        outcomes: Array.from(document.querySelectorAll('#outcomes li'), (item) => clean(item.querySelector('[data-edit-field="outcome"]'))),
      };
      const endpoint = `/api/edit?page=${encodeURIComponent(config.slug)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revision, page, shared }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(`${endpoint}: ${result.error || `HTTP ${response.status}`}`);
      revision = result.revision;
      document.title = page.title;
    },
  });
  window.StudentPageEditor = editor;
})();
