import { state, draw, animate, instantiateEnvironment } from './main.js'
import CodeBlock from './codeblock.js'
import * as vec2 from './vector2.js'
import * as itx from './interface.js'
import * as serialize from './serialize.js'
//import { Interpreter, exec } from './lips.js'
import Thing from './thing.js'

export default class Mouse {
  position = [0, 0]
  lastPosition = [0, 0]
  screenPosition = [0, 0]
  leftButton = false
  leftClick = false
  rightButton = false
  rightClick = false
  middleButton = false
  hoveredCodeBlock = undefined
  hoveredListBlock = undefined
  lastHoveredListBlock = undefined
  clickedCodeBlock = undefined
  heldCodeBlock = undefined
  heldCodeBlockOffset = [0, 0]
  heldCodeBlockPlaceholderIndex = -1
  lastHeldCodeBlockPlaceholderIndex = -1
  editingCodeBlock = undefined

  update (event) {
    this.screenPosition[0] = event.clientX
    this.screenPosition[1] = event.clientY
    this.position = this.getWorldPosition()

    this.hoveredCodeBlock = undefined
    this.lastHoveredListBlock = this.hoveredListBlock
    this.hoveredListBlock = undefined
    for (const codeBlock of getAllCodeBlocks()) {
      let codeBlockMinLayer = Infinity
      let listBlockMinLayer = Infinity
      if (!codeBlock.isHovered()) { continue }
      if (codeBlock.layer < codeBlockMinLayer) {
        codeBlockMinLayer = codeBlock.layer
        this.hoveredCodeBlock = codeBlock
      }
      if (codeBlock.layer < listBlockMinLayer && Array.isArray(codeBlock.content)) {
        listBlockMinLayer = codeBlock.layer
        this.hoveredListBlock = codeBlock
      }
    }

    if (this.leftClick && this.hoveredCodeBlock) {
      this.clickedCodeBlock = this.hoveredCodeBlock
    }
    if (!this.hoveredCodeBlock) {
      this.clickedCodeBlock = undefined
    }

    if (this.leftButton && this.clickedCodeBlock && !this.heldCodeBlock && event.type === 'mousemove') {
      this.heldCodeBlock = this.clickedCodeBlock
      this.editingCodeBlock = undefined
      const heldCodeBlockWorldPosition = this.heldCodeBlock.getWorldPosition()
      this.heldCodeBlockOffset[0] = this.position[0] - heldCodeBlockWorldPosition[0]
      this.heldCodeBlockOffset[1] = this.position[1] - heldCodeBlockWorldPosition[1]
      this.hoveredCodeBlock.remove()
      this.hoveredCodeBlock = undefined

      if (this.heldCodeBlock.name in lips.env.__env__) {
        delete lips.env.__env__[this.heldCodeBlock.name]
      }
    }

    if (this.rightClick && this.hoveredCodeBlock) {
      if (this.editingCodeBlock) {
        const codeBlock = this.editingCodeBlock
        this.editingCodeBlock = undefined
        codeBlock.recomputeFromTop()
      }
      /*
      const codeBlock = this.hoveredCodeBlock
      const code = this.hoveredCodeBlock.stringify()
      lips.exec(code).then(x => {
        console.log(x.toString())
        codeBlock.evalFrames = 60
        animate(60)
        console.log(lips.env.__env__)
        const instantiatedEnvironment = instantiateEnvironment(lips.env.__env__)
        for (const { name, value } of instantiatedEnvironment) {
          const codeBlockExists = state.world.some(x => x.name === name)
          if (codeBlockExists) { continue }
          const codeBlock = new CodeBlock(value)
          codeBlock.name = name
          codeBlock.recomputeFromTop()
          state.world.push(codeBlock)
        }
      }).catch(e => {
        console.error(e)
        codeBlock.evalFrames = -60
        animate(60)
      })
      */
      this.executeCodeBlock(this.hoveredCodeBlock)
    }

    if (this.clickedCodeBlock && !this.editingCodeBlock && !this.heldCodeBlock) {
      this.editingCodeBlock = (
        !Array.isArray(this.clickedCodeBlock.content)
        ? this.clickedCodeBlock
        : undefined
      )
    }
    if (this.leftClick) {
      this.editingCodeBlock = undefined
    }

    /*
    if (
      this.lastHoveredListBlock &&
      this.lastHoveredListBlock !== this.hoveredListBlock
    ) {
      this.lastHoveredListBlock.recomputeFromTop()
    }
    */

    this.lastHeldCodeBlockPlaceholderIndex = this.heldCodeBlockPlaceholderIndex
    this.heldCodeBlockPlaceholderIndex = -1
    if (this.heldCodeBlock) {
      if (Array.isArray(this.hoveredListBlock?.content)) {
        let closestSplice = 0
        let closestSpliceDistance = Infinity
        const codeBlockWorldPosition = this.hoveredListBlock.getWorldPosition()
        const heldBlockWorldPosition = this.heldCodeBlock.getWorldPosition()
        for (const [i, spliceCoord] of this.hoveredListBlock.splices.entries()) {
          const splicePosition = (
            this.hoveredListBlock.isVertical
            ? spliceCoord + codeBlockWorldPosition[1]
            : spliceCoord + codeBlockWorldPosition[0]
          )
          const mousePosition = (
            this.hoveredListBlock.isVertical
            ? this.position[1]
            : this.position[0]
          )
          const dist = Math.abs(splicePosition - mousePosition)
          if (dist < closestSpliceDistance) {
            closestSplice = i
            closestSpliceDistance = dist
          }
        }
        this.heldCodeBlockPlaceholderIndex = closestSplice
        //this.hoveredListBlock.recomputeFromTop()
      }
    }

    /*
    if (
      this.lastHeldCodeBlockPlaceholderIndex !== -1 &&
      this.heldCodeBlockPlaceholderIndex === -1 &&
      this.hoveredListBlock
    ) {
      this.hoveredListBlock.recomputeFromTop()
    }
    */

    if (this.leftButton && !this.heldCodeBlock) {
      state.camera.position[0] -= event.movementX / state.camera.zoom
      state.camera.position[1] -= event.movementY / state.camera.zoom
    }
    this.lastPosition = [...this.position]

    this.leftClick = false
    this.rightClick = false
  }

  executeCodeBlock (codeBlock) {
    const code = codeBlock.stringify()
    lips.exec(code).then(x => {
      console.log(x.toString())
      codeBlock.evalFrames = 60
      animate(60)
      console.log(lips.env.__env__)
      const instantiatedEnvironment = instantiateEnvironment(lips.env.__env__)
      for (const { name, value } of instantiatedEnvironment) {
        const codeBlockIndex = state.world.findIndex(x => x.name === name)
        let [x, y] = [0, 0]
        if (codeBlockIndex !== -1) {
          [x, y] = state.world[codeBlockIndex].position
          state.world.splice(codeBlockIndex, 1)
        }
        const codeBlock = new CodeBlock(value)
        codeBlock.position = [x, y]
        codeBlock.name = name
        codeBlock.recomputeFromTop()
        state.world.push(codeBlock)
      }
    }).catch(e => {
      console.error(e)
      codeBlock.evalFrames = -60
      animate(60)
    })
  }

  dropHeldCodeBlock () {
    animate()

    if (this.heldCodeBlockPlaceholderIndex > -1) {
      this.hoveredListBlock.content.splice(this.heldCodeBlockPlaceholderIndex, 0, this.heldCodeBlock)
      this.heldCodeBlock.parent = this.hoveredListBlock
      this.heldCodeBlock.recomputeFromTop()
      this.heldCodeBlock = undefined
      return
    }

    let i = 1
    let name = this.heldCodeBlock.name
    if (name !== '') {
      let originalName = name
      while (name in lips.env.__env__) {
        name = `${originalName}_${i}`
        i += 1
      }
      this.heldCodeBlock.name = name
      this.heldCodeBlock.updateInEnvironment()
    }

    state.world.push(this.heldCodeBlock)
    this.heldCodeBlock.recomputeFromTop()
    this.heldCodeBlock = undefined
  }

  draw (ctx) {
    if (this.heldCodeBlock) {
      if (this.leftButton) {
        this.heldCodeBlock.position[0] = this.position[0] - this.heldCodeBlockOffset[0]
        this.heldCodeBlock.position[1] = this.position[1] - this.heldCodeBlockOffset[1]
        this.heldCodeBlock.draw()
      } else {
        this.dropHeldCodeBlock()
      }
    }
  }

  getWorldPosition () {
    return [
      (this.screenPosition[0] / state.camera.zoom) + state.camera.position[0],
      (this.screenPosition[1] / state.camera.zoom) + state.camera.position[1]
    ]
  }

  getLayer () {
    return state.layers[state.layer]
  }
}

function getAllCodeBlocks () {
  const result = []
  const recurse = (codeBlock) => {
    result.push(codeBlock)
    if (Array.isArray(codeBlock.content)) {
      codeBlock.content.forEach(recurse)
      return
    }
  }
  state.world.forEach(recurse)
  return result
}
