import { extname } from 'node:path';
import { error } from '@sveltejs/kit';
import { fnParseDiscordMarkdown } from '$lib/utils/parseDiscordMarkdown.js';
import { fnGetFaqIndex, fnGetFaqById, fnMakeMentionResolver } from '$lib/server/faqIndex.js';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];

function fnClassifyAttachment(attachmentUrl) {                                                // called from load() below (one call per attachment per message)
  if (typeof attachmentUrl !== 'string') return { kind: 'other', url: attachmentUrl };
  const lowerUrl = attachmentUrl.toLowerCase().split('?')[0];
  const fileExt = extname(lowerUrl);
  if (IMAGE_EXTENSIONS.includes(fileExt)) return { kind: 'image', url: attachmentUrl, ext: fileExt };
  if (VIDEO_EXTENSIONS.includes(fileExt)) return { kind: 'video', url: attachmentUrl, ext: fileExt };
  return { kind: 'other', url: attachmentUrl, ext: fileExt };
}

export async function load({ params }) {
  const parsedFaqData = fnGetFaqById(params.threadId);
  if (!parsedFaqData) {
    throw error(404, 'FAQ not found');
  }

  const { titleByFaqId } = await fnGetFaqIndex();
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
