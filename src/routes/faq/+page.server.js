import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fnStripDiscordMarkdown } from '$lib/utils/parseDiscordMarkdown.js';
import { fnGetFaqIndex, fnMakeMentionResolver } from '$lib/server/faqIndex.js';

const FAQ_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '../../data/faqs');

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];

function fnPickPreviewImage(faqMessages) { // called from load() below (one call per FAQ json)
  if (!Array.isArray(faqMessages) || faqMessages.length === 0) return null;
  const firstMessage = faqMessages[0];
  if (!firstMessage?.attachments?.length) return null;
  for (const attachmentUrl of firstMessage.attachments) {
    if (typeof attachmentUrl !== 'string') continue;
    const lowerUrl = attachmentUrl.toLowerCase();
    if (IMAGE_EXTENSIONS.some((ext) => lowerUrl.endsWith(ext))) return attachmentUrl;
  }
  return null;
}

function fnBuildPreviewText(faqMessages, fnResolveChannel) { // called from load() below (one call per FAQ json)
  if (!Array.isArray(faqMessages)) return '';
  return faqMessages
    .map((message) => fnStripDiscordMarkdown(message?.content || '', { resolveChannel: fnResolveChannel }))
    .filter(Boolean)
    .join(' ');
}

export async function load() { // called by SvelteKit when /faq is requested — renders src/routes/faq/+page.svelte
  let jsonFileNames;
  try {
    jsonFileNames = (await readdir(FAQ_DIRECTORY)).filter((name) => name.endsWith('.json'));
  } catch (readDirErr) {
    console.error('[faq load] could not read FAQ directory:', readDirErr);
    return { faqs: [] };
  }

  const { titleByFaqId } = await fnGetFaqIndex();
  const fnResolveChannel = fnMakeMentionResolver(titleByFaqId);

  const faqList = [];

  for (const jsonFileName of jsonFileNames) {
    try {
      const rawFileContent = await readFile(join(FAQ_DIRECTORY, jsonFileName), 'utf8');
      const parsedFaqData = JSON.parse(rawFileContent);

      const faqId = parsedFaqData.threadId || jsonFileName.replace(/\.json$/, '');
      const faqTitle = parsedFaqData.title || '(Untitled)';

      faqList.push({
        id: faqId,
        title: faqTitle,
        previewText: fnBuildPreviewText(parsedFaqData.messages, fnResolveChannel),
        previewImage: fnPickPreviewImage(parsedFaqData.messages),
      });
    } catch (readErr) {
      console.error(`[faq load] skipping ${jsonFileName}:`, readErr.message);
    }
  }

  faqList.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  return { faqs: faqList };
}
