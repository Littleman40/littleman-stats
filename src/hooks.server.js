export async function handle({ event, resolve }) {                                // every single request to the server goes through this function
  const response = await resolve(event);                                          // we tell it to run as normal and give the response

  if (event.url.pathname.startsWith('/vid/')) {                                   // if the request is a video file, we then modify the headers to include cache control, so its saved on their local disk
    response.headers.set('Cache-Control', 'public, max-age=2592000, immutable');
  }

  return response;
}
