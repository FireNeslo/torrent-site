import './idbmap.js'

export const idbm = self.fnIdbm
export const IDBMap = idbm.IDBMap

delete self.fnIdbm


export function update(fragment, data) {
  for(const input of fragment.querySelectorAll('[name]')) {
    input.value = data[input.getAttribute('name')]
  }
  for(const text of fragment.querySelectorAll('[text]')) {
    text.textContent = data[text.getAttribute('text')]
  }
  for(const node of fragment.querySelectorAll('[html]')) {
    node.parentNode.replaceChild(data[node.getAttribute('html')], node)
  }
  for(const node of fragment.querySelectorAll('[set]')) {
    const pairs = node.getAttribute('set').split(',')
    for(const pair of pairs) {
      const [attr, prop] = pair.split(':')
      node.setAttribute(attr, data[prop])
    }
  }

  return fragment
}

export function create(template, data) {
  if(typeof template === 'string') {
    template = document.querySelector(template)
  }
  return update(template.content.cloneNode(true), data)
}


export function a(cb) {
  return new Promise((resolve, reject) => {
    cb((error, result) => {
      if(error) return reject(error)
      else return resolve(result)
    })
  })
}

export function p(cb) {
  return new Promise(cb)
}
