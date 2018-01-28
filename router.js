importScripts('/client/idbmap.js')

const sites = fnIdbm('sites')

async function onFetch(event) {
  const { origin, pathname } = new URL(event.request.url)

  const hash = await sites.get(origin)

  if(hash) {
    const cache = await caches.open(hash)

    const file = await cache.match(event.request)

    if(file) return file

    return cache.match('index.html')
  }
  return fetch(event.request)
}

addEventListener('fetch', event => {
  event.respondWith(onFetch(event))
})
addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})
addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})
