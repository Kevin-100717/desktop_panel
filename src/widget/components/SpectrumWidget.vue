<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref(null)
const status = ref('connecting')
let analyser = null
let rafId = null
let ctx = null
let audioCtx = null
let sourceNode = null
let streamTracks = null

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

const draw = () => {
    const canvas = canvasRef.value
    if (!canvas || !analyser || !audioCtx) return
    if (!ctx) ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    ctx.clearRect(0, 0, w, h)
    const barCount = 40
    const sampleRate = audioCtx.sampleRate || 48000
    const nyquist = sampleRate / 2
    const maxFreq = Math.min(10000, nyquist)
    const minFreq = 40
    const range = maxFreq - minFreq
    const bw = w / barCount
    for (let i = 0; i < barCount; i++) {
        const f0 = minFreq + (range * i) / barCount
        const f1 = minFreq + (range * (i + 1)) / barCount
        const b0 = Math.floor((f0 / nyquist) * data.length)
        const b1 = Math.min(data.length, Math.max(b0 + 1, Math.ceil((f1 / nyquist) * data.length)))
        let sum = 0
        for (let j = b0; j < b1; j++) sum += data[j]
        const v = ((sum / (b1 - b0)) / 255) * 0.75
        const bh = Math.max(2, Math.pow(v, 1.15) * h)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh)
    }
    rafId = requestAnimationFrame(draw)
}

onMounted(start)
onUnmounted(cleanup)
</script>

<template>
  <div class="spectrum">
    <canvas ref="canvasRef" width="280" height="70"></canvas>
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
