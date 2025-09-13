import { state, draw } from './main.js'
import * as vec2 from './vector2.js'
import * as u from './utils.js'
import * as serialize from './serialize.js'
import * as itx from './interface.js'

export default class Thing {
  position = [0, 0]
  name = 'unnamed'
  data = {}

  constructor (position) {
    this.position = position
  }

  draw (ctx, layerIndex) {
    ctx.save()
    ctx.translate(...this.position.map(x => x * 16))
    ctx.fillStyle = itx.stringToColor(this.name)
    ctx.strokeStyle = 'white'
    ctx.beginPath()
    ctx.arc(0, 0, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (state.mouse.thingSelection.includes(this)) {
      ctx.beginPath()
      ctx.arc(0, 0, 12, 0, Math.PI * 2)
      ctx.stroke()
    } else if (
      state.mode === 'thing'
      && vec2.distance(state.mouse.tilePositionFloat, this.position) <= 0.5
      && layerIndex === state.layer
    ) {
      ctx.beginPath()
      ctx.arc(0, 0, 14, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.textAlign = 'center'
    ctx.font = '16px Arial'
    ctx.fillStyle = 'black'
    ctx.fillText(this.name, 1, -15)
    ctx.fillStyle = 'white'
    ctx.fillText(this.name, 0, -16)
    ctx.restore()
  }

  onSelected () {
    document.querySelector('#thingMenu').hidden = false
    document.querySelector('#thingMenu #nameInput').value = this.name
    document.querySelector('#thingMenu #dataInput').value = JSON.stringify(this.data, null, 2)
    document.querySelector('#thingMenu #nameInput').onchange = (e) => {
      this.name = e.target.value
      serialize.commit()
      draw()
    }
    document.querySelector('#thingMenu #dataInput').onchange = (e) => {
      try {
        const data = JSON.parse(e.target.value)
        this.data = data
        serialize.commit()
        draw()
      } catch (err) {
        alert(err)
        document.querySelector('#thingMenu #dataInput').value = JSON.stringify(this.data, null, 2)
      }
    }
  }

  onDeselected () {
    document.querySelector('#thingMenu').hidden = true
  }
}
