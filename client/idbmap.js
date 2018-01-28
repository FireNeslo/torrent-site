function when(request) {
  return new Promise((resolve, reject) => {
    request.onerror = function(event) {
      reject(request.error)
    }
    request.onsuccess = function(event) {
      resolve(request.result)
    }
  })
}

class IDBMap {
  constructor(name) {
    const request = indexedDB.open(name)

    request.onupgradeneeded = this.setup.bind(this)

    this.name = name
    this.ready = when(request)
  }

  setup({ target: { result: schema } }) {
    schema.createObjectStore("entries", { keyPath: "key" })
  }

  async transaction(access, callback) {
    if(!callback) [ callback, access ] = [ access, callback ]
    const database = await this.ready
    const transaction = database.transaction(["entries"], access)
    const entries = transaction.objectStore("entries")
    const request = callback(entries)

    return when(request)
  }

  async read(callback) {
    return this.transaction(callback)
  }

  async write(callback) {
    return this.transaction('readwrite', callback)
  }

  async set(key, value) {
    return this.write(entries => entries.put({ key, value }))
  }

  async get(key) {
    return this.read(entries => entries.get(key)).then(kv => kv && kv.value)
  }

  async keys() {
    return this.read(entries => entries.getAllKeys())
  }

  async entries() {
    return this.read(entries => entries.getAll())
      .then(entries => entries.map(entry => [ entry.value, entry.key ]))
  }
  async values() {
    return this.entries().then(entries => entries.map(entry => entry[0]))
  }
}

function create(name) {
  return new IDBMap(name)
}


;(self || global).fnIdbm = Object.assign(create, { IDBMap })
