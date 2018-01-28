import { idbm, a } from './client/utils.js'

const uri = new URL(location.href)
const client = new WebTorrent({})
const sites = idbm('sites')

if(location.hash.length > 1) {
  install(location.hash.slice(1)).then(console.log)
}

function tag(tag, items=[], attrs={}) {
  const row = document.createElement(tag)

  for(const item of items) {
    row.appendChild(item)
  }

  for(const [attr, value] of Object.entries(attrs)) {
    row.setAttribute(attr, value)
  }

  return row
}

function row(columns) {
  return tag('tr', columns)
}
function col(textContent) {
  return tag('td', [ text(textContent) ])
}

function text(text) {
  return document.createTextNode(text)
}

sites.entries().then(items => {
  const rows = items.map(([manifest, href]) => {
    return row([
      col(manifest.name),
      tag('td', [ tag('a', [ text(href) ], { href }) ])
    ])
  })

  const table = tag('table', [
    tag('thead', [
      row([ col('name'), col('location') ])
    ]),
    tag('tbody', rows)
  ])
  document.body.appendChild(table)
})


const form = document.querySelector('form')

form.addEventListener('submit', event => {
  const input = document.querySelector('[name=hash]')
  event.preventDefault()
  install(input.value)
})

function install(id) {
  console.log('installing' ,id)
  return new Promise(resolve => {
    const trackers = {
      announce: [
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.btorrent.xyz',
        'wss://tracker.fastcast.nz'
      ]
    }

    client.add(id, trackers, async function (torrent) {
      console.log('resolved', torrent)

      const cache = await caches.open(torrent.infoHash)
      console.log('waiting')

      await new Promise(resolve => torrent.on('done', resolve))

      console.log('done downloading')

      for(const file of torrent.files) {
        const request = await a(cb => file.getBlob(cb))

        await cache.put(file.path, new Response(request))
      }
      const index = await cache.match('index.html')

      const parser = new DOMParser()

      const document = parser.parseFromString(await index.text(), 'text/html')

      const link = document.querySelector('[rel="manifest"]')
      const manifestFile = link && await cache.match(link.getAttribute('href'))
      const manifest = manifestFile
        ? await manifestFile.json()
        : { name: document.querySelector('title').textContent }

      manifest.hash = torrent.infoHash

      const installer = document.createElement('iframe')
      const host = new URL(location.origin)

      host.hostname = [ manifest.short_name, location.hostname ].join('.')
      host.pathname = '/install.html'

      installer.setAttribute('src', host.href)

      window.document.body.appendChild(installer)

      await new Promise(resolve => installer.onload = resolve)

      installer.contentWindow.postMessage({ manifest }, '*')

      const paths = await cache.keys()


      for(const request of paths) {
        const response = await cache.match(request)
        const contents = await response.arrayBuffer()
        const url = new URL(request.url)
        const file = { path: url.pathname, contents }

        installer.contentWindow.postMessage({ file }, '*')
      }

      installer.contentWindow.postMessage({ done: true }, '*')


      sites.set(host.origin, manifest)

      resolve({ torrent, document, manifest })
    })
  })
}
