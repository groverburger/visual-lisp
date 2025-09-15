import Mouse from './mouse.js'
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
    world: {
      'test': new CodeBlock([
        new CodeBlock([
          new CodeBlock('layer 2 a'),
          new CodeBlock('layer 2 b'),
          new CodeBlock([
            new CodeBlock('layer 3'),
            new CodeBlock(1),
            new CodeBlock(2),
          ]),
        ]),
        new CodeBlock('layer 1 a'),
        new CodeBlock('layer 1 b')
      ]),
      'fibb': new CodeBlock([
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
    },
    worldMetadata: new WeakMap(),
    //layers,
    undo: [],
    redo: []
  }

  state.world.test.name = 'test'
  state.world.test.recompute(canvas.getContext('2d'))
  state.world.fibb.name = 'fibb'
  state.world.fibb.recompute(canvas.getContext('2d'))

  serialize.commit()
  resize()
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

  ctx.save()
  for (const [name, codeBlock] of Object.entries(state.world)) {
    codeBlock.draw(ctx)
  }
  ctx.restore()

  mouse.draw(ctx)

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
}

function getCtx () {
  const canvas = document.querySelector('#mainCanvas')
  return canvas.getContext('2d')
}

class CodeBlock {
  position = [0, 0]
  dimensions = [0, 0]
  content = null
  parent = null
  name = ''
  layer = 0
  layerFromRoot = 0
  splices = []
  isVertical = false

  constructor (content) {
    this.content = content
  }

  recompute () {
    const recomputeLayer = (item, layerFromRoot) => {
      item.layer = 0
      item.layerFromRoot = layerFromRoot
      if (Array.isArray(item.content)) {
        item.layer = 1 + Math.max(0, ...item.content.map(x => recomputeLayer(x, layerFromRoot + 1)))
      }
      return item.layer
    }
    if (!this.parent) {
      recomputeLayer(this, 0)
    }

    const ctx = getCtx()

    // Array of other CodeBlocks
    if (Array.isArray(this.content)) {
      this.splices = []
      if (this.layer >= 3) {
        this.isVertical = true
      }
      if (this.layer <= 1) {
        this.isVertical = false
      }
      if (this.isVertical) {
        this.isVertical = true
        const padding = 12
        let totalHeight = padding
        let totalSpliceHeight = totalHeight
        let totalWidth = 48
        this.splices.push(padding / 2)
        for (const [i, item] of this.content.entries()) {
          item.parent = this
          item.recompute()
          totalHeight += (
            i === state.mouse.heldCodeBlockPlaceholderIndex &&
            false &&
            this === state.mouse.hoveredListBlock &&
            this !== state.mouse.heldCodeBlock
            ? state.mouse.heldCodeBlock.dimensions[1] + padding
            : 0
          )
          item.position[1] = totalHeight
          totalHeight += item.dimensions[1] + padding
          totalSpliceHeight += item.dimensions[1] + padding
          this.splices.push(totalSpliceHeight - padding / 2)
        }
        if (
          false &&
          this === state.mouse.hoveredListBlock &&
          state.mouse.heldCodeBlockPlaceholderIndex === this.content.length &&
          this !== state.mouse.heldCodeBlock
        ) {
          totalHeight += state.mouse.heldCodeBlock.dimensions[1] + padding
        }
        this.dimensions = [totalWidth, totalHeight]
        for (const item of this.content) {
          item.position[0] = padding
        }
      } else {
        this.isVertical = false
        const padding = 12
        let totalWidth = padding
        let totalSpliceWidth = padding
        let totalHeight = 32
        this.splices.push(padding / 2)
        for (const [i, item] of this.content.entries()) {
          item.parent = this
          item.recompute()
          totalWidth += (
            false &&
            i === state.mouse.heldCodeBlockPlaceholderIndex &&
            this === state.mouse.hoveredListBlock &&
            this !== state.mouse.heldCodeBlock
            ? state.mouse.heldCodeBlock.dimensions[0] + padding
            : 0
          )
          item.position[0] = totalWidth
          totalWidth += item.dimensions[0] + padding
          totalSpliceWidth += item.dimensions[0] + padding
          totalHeight = Math.max(totalHeight, item.dimensions[1] + 8)
          this.splices.push(totalSpliceWidth - padding / 2)
        }
        if (
          false &&
          this === state.mouse.hoveredListBlock &&
          state.mouse.heldCodeBlockPlaceholderIndex === this.content.length &&
          this !== state.mouse.heldCodeBlock
        ) {
          totalWidth += state.mouse.heldCodeBlock.dimensions[0] + padding
        }
        this.dimensions = [totalWidth, totalHeight]
        if (this.content.length === 0) {
          this.dimensions[0] = 32
        }
        for (const item of this.content) {
          item.position[1] = (this.dimensions[1] - item.dimensions[1]) / 2
        }
      }

      return this.dimensions
    }

    // This is a literal
    ctx.save()
    ctx.font = '24px Arial'
    const str = `${this.content}`
    const { width } = ctx.measureText(str)
    const padding = 4
    this.dimensions = [Math.max(width, 16) + padding * 2, 32]
    ctx.restore()
    return this.dimensions
  }

  recomputeFromTop () {
    let lastParent = this
    let nextParent = this.parent
    while (nextParent) {
      lastParent = nextParent
      nextParent = nextParent.parent
    }
    lastParent.recompute()
  }

  getWorldPosition () {
    let nextParent = this
    const result = [0, 0]
    while (nextParent) {
      result[0] += nextParent.position[0]
      result[1] += nextParent.position[1]
      /*
      if (this.parent && state.mouse.heldCodeBlock) {
        const myIndex = this.parent.content.findIndex(x => x === this)
        if (myIndex >= state.mouse.heldCodeBlockPlaceholderIndex && this.parent === state.mouse.hoveredListBlock) {
          if (this.parent.isVertical) {
            result[1] -= state.mouse.heldCodeBlock.dimensions[1]
          } else {
            result[0] -= state.mouse.heldCodeBlock.dimensions[0]
          }
        }
      }
      */
      nextParent = nextParent.parent
    }
    return result
  }

  isHovered () {
    const worldPosition = this.getWorldPosition()
    return (
      state.mouse.position[0] >= worldPosition[0] &&
      state.mouse.position[1] >= worldPosition[1] &&
      state.mouse.position[0] <= worldPosition[0] + this.dimensions[0] &&
      state.mouse.position[1] <= worldPosition[1] + this.dimensions[1]
    )
  }

  stringify () {
    if (Array.isArray(this.content)) {
      return '(' + this.content.map(x => x.stringify()).join(' ') + ')'
    }
    return this.content.toString()
  }

  remove () {
    if (this.parent) {
      this.parent.content = this.parent.content.filter(x => x !== this)
      this.recomputeFromTop()
      this.parent = null
    } else {
      delete state.world[this.name]
    }
  }

  draw () {
    const ctx = getCtx()

    // Draw name tag
    if (!this.parent && this.name !== '') {
      ctx.save()
      ctx.translate(...this.position)
      ctx.translate(-8, -4)
      ctx.rotate(-0.15)
      if (state.mouse.heldCodeBlock === this) {
        ctx.globalAlpha = 0.8
      }
      ctx.font = '24px Arial'
      ctx.fillStyle = '#FFA500'
      const { width } = ctx.measureText(this.name)
      //ctx.translate((width + padding * 2) / -2, 0)
      ctx.beginPath()
      const padding = 6
      ctx.roundRect(0 - padding, -24, width + padding * 2, 24 + padding, 5)
      ctx.fill()
      ctx.fillStyle = 'white'
      ctx.fillText(this.name, 0, 0)
      ctx.restore()
    }

    // Draw list
    if (Array.isArray(this.content)) {
      ctx.save()
      if (!this.parent) {
        ctx.translate(...this.position)
      }
      ctx.beginPath()
      ctx.roundRect(-2, 2, this.dimensions[0], this.dimensions[1], 5)
      ctx.fillStyle = 'black'
      ctx.fill()
      ctx.fillStyle = [
        '#33CC70',
        '#33CCCC',
        '#3370CC',
        '#5133CC',
        '#AD33CC'
      ][this.layerFromRoot % 5]
      ctx.beginPath()
      ctx.roundRect(0, 0, this.dimensions[0], this.dimensions[1], 5)
      ctx.fill()

      if (state.mouse.hoveredCodeBlock === this && !state.mouse.heldCodeBlock) {
        ctx.strokeStyle = 'white'
        ctx.stroke()
      }

      for (const item of this.content) {
        ctx.save()
        ctx.translate(item.position[0], item.position[1])
        item.draw()
        ctx.restore()
      }

      // Draw splice lines for slotting in held code block
      if (state.mouse.hoveredListBlock === this && state.mouse.heldCodeBlock && state.mouse.heldCodeBlock !== this) {
        for (const [i, splice] of this.splices.entries()) {
          if (this.isVertical) {
            ctx.save()
            ctx.translate(0, splice)
            ctx.beginPath()
            ctx.moveTo(4, 0)
            ctx.lineTo(this.dimensions[0] - 4, 0)
            ctx.strokeStyle = 'white'
            if (i !== state.mouse.heldCodeBlockPlaceholderIndex) {
              ctx.globalAlpha = 0.5
            }
            ctx.stroke()
            ctx.restore()
          } else {
            ctx.save()
            ctx.translate(splice, 0)
            ctx.beginPath()
            ctx.moveTo(0, 4)
            ctx.lineTo(0, this.dimensions[1] - 4)
            ctx.strokeStyle = 'white'
            if (i !== state.mouse.heldCodeBlockPlaceholderIndex) {
              ctx.globalAlpha = 0.5
            }
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      ctx.restore()
      return
    }

    // Draw literal
    ctx.save()
    ctx.font = '24px Arial'
    const str = `${this.content}`
    const padding = 0
    const x = this.dimensions[0] / 2
    ctx.fillStyle = 'black'
    ctx.globalAlpha = 0.65
    ctx.strokeStyle = 'white'
    if (!this.parent) {
      ctx.translate(...this.position)
    }
    ctx.beginPath()
    ctx.roundRect(x - this.dimensions[0] / 2 - padding, 0, this.dimensions[0] + padding * 2,  32, 5)
    ctx.fill()
    ctx.globalAlpha = 1
    if (state.mouse.hoveredCodeBlock === this && !state.mouse.heldCodeBlock) {
      ctx.strokeStyle = 'white'
      ctx.stroke()
    }
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.fillText(str, x, 24)
    ctx.restore()
  }
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
  draw()
})
document.querySelector('#mainCanvas').addEventListener('mousedown', e => {
  state.mouse.leftButton = e.buttons & 1
  state.mouse.leftClick = e.buttons & 1
  state.mouse.rightButton = e.buttons & 2
  state.mouse.rightClick = e.buttons & 2
  state.mouse.middleButton = e.buttons & 4
  state.mouse.update(e)
  draw()
})
window.addEventListener('mouseup', e => {
  state.mouse.leftButton = e.buttons & 1
  state.mouse.rightButton = e.buttons & 2
  state.mouse.middleButton = e.buttons & 4
  state.mouse.update(e)
  draw()
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
    draw()
    return
  }

  mouse.screenPosition = [e.clientX, e.clientY]
  const lastPosition = mouse.getWorldPosition()
  const scalar = 1.1
  if (e.deltaY < 0) {
    camera.zoom *= scalar
  }
  if (e.deltaY > 0) {
    camera.zoom /= scalar
  }
  const delta = vec2.subtract(mouse.getWorldPosition(), lastPosition)
  camera.position[0] -= delta[0]
  camera.position[1] -= delta[1]
  draw()
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

  draw()
})

window.addEventListener('keydown', e => {
  if (e.code === 'KeyZ' && (navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey)) {
    e.preventDefault()
    if (e.shiftKey) {
      console.log('redo!')
      serialize.redo()
      draw()
    } else {
      console.log('undo!')
      serialize.undo()
      draw()
    }
  }
})

startup()
