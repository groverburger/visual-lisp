import { state } from './main.js'
import CodeBlock from './codeblock.js'
import Grid from './grid.js'
import Thing from './thing.js'

export function serializeEnvironment () {
  return (
    state.world
    .filter(codeBlock => (
      codeBlock.name !== '' &&
      !codeBlock.name.startsWith('__') &&
      !codeBlock.name.endsWith('__')
    ))
    .map(codeBlock => `(define ${codeBlock.name} ${codeBlock.stringify()})`)
  )
}

export function serialize () {
  const project = {
    version: 1,
    environment: serializeEnvironment(),
    world: state.world.map(codeBlock => ({
      position: codeBlock.position,
      name: codeBlock.name,
      content: codeBlock.listify()
    }))
  }
  return JSON.stringify(project)
}

export function deserialize (projectString) {
  const { environment, world } = JSON.parse(projectString)
  const result = []
  for (const { position, name, content } of world) {
    const codeBlock = new CodeBlock(content)
    codeBlock.position = position
    codeBlock.name = name
    codeBlock.recomputeFromTop()
    result.push(codeBlock)
  }
  state.world = result

  for (const key in lips.env.__env__) {
    if (Object.prototype.hasOwnProperty.call(lips.env.__env__, key)) {
      if (!key.startsWith('__') || !key.endsWith('__')) {
        delete lips.env.__env__[key]
      }
    }
  }
  environment.forEach(definition => lips.exec(definition))
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
