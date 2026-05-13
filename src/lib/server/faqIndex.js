import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FAQ_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '../../data/faqs');   // get directory
const DISCORD_GUILD_ID = '964645662866173972';                                            // no hesi's guild id

let cachedFaqIndex = null;

async function fnBuildFaqIndex() {                  // called from fnGetFaqIndex in this file - used to build all the faq ids 
  const jsonFileNames = (await readdir(FAQ_DIRECTORY)).filter((name) => name.endsWith('.json'));    // reads all faq json files
  const titleByFaqId = new Map();                   // creates new map for faq id
  const fileNameByFaqId = new Map();                // creates new map for file name

  for (const jsonFileName of jsonFileNames) {       // loop for all json file names
    try {
      const rawFileContent = await readFile(join(FAQ_DIRECTORY, jsonFileName), 'utf8');   // full path
      const parsedFaqData = JSON.parse(rawFileContent);                                   // converts json to text for js
      const faqId = parsedFaqData.threadId || jsonFileName.replace(/\.json$/, '');        // gets faq id, otherwise removes json file extension
      titleByFaqId.set(faqId, parsedFaqData.title || '(Untitled)');                       // stores faq title
      fileNameByFaqId.set(faqId, jsonFileName);                                           // stores file name for faq id
    } catch (readErr) {
      console.error(`[faqIndex] skipping ${jsonFileName}:`, readErr.message);
    }
  }

  return { titleByFaqId, fileNameByFaqId };
}

export async function fnGetFaqIndex() {             // calls to get the faq index or builds it if needed
  if (!cachedFaqIndex) cachedFaqIndex = await fnBuildFaqIndex();
  return cachedFaqIndex;
}

export function fnMakeMentionResolver(titleByFaqId) {   // all <#id> mentions resolve to a faq thread or a discord link
  return function fnResolveChannel(channelId) {         
    if (!/^\d+$/.test(channelId)) return null;          // ensures channel id only has numbers
    if (titleByFaqId.has(channelId)) {                  // checks if channel id exists in faq id
      return {
        href: `/faq/${channelId}`,
        label: titleByFaqId.get(channelId),
        external: false,
      };
    }
    return {                                             // returns discord link if needed
      href: `https://discord.com/channels/${DISCORD_GUILD_ID}/${channelId}`,
      label: '#redirect-to-discord-channel',
      external: true,
    };
  };
}
