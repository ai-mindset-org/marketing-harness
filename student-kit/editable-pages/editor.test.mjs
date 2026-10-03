import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, loadPage, render, validateSnapshot, validSlug } from './editor.mjs';

test('page slug stays inside the allowlisted directory', () => {
  assert.equal(validSlug('../secrets'), false);
  assert.equal(validSlug('sample-event'), true);
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
  assert.ok(html.includes('/overlay/site-edit-overlay-runtime.js'));
  assert.ok(html.includes('/overlay-adapter.js'));
  assert.ok(html.includes('data-edit-field="title"'));
  assert.ok(!html.includes('<aside id="editor">'));
  assert.equal(escapeHtml('"<&'), '&quot;&lt;&amp;');
});

test('navigation follows each page order while labels stay shared', async () => {
  const state = await loadPage();
  state.shared.navigation.reverse();
  const html = render(state);
  assert.ok(html.indexOf('href="#intro"') < html.indexOf('href="#outcomes"'));
  state.page.blocks = ['outcomes', 'intro', 'cta'];
  const reordered = render(state);
  assert.ok(reordered.indexOf('href="#outcomes"') < reordered.indexOf('href="#intro"'));
});

test('save contract accepts only the current page and shared structure', async () => {
  const current = await loadPage();
  const page = Object.fromEntries(['kicker', 'title', 'intro', 'outcomesHeading', 'ctaTitle', 'ctaLabel', 'blocks'].map((key) => [key, current.page[key]]));
  const snapshot = { revision: current.revision, page, shared: current.shared };
  assert.equal(validateSnapshot(snapshot, current), true);
  assert.equal(validateSnapshot({ ...snapshot, revision: current.revision + 1 }, current), false);
  assert.equal(validateSnapshot({ ...snapshot, page: { ...page, blocks: ['intro', 'intro', 'cta'] } }, current), false);
  assert.equal(validateSnapshot({ ...snapshot, shared: { ...current.shared, navigation: [{ href: 'https://bad.test', label: 'Bad' }, ...current.shared.navigation.slice(1)] } }, current), false);
  assert.equal(validateSnapshot({ ...snapshot, shared: { ...current.shared, navigation: [...current.shared.navigation].reverse() } }, current), false);
});
