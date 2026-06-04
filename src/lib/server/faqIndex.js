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

  // loop through every faq json,
  const entries = Object.entries(faqModules);

  for (const entry of entries) {
    // faq name
    const modulePath = entry[0];

    // faq data
    const loadedModule = entry[1];

    // get the very last part of the path for the name
    const jsonFileName = modulePath.split('/').pop();
    
    // get the json data for the faq text
    const parsedFaqData = loadedModule.default;
    
    // if there is nothing, then go to next file
    if (!parsedFaqData) continue;

    // create faq id, and just use the file name if there is not thread id
    const faqId = parsedFaqData.threadId || jsonFileName.replace(/\.json$/, '');
    
    // mapping the faq id to the title
    titleByFaqId.set(faqId, parsedFaqData.title || '(Untitled)');
    
    // mapping the faq id to file name
    fileNameByFaqId.set(faqId, jsonFileName);
    
    // stores the full faq data, mainly for the @mention resolution
    faqsById.set(faqId, parsedFaqData);
  }

  // cache's the results
  cachedFaqIndex = { 
    titleByFaqId, 
    fileNameByFaqId 
  };
  cachedFaqsById = faqsById;
}



// returns id title and id fileName maps
export async function fnGetFaqIndex() {

  // if not cached, build it and that caches it
  if (!cachedFaqIndex) fnBuildIndexes();

  return cachedFaqIndex;
}



// returns array of { id, data } for every faq
export function fnGetAllFaqs() {

  // if not cached, build it and that caches it
  if (!cachedFaqsById) fnBuildIndexes();

  const result = [];

  // loop through each faq and make the array of { id: ...., data:..... }
  for (const entry of cachedFaqsById.entries()) {
      result.push({
          id: entry[0],
          data: entry[1]
      });
  }

  return result;
}



// returns the full json for one faq
export function fnGetFaqById(faqId) {

  // if not cached, build it and that caches it
  if (!cachedFaqsById) fnBuildIndexes();

  // returns the json, but if it doesnt exist, just return null
  return cachedFaqsById.get(faqId) ?? null;
}



// convert all ids to links depending on context
export function fnMakeMentionResolver(titleByFaqId) {

  // an inner function, that uses title by faq to then find that faq or return discord link
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
