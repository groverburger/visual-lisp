import Mouse from './mouse.js'
import CodeBlock from './codeblock.js'
import * as vec2 from './vector2.js'
import * as itx from './interface.js'
import * as serialize from './serialize.js'
import * as u from './utils.js'
//import * as lips from './lips.js'

export let state = {}

function startup () {
  const canvas = document.querySelector('#mainCanvas')
  canvas.backgroundPattern = (() => {
    const patternCanvas = document.createElement('canvas')
    const size = 512
    patternCanvas.width = size
    patternCanvas.height = size
    const patternCtx = patternCanvas.getContext('2d')
    //patternCtx.fillStyle = 'black'
    //patternCtx.fillStyle = 'rgb(220, 220, 220)'
    patternCtx.fillStyle = '#8888BB'
    patternCtx.fillRect(0, 0, size, size)
    //patternCtx.fillStyle = 'rgb(10, 10, 10)'
    //patternCtx.fillStyle = 'rgb(240, 240, 240)'
    patternCtx.fillStyle = '#7E7EBA'
    patternCtx.fillRect(0, 0, size / 2, size / 2)
    patternCtx.fillRect(size / 2, size / 2, size / 2, size / 2)
    const ctx = canvas.getContext('2d')
    return ctx.createPattern(patternCanvas, 'repeat')
  })()

  const camera = {
    position: [-1280 / 2, -768 / 2],
    zoom: 1
  }
  const mouse = new Mouse()
  //const layers = Array(10).fill(undefined).map(_ => ({ grid: new Grid, things: [] }))

  state = {
    //mode: 'map',
    //layer: 0,
    //onionSkin: true,
    camera,
    mouse,
    world: [
      new CodeBlock([
        new CodeBlock([
          new CodeBlock('define'),
          new CodeBlock('test-value'),
          new CodeBlock([
            new CodeBlock('+'),
            new CodeBlock(1),
            new CodeBlock(2),
          ]),
        ]),
        new CodeBlock([
          new CodeBlock('quote'),
          new CodeBlock([
            new CodeBlock('a'),
            new CodeBlock('b'),
            new CodeBlock('c')
          ])
        ])
      ]),
      new CodeBlock([
        'define',
        'test-lambda',
        [
         'lambda',
          [
            'x'
          ],
          [
            '+',
            'x',
            1
          ]
        ]
      ])
      /*
      new CodeBlock([
        new CodeBlock('define'),
        new CodeBlock('fib'),
        new CodeBlock([new CodeBlock('n')]),
        new CodeBlock([
          new CodeBlock('cond'),
          new CodeBlock([new CodeBlock([new CodeBlock('='), new CodeBlock('n'), new CodeBlock(0)]), new CodeBlock(0)]),
          new CodeBlock([new CodeBlock([new CodeBlock('='), new CodeBlock('n'), new CodeBlock(1)]), new CodeBlock(1)]),
          new CodeBlock([
            new CodeBlock('else'),
            new CodeBlock([
              new CodeBlock('+'),
              new CodeBlock([new CodeBlock('fib'), new CodeBlock([new CodeBlock('-'), new CodeBlock('n'), new CodeBlock(1)])]),
              new CodeBlock([new CodeBlock('fib'), new CodeBlock([new CodeBlock('-'), new CodeBlock('n'), new CodeBlock(2)])])
            ])
          ])
        ])
      ])
      */
    ],
    worldMetadata: new WeakMap(),
    //layers,
    undo: [],
    redo: []
  }

  //state.world.at(0).name = 'test'
  state.world.forEach(x => x.recomputeFromTop())
  //state.world.at(1).name = 'fibb'

  serialize.commit()
  resize()
}

let animationFrames = 0
export function animate (frames = 1) {
  const lastAnimationFrames = animationFrames
  if (frames > animationFrames) {
    animationFrames = frames
  }
  if (animationFrames > 0 && lastAnimationFrames <= 0) {
    requestAnimationFrame(draw)
  }
}

export function draw () {
  const { mouse, layers, camera } = state

  const canvas = document.querySelector('#mainCanvas')
  const ctx = canvas.getContext('2d')
  ctx.font = '24px Arial'
  //ctx.imageSmoothingEnabled = false
  ctx.save()
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-Math.floor(camera.position[0]), -Math.floor(camera.position[1]))

  // draw bg
  ctx.fillStyle = canvas.backgroundPattern
  ctx.fillRect(...camera.position, canvas.width / camera.zoom, canvas.height / camera.zoom)

  // draw origin
  const r = 32
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-r, 0)
  ctx.lineTo(r, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.lineTo(0, r)
  ctx.stroke()

  mouse.updateHeldCodeBlock()

  ctx.save()
  for (const codeBlock of state.world) {
    codeBlock.draw(ctx)
  }
  ctx.restore()

  mouse.draw()

  ctx.restore()

  // draw hud
  /*
  ctx.save()
  ctx.fillStyle = 'lightGray'
  ctx.font = '24px Arial'
  ctx.fillText(String(mouse.position.map(x => Math.floor(x / 16))).replace(',', ', '), 48, 64)
  ctx.fillText(`${state.mode} mode`, 48, 64 + 32)
  ctx.fillText(`layer ${state.layer}`, 48, 64 + 64)
  ctx.restore()
  */

  if (animationFrames > 0) {
    requestAnimationFrame(draw)
    animationFrames -= 1
  }
}

export function instantiateEnvironment () {
  const environment = lips.env.__env__
  const world = []
  let [x, y] = [0, 0]

  const isConsCell = (expression) => {
    const result = (
      typeof expression === 'object' &&
        'car' in expression &&
        'cdr' in expression
    )
    //console.log('is cons cell', expression, result)
    return result
  }

  const isContinuedList = (expression) => {
    const result = (
      typeof expression === 'object' &&
        isConsCell(expression) &&
        isConsCell(expression.cdr)
    )
    //console.log('is continued list', expression, result)
    return result
  }

  const instantiateExpression = (expression) => {
    //console.log('instantiating', expression)
    if (typeof expression === 'function') {
      return instantiateExpression(expression.__code__)
    }
    if (typeof expression !== 'object') {
      if (typeof expression === 'bigint') {
        return Number(expression)
      }
      return expression
    }
    if (!isConsCell(expression)) {
      if ('string' in expression) {
        return `"${expression.string}"`
      }
      return instantiateExpression(
        expression.__value__ ?? expression.__name__
      )
    }
    const listResult = []
    while (isContinuedList(expression)) {
      //console.log('adding to list', expression.car)
      listResult.push(instantiateExpression(expression.car))
      expression = expression.cdr
    }
    if (expression.car) {
      listResult.push(instantiateExpression(expression.car))
    }
    return listResult
  }

  for (const [name, expression] of Object.entries(environment)) {
    if (name === '**internal-env**') { continue }
    const value = instantiateExpression(expression)
    if (value !== undefined) {
      world.push({ name, value })
    }
  }
  return world
}

export function getCtx () {
  const canvas = document.querySelector('#mainCanvas')
  return canvas.getContext('2d')
}

function resize () {
  const canvas = document.querySelector('#mainCanvas')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  draw()
}

window.addEventListener('resize', resize)
window.addEventListener('mousemove', e => {
  state.mouse.update(e)
  animate()
})
document.querySelector('#mainCanvas').addEventListener('mousedown', e => {
  state.mouse.leftButton = e.buttons & 1
  state.mouse.leftClick = e.buttons & 1
  state.mouse.rightButton = e.buttons & 2
  state.mouse.rightClick = e.buttons & 2
  state.mouse.middleButton = e.buttons & 4
  state.mouse.update(e)
  animate()
})
window.addEventListener('mouseup', e => {
  state.mouse.leftButton = e.buttons & 1
  state.mouse.rightButton = e.buttons & 2
  state.mouse.middleButton = e.buttons & 4
  state.mouse.update(e)
  animate()
})
document.querySelector('#mainCanvas').addEventListener('contextmenu', e => {
  e.preventDefault()
})
document.querySelector('#mainCanvas').addEventListener('wheel', e => {
  const { mouse, camera } = state

  // if holding shift, just change brush size instead
  if (e.shiftKey) {
    if (e.deltaY < 0) {
      mouse.radius += 1
    }
    if (e.deltaY > 0) {
      mouse.radius -= 1
      mouse.radius = Math.max(mouse.radius, 1)
    }
    animate()
    return
  }

  mouse.screenPosition = [e.clientX, e.clientY]
  const lastPosition = mouse.getWorldPosition()
  if (e.deltaY !== 0) {
    const delta = e.deltaY / 400
    let coeff = 1 - delta
    if (Math.abs(delta) > 0.15) {
      coeff = delta < 0 ? 1.15 : 1 / 1.15
    }
    camera.zoom *= coeff
    camera.zoom = Math.max(camera.zoom, 0.1)
    camera.zoom = Math.min(camera.zoom, 2)
    e.preventDefault()
  }
  /*
  if (e.deltaY < 0) {
    camera.zoom *= scalar
  }
  if (e.deltaY > 0) {
    camera.zoom /= scalar
  }
  */
  const delta = vec2.subtract(mouse.getWorldPosition(), lastPosition)
  camera.position[0] -= delta[0]
  camera.position[1] -= delta[1]
  animate()
})

window.addEventListener('keypress', e => {
  // if the selected element is one that can hold a value, don't take key inputs
  // this is to prevent toggling mode when typing in <input> or <textarea>
  if (document.activeElement.value) { return }
  
  // Check for Ctrl+R to reload the page
  if (e.ctrlKey && e.code === 'KeyR') {
    window.location.reload()
    return
  }

  const { mouse, camera } = state

  if (e.code === 'Equal') {
    const lastPosition = mouse.getWorldPosition()
    camera.zoom *= 1.1
    const delta = vec2.subtract(mouse.getWorldPosition(), lastPosition)
    camera.position[0] -= delta[0]
    camera.position[1] -= delta[1]
  }

  if (e.code === 'Minus') {
    const lastPosition = mouse.getWorldPosition()
    camera.zoom /= 1.1
    const delta = vec2.subtract(mouse.getWorldPosition(), lastPosition)
    camera.position[0] -= delta[0]
    camera.position[1] -= delta[1]
  }

  animate()
})

window.addEventListener('keydown', e => {
  if (state.mouse.editingCodeBlock) {
    const key = e.key
    const lastContent = state.mouse.editingCodeBlock.content
    let textBuffer = state.mouse.editingCodeBlock.content.toString()
    if (key === 'Backspace') {
      if (e.ctrlKey) {
        textBuffer = ''
      } else {
        textBuffer = textBuffer.slice(0, -1)
      }
    } else if (key === 'Enter') {
      textBuffer += '\n'
    } else if (key.length === 1) {
      textBuffer += key
    }
    state.mouse.editingCodeBlock.content = textBuffer
    const parsedNumber = Number(textBuffer)
    if (textBuffer !== '' && !Number.isNaN(parsedNumber)) {
      state.mouse.editingCodeBlock.content = parsedNumber
    }
    if (state.mouse.editingCodeBlock.content !== lastContent) {
      state.mouse.editingCodeBlock.updateInEnvironment()
    }
    state.mouse.editingCodeBlock.recomputeFromTop()
    animate()
    e.preventDefault()
  }

  if (e.code === 'KeyZ' && (navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey)) {
    e.preventDefault()
    if (e.shiftKey) {
      console.log('redo!')
      serialize.redo()
      animate()
    } else {
      console.log('undo!')
      serialize.undo()
      animate()
    }
  }
})

startup()
