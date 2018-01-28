import './idbmap.js'

export const idbm = self.fnIdbm
export const IDBMap = idbm.IDBMap

delete self.fnIdbm

export function a(cb) {
  return new Promise((resolve, reject) => {
    cb((error, result) => {
      if(error) return reject(error)
      else return resolve(result)
    })
  })
}
