import { getCtx, state } from './main.js'

export default class CodeBlock {
  position = [0, 0]
  dimensions = [0, 0]
  content = null
  parent = null
  name = ''
  layer = 0
  layerFromRoot = 0
  splices = []
  isVertical = false
  evalFrames = 0

  constructor (content) {
    if (Array.isArray(content)) {
      this.content = content.map(x =>
        x instanceof CodeBlock ? x : new CodeBlock(x)
      )
    } else {
      this.content = content
    }
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
    if (typeof this.content === 'number') {
      ctx.font = 'bold 24px Courier New'
    }
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

  updateInEnvironment () {
    if (this.parent) {
      this.parent.updateInEnvironment()
      return
    }
    const name = this.name
    if (name === '' || !name) { return }
    const code = `(define ${name} ${this.stringify()})`
    try {
      lips.exec(code).then(() => {
        console.log(lips.env.__env__)
      })
    } catch (e) {
      console.log(`Tried to update ${name} in enviornment, but failed!`)
      console.error(e)
    }
  }

  remove () {
    if (this.parent) {
      this.parent.content = this.parent.content.filter(x => x !== this)
      this.recomputeFromTop()
      this.parent = null
    } else {
      state.world = state.world.filter(x => x !== this)
    }
  }

  draw () {
    const ctx = getCtx()

    if (this.evalFrames !== 0) {
      this.evalFrames += (this.evalFrames > 0 ? -1 : 1)
    }

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

      if (this.evalFrames !== 0) {
        ctx.strokeStyle = this.evalFrames > 0 ? 'cyan' : 'red'
        ctx.lineWidth = Math.min(Math.abs(this.evalFrames) / 10, 5)
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
    if (state.mouse.editingCodeBlock === this && !state.mouse.heldCodeBlock) {
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    if (this.evalFrames !== 0) {
      ctx.strokeStyle = this.evalFrames > 0 ? 'cyan' : 'red'
      ctx.lineWidth = Math.min(Math.abs(this.evalFrames) / 10, 5)
      ctx.stroke()
    }
    ctx.fillStyle = 'white'
    if (typeof this.content === 'number') {
      ctx.fillStyle = 'cyan'
      ctx.font = 'bold 24px Courier New'
    }
    if (this.content[0] === '"' && this.content[this.content.length - 1] === '"') {
      ctx.fillStyle = 'yellow'
      ctx.font = 'italic 24px Arial'
    }
    ctx.textAlign = 'center'
    ctx.fillText(str, x, 24)
    if (state.mouse.editingCodeBlock === this) {
      const { width } = ctx.measureText(str)
      ctx.textAlign = 'left'
      ctx.fillText('|', x + width / 2 - 4, 22)
    }
    ctx.restore()
  }
}
