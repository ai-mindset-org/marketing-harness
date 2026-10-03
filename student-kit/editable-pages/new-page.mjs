import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validSlug } from './editor.mjs';

const [slug, title, intro] = process.argv.slice(2);
if (!validSlug(slug) || !title?.trim() || !intro?.trim() || title.length > 120 || intro.length > 500 || slug === 'sample-course') {
  console.error('Usage: node new-page.mjs <lowercase-slug> "Title" "Intro"');
  process.exitCode = 1;
} else {
  const directory = join(dirname(fileURLToPath(import.meta.url)), 'pages');
  const pagePath = join(directory, `${slug}.json`);
  const editsPath = join(directory, `${slug}.edits.jsonl`);
  const page = { pageId: slug, slug, kicker: 'Учебная программа', title: title.trim(), intro: intro.trim(), outcomesHeading: 'Что получится', ctaTitle: 'Начните со своего проекта', ctaLabel: 'Посмотреть результаты', blocks: ['intro', 'outcomes', 'cta'] };
  try {
    await writeFile(pagePath, `${JSON.stringify(page, null, 2)}\n`, { flag: 'wx' });
    await writeFile(editsPath, '', { flag: 'wx' });
    console.log(`Created pages/${slug}.json and pages/${slug}.edits.jsonl`);
    console.log(`Open http://127.0.0.1:8790/?page=${slug}`);
  } catch (error) {
    console.error(`Could not create page: ${error.code || error.message}. Existing files were not overwritten; inspect ${pagePath} and ${editsPath}.`);
    process.exitCode = 1;
  }
}
