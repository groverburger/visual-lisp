import { state } from './main.js'
import Grid from './grid.js'
import Thing from './thing.js'

/*
export function serializeLayer (layer) {
  return {
    grid: layer.grid.getData(),
    things: layer.things.map(({ name, position, data }) => ({
      name, position, data
    }))
  }
}

export function deserializeLayer (index, layerString) {
  const { grid, things } = layerString

  state.layers[index] = {
    grid: new Grid(),
    things: []
  }
  const layer = state.layers[index]

  // load the grid
  for (const [chunkCoord, chunk] of Object.entries(grid)) {
    const [cx, cy] = chunkCoord.split(',').map(Number)
    for (let i = 0; i < chunk.length; i += 1) {
      const x = (i % 64) + cx
      const y = Math.floor(i / 64) + cy
      layer.grid.set(x, y, chunk[i])
    }
  }

  // load things
  for (const { name, position, data } of things) {
    const thing = new Thing(position)
    thing.name = name
    thing.data = data
    layer.things.push(thing)
  }
}
*/

export function serialize () {
  const project = {
    version: 1,
    layers: []
  }
  //for (const layer of state.layers) {
    //project.layers.push(serializeLayer(layer))
  //}
  return JSON.stringify(project)
}

export function deserialize (projectString) {
  const { layers } = JSON.parse(projectString)
  for (const [i, layer] of Object.entries(layers)) {
    deserializeLayer(i, layer)
  }
}

/*
export function download (data) {
  const link = document.createElement('a')
  link.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(data))
  link.setAttribute('download', 'project.json')
  link.click()
}

export function upload (processText) {
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.onchange = async (e) => {
    processText(await e.target.files[0].text())
  }
  input.click()
}
*/

export function commit () {
  state.undo.push(serialize())
  if (state.undo.length > 50) {
    state.undo.shift()
  }
  state.redo = []
}

export function undo () {
  if (state.undo.length <= 1) { return }
  state.redo.push(state.undo.pop())
  deserialize(state.undo.at(-1))
}

export function redo () {
  if (state.redo.length === 0) { return }
  state.undo.push(state.redo.pop())
  deserialize(state.undo.at(-1))
}
