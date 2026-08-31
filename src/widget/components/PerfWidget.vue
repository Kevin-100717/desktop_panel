<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref(null)
let ctx = null
let timer = null
const data = ref({ cpu: 0, mem: 0 })

const drawGauge = (cx, cy, r, v, label, suffix = '%') => {
    const start = Math.PI * 0.75
    const sweep = Math.PI * 1.5
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.arc(cx, cy, r, start, start + sweep)
    ctx.stroke()
    if (v > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.beginPath()
        ctx.arc(cx, cy, r, start, start + sweep * Math.min(1, v))
        ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${Math.round(v * 100)}${suffix}`, cx, cy + 2)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = '10px sans-serif'
    ctx.fillText(label, cx, cy + 20)
}

const draw = () => {
    const canvas = canvasRef.value
    if (!canvas) return
    if (!ctx) ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawGauge(55, 38, 24, data.value.cpu / 100, 'CPU')
    drawGauge(145, 38, 24, data.value.mem / 100, '内存')
}

const refresh = async () => {
    data.value = (await window.api?.getStats()) || { cpu: 0, mem: 0 }
    draw()
}

onMounted(() => {
    refresh()
    timer = setInterval(refresh, 2000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <canvas ref="canvasRef" width="200" height="80"></canvas>
</template>

<style scoped>
canvas {
  width: 200px;
  height: 80px;
  display: block;
  flex-shrink: 0;
}
</style>
