const IMMUTABLE_PATH_PREFIXES = [
  '/vid/',           // background loops and other static videos in /static/vid
  '/faqs-images/',   // FAQ attachment mirrors downloaded from Discord CDN
  '/icons/',         // app icons referenced by the manifest
  '/img/',           // misc static imagery
];

export async function handle({ event, resolve }) { // called by SvelteKit on every incoming request — name is required by the framework
  const serverResponse = await resolve(event);

  const requestPath = event.url.pathname;
  if (IMMUTABLE_PATH_PREFIXES.some((prefix) => requestPath.startsWith(prefix))) {
    serverResponse.headers.set('Cache-Control', 'public, max-age=2592000, immutable');
  }

  return serverResponse;
}
