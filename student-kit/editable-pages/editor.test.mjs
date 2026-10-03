import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, loadPage, render, validateEdit, validSlug } from './editor.mjs';

test('known fields and revision only', () => {
  assert.equal(validateEdit({ field: 'title', value: 'Новый заголовок', revision: 0 }), true);
  assert.equal(validateEdit({ field: 'shell', value: 'x', revision: 0 }), false);
  assert.equal(validSlug('../secrets'), false);
});

test('two pages share the shell but keep their own titles', async () => {
  const course = await loadPage();
  const event = await loadPage(undefined, 'sample-event');
  assert.equal(course.shared.siteName, event.shared.siteName);
  assert.notEqual(course.page.title, event.page.title);
  assert.ok(render(event).includes('Практика событий'));
});

test('renders ordered blocks with escaped user text', async () => {
  const state = await loadPage();
  state.page.title = '<script>bad</script>';
  const html = render(state);
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.ok(html.indexOf('id="intro"') < html.indexOf('id="outcomes"'));
  assert.equal(escapeHtml('"<&'), '&quot;&lt;&amp;');
});
