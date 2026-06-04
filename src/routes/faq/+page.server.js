import { fnStripDiscordMarkdown } from '$lib/utils/parseDiscordMarkdown.js';
import { fnGetFaqIndex, fnGetAllFaqs, fnMakeMentionResolver } from '$lib/server/faqIndex.js';


// allowed file types
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];


// finds first image in attachment of a faq - called from load() below (one call per FAQ)
function fnPickPreviewImage(faqMessages) {
  
  // if there are no messages or attachments just return nothing
  if (!Array.isArray(faqMessages) || faqMessages.length === 0) return null;

  // only look at the first message of the faq
  const firstMessage = faqMessages[0];
  
  // if there is no attachments return null
  if (!firstMessage?.attachments?.length) return null;
  
  // loop through attachments and return the first one that ends with an image extension, otherwise return null
  for (const attachmentUrl of firstMessage.attachments) {

    // skips invalid rules
    if (typeof attachmentUrl !== 'string') continue;

    // case lowering
    const lowerUrl = attachmentUrl.toLowerCase();

    // checks the extension and returns if the url is safe
    if (IMAGE_EXTENSIONS.some((ext) => lowerUrl.endsWith(ext))) return attachmentUrl;
  }
  return null;
}



// preview text builder -called from load() below (one call per FAQ)
function fnBuildPreviewText(faqMessages, fnResolveChannel) {

  // if there are no messages just return nothing
  if (!Array.isArray(faqMessages) || faqMessages.length === 0) return '';

  // only look at the very first message and return that, with all formatting stripped
  const text = faqMessages[0]?.content || '';
  return fnStripDiscordMarkdown(text, { resolveChannel: fnResolveChannel });
}



// the main load function - called by SvelteKit when /faq is requested - renders src/routes/faq/+page.svelte
export async function load() {

  // gets the faq index for id to title's
  const { titleByFaqId } = await fnGetFaqIndex();

  // turns faq ids into faq link or discord link
  const fnResolveChannel = fnMakeMentionResolver(titleByFaqId);

  // build the faq list
  const faqList = fnGetAllFaqs().map(({ id, data }) => ({
    id,
    title: data.title || '(Untitled)',
    previewText: fnBuildPreviewText(data.messages, fnResolveChannel),
    previewImage: fnPickPreviewImage(data.messages),
  }));

  // sorts alphabetically
  faqList.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  return { faqs: faqList };
}
