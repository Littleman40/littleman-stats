import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FAQ_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '../../data/faqs');
const DISCORD_GUILD_ID = '964645662866173972';                                  // no hesi's guild id

let cachedFaqIndex = null;

async function fnBuildFaqIndex() { // called from fnGetFaqIndex in this file (cache miss)
  const jsonFileNames = (await readdir(FAQ_DIRECTORY)).filter((name) => name.endsWith('.json'));
  const titleByFaqId = new Map();
  const fileNameByFaqId = new Map();

  for (const jsonFileName of jsonFileNames) {
    try {
      const rawFileContent = await readFile(join(FAQ_DIRECTORY, jsonFileName), 'utf8');
      const parsedFaqData = JSON.parse(rawFileContent);
      const faqId = parsedFaqData.threadId || jsonFileName.replace(/\.json$/, '');
      titleByFaqId.set(faqId, parsedFaqData.title || '(Untitled)');
      fileNameByFaqId.set(faqId, jsonFileName);
    } catch (readErr) {
      console.error(`[faqIndex] skipping ${jsonFileName}:`, readErr.message);
    }
  }

  return { titleByFaqId, fileNameByFaqId };
}

export async function fnGetFaqIndex() { // called from load() in src/routes/faq/+page.server.js + src/routes/faq/[threadId]/+page.server.js
  if (!cachedFaqIndex) cachedFaqIndex = await fnBuildFaqIndex();
  return cachedFaqIndex;
}

export function fnMakeMentionResolver(titleByFaqId) { // called from load() in src/routes/faq/+page.server.js + src/routes/faq/[threadId]/+page.server.js — all <#id> mentions resolve to a faq thread or a discord link
  return function fnResolveChannel(channelId) { // returned closure; invoked by fnProcessInline + fnStripDiscordMarkdown in src/lib/utils/parseDiscordMarkdown.js
    if (!/^\d+$/.test(channelId)) return null;
    if (titleByFaqId.has(channelId)) {
      return {
        href: `/faq/${channelId}`,
        label: titleByFaqId.get(channelId),
        external: false,
      };
    }
    return {
      href: `https://discord.com/channels/${DISCORD_GUILD_ID}/${channelId}`,
      label: '#channel',
      external: true,
    };
  };
}
