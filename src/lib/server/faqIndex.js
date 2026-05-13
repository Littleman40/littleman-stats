const DISCORD_GUILD_ID = '964645662866173972';                                            // no hesi's guild id

const faqModules = import.meta.glob('../../data/faqs/*.json', { eager: true });           // import all faq json files creating a map of file paths

let cachedFaqIndex = null;
let cachedFaqsById = null;

function fnBuildIndexes() {                                                               // called once on first access - builds id data, id title, and id fileName maps from the above result
  const titleByFaqId = new Map();
  const fileNameByFaqId = new Map();
  const faqsById = new Map();

  for (const [modulePath, loadedModule] of Object.entries(faqModules)) {
    const jsonFileName = modulePath.split('/').pop();                                     // e.g. 'howToOpenChat.json'
    const parsedFaqData = loadedModule.default;
    if (!parsedFaqData) continue;

    const faqId = parsedFaqData.threadId || jsonFileName.replace(/\.json$/, '');
    titleByFaqId.set(faqId, parsedFaqData.title || '(Untitled)');
    fileNameByFaqId.set(faqId, jsonFileName);
    faqsById.set(faqId, parsedFaqData);
  }

  cachedFaqIndex = { titleByFaqId, fileNameByFaqId };
  cachedFaqsById = faqsById;
}

export async function fnGetFaqIndex() {                                                     // returns id title and id fileName maps
  if (!cachedFaqIndex) fnBuildIndexes();
  return cachedFaqIndex;
}

export function fnGetAllFaqs() {                                                          // returns array of { id, data } for every faq
  if (!cachedFaqsById) fnBuildIndexes();
  return Array.from(cachedFaqsById.entries()).map(([id, data]) => ({ id, data }));
}

export function fnGetFaqById(faqId) {                                                     // returns the full parsed json for one faq
  if (!cachedFaqsById) fnBuildIndexes();
  return cachedFaqsById.get(faqId) ?? null;
}

export function fnMakeMentionResolver(titleByFaqId) {                                     // all <#id> mentions resolve to a faq thread or a discord link
  return function fnResolveChannel(channelId) {
    if (!/^\d+$/.test(channelId)) return null;                                            // ensures channel id only has numbers
    if (titleByFaqId.has(channelId)) {                                                    // checks if channel id exists in faq id
      return {
        href: `/faq/${channelId}`,
        label: titleByFaqId.get(channelId),
        external: false,
      };
    }
    return {                                                                              // returns discord link if needed
      href: `https://discord.com/channels/${DISCORD_GUILD_ID}/${channelId}`,
      label: '#redirect-to-discord-channel',
      external: true,
    };
  };
}
