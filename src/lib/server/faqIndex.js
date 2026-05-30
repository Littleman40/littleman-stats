// no hesi's guild id
const DISCORD_GUILD_ID = '964645662866173972';

// import all faq json files creating a map of file paths
const faqModules = import.meta.glob('../../data/faqs/*.json', { eager: true });

let cachedFaqIndex = null;
let cachedFaqsById = null;

// called once on first access - builds id data, id title, and id fileName maps from the above result
function fnBuildIndexes() {
  const titleByFaqId = new Map();
  const fileNameByFaqId = new Map();
  const faqsById = new Map();

  for (const [modulePath, loadedModule] of Object.entries(faqModules)) {
    // e.g. 'howToOpenChat.json'
    const jsonFileName = modulePath.split('/').pop();
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

// returns id title and id fileName maps
export async function fnGetFaqIndex() {
  if (!cachedFaqIndex) fnBuildIndexes();
  return cachedFaqIndex;
}

// returns array of { id, data } for every faq
export function fnGetAllFaqs() {
  if (!cachedFaqsById) fnBuildIndexes();
  return Array.from(cachedFaqsById.entries()).map(([id, data]) => ({ id, data }));
}

// returns the full parsed json for one faq
export function fnGetFaqById(faqId) {
  if (!cachedFaqsById) fnBuildIndexes();
  return cachedFaqsById.get(faqId) ?? null;
}

// all <#id> mentions resolve to a faq thread or a discord link
export function fnMakeMentionResolver(titleByFaqId) {
  return function fnResolveChannel(channelId) {
    
    // ensures channel id only has numbers
    if (!/^\d+$/.test(channelId)) return null;

    // checks if channel id exists in faq id
    if (titleByFaqId.has(channelId)) {
      return {
        href: `/faq/${channelId}`,
        label: titleByFaqId.get(channelId),
        external: false,
      };
    }

    // returns discord link if needed
    return {
      href: `https://discord.com/channels/${DISCORD_GUILD_ID}/${channelId}`,
      label: '#redirect-to-discord-channel',
      external: true,
    };
  };
}
