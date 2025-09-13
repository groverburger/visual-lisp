import * as u from './utils.js'

let values = Array(64).fill(0).map((_, i) => i)

export function getColorFromValue (value) {
  return u.colorToString(...u.hsvToRgb(value / values.length + 0.6, 1, 1))
}

export function setValueRangeSize (size) {
  const custom = {}
  values.forEach((v, i) => { if (v != i) custom[i] = v })
  values = Array(size).fill(0).map((_, i) => i)
  Object.entries(custom).forEach(([i, v]) => { if (i < size) values[i] = v })
}

export function getValues () {
  return values
}

export function stringToColor (string) {
  const hash = u.hash(string) & 0xffffff
  return '#' + hash.toString(16).padStart(6, '0')
}
