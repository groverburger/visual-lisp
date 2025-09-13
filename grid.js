import * as u from './utils.js'
import * as itx from './interface.js'

const tileSize = 16
const defaultDensity = 64

export default class Grid {
  grid = {}
  canvasGrid = {}
  dirty = false
  canvasDensity = defaultDensity
  canvasSize = defaultDensity * tileSize

  constructor (canvasDensity) {
    this.canvasDensity = canvasDensity || this.canvasDensity
    this.canvasSize = this.canvasDensity * tileSize
  }

  set (x, y, value) {
    x = Math.floor(x)
    y = Math.floor(y)

    // set the value of the grid cell to the given value
    // if the value is falsy, remove the value from the grid
    if (value) {
      this.grid[[x, y]] = value
    } else {
      if (this.grid[[x, y]]) {
        delete this.grid[[x, y]]
      } else {
        // do nothing
        return
      }
    }

    // if there is no canvas associated with this grid cell, create one
    const canvasCoord = [Math.floor(x / this.canvasDensity), Math.floor(y / this.canvasDensity)]
    if (!this.canvasGrid[canvasCoord]) {
      const canvas = document.createElement('canvas')
      canvas.width = this.canvasSize
      canvas.height = this.canvasSize
      canvas.coord = canvasCoord
      canvas.mapCoord = canvasCoord.map(x => x * this.canvasDensity)
      canvas.drawCoord = canvasCoord.map(x => x * this.canvasDensity * tileSize)
      canvas.refresh = () => {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, this.canvasSize, this.canvasSize)
        const [cx, cy] = canvasCoord

        let didDraw = false
        for (let x = cx * this.canvasDensity; x < (cx + 1) * this.canvasDensity; x += 1) {
          for (let y = cy * this.canvasDensity; y < (cy + 1) * this.canvasDensity; y += 1) {
            const value = this.grid[[x, y]]
            if (!value) { continue }
            ctx.fillStyle = itx.getColorFromValue(value)
            const dx = (x - cx * this.canvasDensity) * tileSize
            const dy = (y - cy * this.canvasDensity) * tileSize
            ctx.fillRect(dx, dy, tileSize, tileSize)
            ctx.font = '8px Arial'
            ctx.fillStyle = 'black'
            ctx.fillText(String(value), dx + 2 + 1, dy + 14 + 1)
            ctx.fillStyle = 'lightGray'
            ctx.fillText(String(value), dx + 2, dy + 14)
            didDraw = true
          }
        }

        // if this canvas has no contents, get rid of it
        if (!didDraw) {
          delete this.canvasGrid[canvasCoord]
        }

        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(canvas.width - 1, 0)
        ctx.lineTo(canvas.width - 1, canvas.height - 1)
        ctx.lineTo(0, canvas.height - 1)
        ctx.lineTo(0, 0)
        ctx.strokeStyle = 'white'
        ctx.stroke()
        canvas.dirty = false
      }
      this.canvasGrid[canvasCoord] = canvas
    }

    this.canvasGrid[canvasCoord].dirty = true
  }

  draw (ctx) {
    for (const canvas of Object.values(this.canvasGrid)) {
      if (canvas.dirty) { canvas.refresh() }
      ctx.drawImage(canvas, ...canvas.drawCoord)
    }
  }

  getData () {
    const data = {}
    for (const canvas of Object.values(this.canvasGrid)) {
      const tiles = []
      for (let y = canvas.mapCoord[1]; y < canvas.mapCoord[1] + this.canvasDensity; y += 1) {
        for (let x = canvas.mapCoord[0]; x < canvas.mapCoord[0] + this.canvasDensity; x += 1) {
          tiles.push(this.grid[[x, y]] || 0)
        }
      }
      data[canvas.mapCoord] = tiles
    }
    return data
  }
}
