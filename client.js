import { idbm, a, p, update, create } from './client/utils.js'

const uri = new URL(location.href)
const client = new WebTorrent()
const sites = idbm('sites')

const parser = new DOMParser()

const trackers = {
  announce: [
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.fastcast.nz'
  ]
}

update(document.body, {
  hash: '',
  trackers: trackers.announce.join('\n')
})

function appLink(manifest) {
  const url = new URL(location.href)
  const alias = (manifest.short_name || manifest.name).toLowerCase()

  url.hostname = [ alias, location.hostname ].join('.')

  return url.origin
}

renderApps()

function iconPicture(manifest) {
  const base = appLink(manifest)
  const picture = document.createElement('iframe')
  picture.setAttribute('scrolling', 'no')
  const icon = manifest.icons.pop() || {}
  const iconLink = [base, icon.src].join('/')

  picture.src = iconLink

  return picture
}

function renderApp({ manifest, location, pending }) {
  const existing = document.getElementById(manifest.hash)
  const { name, icons, hash } = manifest

  const icon = pending
    ? document.createElement('progress')
    : iconPicture(manifest)

  icon.setAttribute('html', 'icon')

  if(existing) {
    return update(existing, { name, icon, location, hash })
  }

  return create('#app', { name, icon, location, hash })
}

function renderApps() {
  sites.entries().then(entries => {
    const apps = document.querySelector('#apps')

    for(const [ manifest, location ] of entries) {
      const app = renderApp({ manifest, location })
      if(!app.parentNode) {
        apps.appendChild(app)
      }
    }
  })
}

function res(promise, type='text') {
  return promise.then(response => {
    return new Response(response)[type]()
  })
}

function file(tree, name, type) {
  const file = tree[name.replace(/^\//, '')]
  return res(a(cb => file.getBlob(cb)), type)
}

const $install = document.querySelector('.install')

$install.addEventListener('submit', event => {
  event.preventDefault()

  const hash = document.querySelector('[name=hash]')

  install(hash.value)
})

function addToTree(tree, file) {
  tree[file.path] = file
  return tree
}

async function install(id) {
  const apps = window.document.querySelector('#apps')

  apps.classList.add('working')

  const torrent = await p(cb => client.add(id, trackers, cb))

  apps.classList.remove('working')

  const app = renderApp({
    manifest: { name: '?', hash: torrent.infoHash },
    location: '#',
    pending: true
  })

  if(!app.parentNode) {
    apps.appendChild(app)
  }

  const cache = await caches.open(torrent.infoHash)

  const tree = torrent.files.reduce(addToTree, {})

  const index = await file(tree, 'index.html')
  const document = parser.parseFromString(index, 'text/html')

  const link = document.querySelector('[rel="manifest"]')

  if(!link) throw new Error('Manifest required')

  const manifest = await file(tree, link.getAttribute('href'), 'json')

  manifest.hash = torrent.infoHash

  const installer = document.createElement('iframe')
  const origin = appLink(manifest)

  renderApp({ manifest, location: origin, pending: true })

  installer.setAttribute('src', [origin,'install.html'].join('/'))
  installer.setAttribute('class', 'installer')

  window.document.body.appendChild(installer)

  const cached = torrent.files.map(async file => {
    const blob = await a(cb => file.getBlob(cb))
    const done = await cache.put(file.path, new Response(blob))
    return done
  })

  await p((onload, onerror) => Object.assign(installer, { onload, onerror }))

  installer.contentWindow.postMessage({ type: 'start', manifest }, '*')

  await Promise.all(cached)

  const paths = await cache.keys()

  for(const request of paths) {
    const response = await cache.match(request)
    const contents = await response.arrayBuffer()
    const url = new URL(request.url)
    const path = url.pathname
    const message = { type: 'file', contents, path, options: {} }

    installer.contentWindow.postMessage(message, '*')
  }

  installer.contentWindow.postMessage({ type: 'complete' }, '*')

  await p(cb => window.addEventListener('message', cb))

  sites.set(origin, manifest)

  renderApps()
}
