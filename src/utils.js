/* shorthand */

const hasOwn = Object.prototype.hasOwnProperty
const invokeFn = Function.prototype.call.bind(Function.prototype.call)

export { invokeFn }

/* type checks */

function isFn(t) {
  return typeof t === 'function' ? t : void 0
}
const strProto = Object.getPrototypeOf('')
function isStr(s) {
  return Object.getPrototypeOf(Object(s)) === strProto
}
const validateProto = proto => proto !== Object.prototype && proto

export { isFn, isStr }

/* functions */

function pipe(...fns) {
  function invoke(v) {
    return fns.reduce((acc, fn) => (fn ? fn.call(this, acc) : acc), v)
  }
  return invoke
}

const m2f = (mKey, fn) => fn && (arr => Array.prototype[mKey].call(arr, fn))

const flattenToObj = (arr, base = {}) => Object.assign(base, ...arr)
const pipeOverKeys = (obj, ...fns) => obj && pipe(...fns)(Object.keys(obj))
const mapOverKeys = (obj, mapper) => pipeOverKeys(obj, m2f('map', mapper))

export { pipe, m2f, flattenToObj, pipeOverKeys, mapOverKeys }

/* object handling */

const has = (key, checkProto) => o =>
  o &&
  (hasOwn.call(o, key) || (checkProto && has(key, false)(validateProto(Object.getPrototypeOf(o)))))
const firstHas = (...o) => key => {
  const res = o.find(has(key, true))
  return res && res[key]
}

export { has, firstHas }
