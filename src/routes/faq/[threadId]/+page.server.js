import { readFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { error } from '@sveltejs/kit';
import { fnParseDiscordMarkdown } from '$lib/utils/parseDiscordMarkdown.js';
import { fnGetFaqIndex, fnMakeMentionResolver } from '$lib/server/faqIndex.js';

const FAQ_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '../../../data/faqs');

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];

function fnClassifyAttachment(attachmentUrl) { // called from load() below (one call per attachment per message)
  if (typeof attachmentUrl !== 'string') return { kind: 'other', url: attachmentUrl };
  const lowerUrl = attachmentUrl.toLowerCase().split('?')[0];
  const fileExt = extname(lowerUrl);
  if (IMAGE_EXTENSIONS.includes(fileExt)) return { kind: 'image', url: attachmentUrl, ext: fileExt };
  if (VIDEO_EXTENSIONS.includes(fileExt)) return { kind: 'video', url: attachmentUrl, ext: fileExt };
  return { kind: 'other', url: attachmentUrl, ext: fileExt };
}

export async function load({ params }) { // called by SvelteKit when /faq/[threadId] is requested — renders src/routes/faq/[threadId]/+page.svelte
  const { titleByFaqId, fileNameByFaqId } = await fnGetFaqIndex();
  const jsonFileName = fileNameByFaqId.get(params.threadId);
  if (!jsonFileName) {
    throw error(404, 'FAQ not found');
  }

  let parsedFaqData;
  try {
    const rawFileContent = await readFile(join(FAQ_DIRECTORY, jsonFileName), 'utf8');
    parsedFaqData = JSON.parse(rawFileContent);
  } catch (readErr) {
    console.error(`[faq detail] failed to read ${jsonFileName}:`, readErr);
    throw error(500, 'Could not load FAQ');
  }

  const fnResolveChannel = fnMakeMentionResolver(titleByFaqId);

  const renderedMessages = (parsedFaqData.messages || []).map((message) => ({
    html: fnParseDiscordMarkdown(message?.content || '', { resolveChannel: fnResolveChannel }),
    attachments: (message?.attachments || []).map(fnClassifyAttachment),
  }));

  return {
    faq: {
      id: parsedFaqData.threadId || params.threadId,
      title: parsedFaqData.title || '(Untitled)',
      messages: renderedMessages,
    },
  };
}
