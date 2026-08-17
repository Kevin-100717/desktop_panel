<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref(null)
const status = ref('connecting')
const style = ref('bars')
let analyser = null
let rafId = null
let ctx = null
let audioCtx = null
let sourceNode = null
let streamTracks = null
let waterfallCanvas = null
let stars = null

const circular = computed(() => ['ring', 'dots', 'pulse', 'radar'].includes(style.value))

const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
    analyser = null
    if (sourceNode) {
        try { sourceNode.disconnect() } catch {}
        sourceNode = null
    }
    if (audioCtx) {
        try { audioCtx.close() } catch {}
        audioCtx = null
    }
    if (streamTracks) {
        streamTracks.forEach((t) => {
            try { t.stop() } catch {}
        })
        streamTracks = null
    }
}

const start = async () => {
    cleanup()
    status.value = 'connecting'
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
        const videoTracks = stream.getVideoTracks()
        videoTracks.forEach((t) => {
            t.stop()
            stream.removeTrack(t)
        })
        streamTracks = stream.getAudioTracks()
        if (!streamTracks.length) throw new Error('no audio track')
        audioCtx = new AudioContext()
        sourceNode = audioCtx.createMediaStreamSource(stream)
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.75
        sourceNode.connect(analyser)
        streamTracks[0].onended = () => {
            status.value = 'failed'
            setTimeout(start, 2000)
        }
        status.value = 'ok'
        draw()
    } catch {
        status.value = 'failed'
        setTimeout(start, 3000)
    }
}

const binValues = (data) => {
    const sampleRate = audioCtx.sampleRate || 48000
    const nyquist = sampleRate / 2
    const maxFreq = Math.min(10000, nyquist)
    const minFreq = 40
    const range = maxFreq - minFreq
    const barCount = 40
    const vals = new Array(barCount)
    for (let i = 0; i < barCount; i++) {
        const f0 = minFreq + (range * i) / barCount
        const f1 = minFreq + (range * (i + 1)) / barCount
        const b0 = Math.floor((f0 / nyquist) * data.length)
        const b1 = Math.min(data.length, Math.max(b0 + 1, Math.ceil((f1 / nyquist) * data.length)))
        let sum = 0
        for (let j = b0; j < b1; j++) sum += data[j]
        vals[i] = (sum / (b1 - b0)) / 255
    }
    return vals
}

const barNorm = (v) => Math.pow(v * 0.75, 1.15)

const drawBars = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    const barCount = vals.length
    const bw = w / barCount
    for (let i = 0; i < barCount; i++) {
        const bh = Math.max(2, barNorm(vals[i]) * h)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh)
    }
}

const drawMirror = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    const barCount = vals.length
    const bw = w / barCount
    const hc = h / 2
    for (let i = 0; i < barCount; i++) {
        const bh = Math.max(2, barNorm(vals[i]) * (h / 2))
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(i * bw + 1, hc - bh, bw - 2, bh * 2)
    }
}

const drawLine = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    const barCount = vals.length
    const bw = w / barCount
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i < barCount; i++) {
        const x = i * bw + bw / 2
        const y = h - Math.max(0, Math.min(1, vals[i] * 1.15)) * (h - 4) - 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
    }
    ctx.stroke()
}

const drawRing = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    const cx = w / 2
    const cy = h / 2
    const inner = 20
    const maxLen = Math.min(w, h) / 2 - inner - 4
    const barCount = vals.length
    for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
        const len = Math.max(2, barNorm(vals[i]) * maxLen)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angle)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(inner, -1, Math.max(2, len), 2)
        ctx.restore()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, inner, 0, Math.PI * 2)
    ctx.stroke()
}

const drawDots = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    const cx = w / 2
    const cy = h / 2
    const base = 16
    const maxLen = Math.min(w, h) / 2 - base - 6
    const barCount = vals.length
    for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
        const v = Math.max(0, Math.min(1, Math.pow(vals[i] * 0.9, 0.75)))
        const r = base + v * maxLen
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.beginPath()
        ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 2, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, base, 0, Math.PI * 2)
    ctx.stroke()
}

const avg = (arr, from, to) => {
    let s = 0
    for (let i = from; i < to; i++) s += arr[i]
    return s / (to - from)
}

const drawPulse = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    const cx = w / 2
    const cy = h / 2
    const maxR = Math.min(w, h) / 2 - 4
    const bass = avg(vals, 0, 13)
    const mid = avg(vals, 13, 27)
    const high = avg(vals, 27, 40)
    const rings = [
        { v: bass * 1.4, r0: 10, amp: maxR - 10, alpha: 0.8 },
        { v: mid * 1.1, r0: 22, amp: maxR - 22, alpha: 0.55 },
        { v: high * 0.9, r0: 34, amp: maxR - 34, alpha: 0.35 }
    ]
    for (const ring of rings) {
        const r = ring.r0 + Math.pow(Math.max(0, Math.min(1, ring.v)), 1.1) * ring.amp
        ctx.strokeStyle = `rgba(255,255,255,${ring.alpha})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
    }
}

const drawWaterfall = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    if (!waterfallCanvas) {
        waterfallCanvas = document.createElement('canvas')
        waterfallCanvas.width = w
        waterfallCanvas.height = h
    }
    const octx = waterfallCanvas.getContext('2d')
    octx.globalCompositeOperation = 'destination-in'
    octx.fillStyle = 'rgba(0,0,0,0.14)'
    octx.fillRect(0, 0, w, h)
    octx.globalCompositeOperation = 'source-over'
    octx.drawImage(waterfallCanvas, 0, -1)
    const barCount = vals.length
    const bw = w / barCount
    for (let i = 0; i < barCount; i++) {
        const bh = Math.max(1, barNorm(vals[i]) * (h - 1))
        octx.fillStyle = 'rgba(255,255,255,0.8)'
        octx.fillRect(i * bw + 1, h - bh, bw - 2, bh)
    }
    ctx.drawImage(waterfallCanvas, 0, 0)
}

const drawStars = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    if (!stars) {
        stars = []
        for (let i = 0; i < 60; i++) {
            stars.push({ x: Math.random() * w, y: Math.random() * h, s: Math.random() * 0.5 + 0.5 })
        }
    }
    const t = performance.now() / 1000
    for (const st of stars) {
        const i = Math.floor((st.x / w) * vals.length) % vals.length
        const v = Math.pow(vals[i], 1.2)
        st.y -= (0.1 + v * 1.6) * st.s
        st.x += Math.sin(t * 2 + st.y * 0.2) * 0.2 * st.s
        if (st.y < -2) {
            st.y = h + 2
            st.x = Math.random() * w
        }
        ctx.fillStyle = `rgba(255,255,255,${0.12 + v * 0.88})`
        ctx.beginPath()
        ctx.arc(st.x, st.y, 0.6 + v * 1.8, 0, Math.PI * 2)
        ctx.fill()
    }
}

const drawRadar = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    const cx = w / 2
    const cy = h / 2
    const maxR = Math.min(w, h) / 2 - 6
    const base = 10
    const barCount = vals.length
    const t = performance.now() / 1000
    ctx.beginPath()
    for (let i = 0; i <= barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
        const v = Math.max(0, Math.min(1, Math.pow(vals[i % barCount] * 0.9, 0.8)))
        const r = base + v * (maxR - base)
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    const sweep = (t * 1.2) % (Math.PI * 2) - Math.PI / 2
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.arc(cx, cy, base, 0, Math.PI * 2)
    ctx.stroke()
}

const drawStrings = (vals) => {
    const w = canvasRef.value.width
    const h = canvasRef.value.height
    const barCount = vals.length
    const bw = w / barCount
    const t = performance.now() / 1000
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 1
    for (let i = 0; i < barCount; i++) {
        const v = Math.pow(vals[i] * 0.75, 1.15)
        const amp = v * 6
        const x = i * bw + bw / 2
        ctx.beginPath()
        ctx.moveTo(x, 2)
        ctx.quadraticCurveTo(
            x + Math.sin(t * 3 + i * 0.6) * amp,
            h / 2,
            x + Math.sin(t * 5 + i * 0.9) * amp * 0.8,
            h - 2
        )
        ctx.stroke()
    }
}

const draw = () => {
    const canvas = canvasRef.value
    if (!canvas || !analyser || !audioCtx) return
    if (!ctx) ctx = canvas.getContext('2d')
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const vals = binValues(data)
    if (style.value === 'mirror') drawMirror(vals)
    else if (style.value === 'line') drawLine(vals)
    else if (style.value === 'ring') drawRing(vals)
    else if (style.value === 'dots') drawDots(vals)
    else if (style.value === 'pulse') drawPulse(vals)
    else if (style.value === 'waterfall') drawWaterfall(vals)
    else if (style.value === 'stars') drawStars(vals)
    else if (style.value === 'radar') drawRadar(vals)
    else if (style.value === 'strings') drawStrings(vals)
    else drawBars(vals)
    rafId = requestAnimationFrame(draw)
}

onMounted(async () => {
    const config = await window.api?.getConfig()
    style.value = config?.spectrumStyle || 'bars'
    start()
})
onUnmounted(cleanup)
</script>

<template>
  <div class="spectrum">
    <canvas
      ref="canvasRef"
      :width="circular ? 140 : 280"
      :height="circular ? 140 : 70"
    ></canvas>
    <div v-if="status !== 'ok'" class="hint">
      {{ status === 'connecting' ? '音频连接中…' : '音频未捕获，自动重试中…' }}
    </div>
  </div>
</template>

<style scoped>
.spectrum {
  position: relative;
}

canvas {
  display: block;
}

.hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}
</style>
