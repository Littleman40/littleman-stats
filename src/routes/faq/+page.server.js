import { fnStripDiscordMarkdown } from '$lib/utils/parseDiscordMarkdown.js';
import { fnGetFaqIndex, fnGetAllFaqs, fnMakeMentionResolver } from '$lib/server/faqIndex.js';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];

function fnPickPreviewImage(faqMessages) { // called from load() below (one call per FAQ)
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

function fnBuildPreviewText(faqMessages, fnResolveChannel) { // called from load() below (one call per FAQ)
  if (!Array.isArray(faqMessages)) return '';
  return faqMessages
    .map((message) => fnStripDiscordMarkdown(message?.content || '', { resolveChannel: fnResolveChannel }))
    .filter(Boolean)
    .join(' ');
}

export async function load() { // called by SvelteKit when /faq is requested — renders src/routes/faq/+page.svelte
  const { titleByFaqId } = await fnGetFaqIndex();
  const fnResolveChannel = fnMakeMentionResolver(titleByFaqId);

  const faqList = fnGetAllFaqs().map(({ id, data }) => ({
    id,
    title: data.title || '(Untitled)',
    previewText: fnBuildPreviewText(data.messages, fnResolveChannel),
    previewImage: fnPickPreviewImage(data.messages),
  }));

  faqList.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  return { faqs: faqList };
}
