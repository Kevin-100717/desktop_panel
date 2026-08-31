<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const apiKey = ref('')
const position = ref('center')
const saved = ref(false)
const saving = ref(false)
const autostart = ref(false)
const spectrumStyle = ref('bars')
const comp = ref({ clock: true, date: true, week: true, weather: true, spectrum: true, perf: true })
const updateStatus = ref(null)
const checking = ref(false)
const components = [
    { key: 'clock', label: '时钟' },
    { key: 'date', label: '日期' },
    { key: 'week', label: '星期' },
    { key: 'weather', label: '天气' },
    { key: 'spectrum', label: '音频频谱' },
    { key: 'perf', label: 'CPU/内存' }
]

onMounted(async () => {
    const config = await window.api?.getConfig()
    apiKey.value = config?.apiKey || ''
    position.value = config?.position || 'center'
    autostart.value = await window.api?.getAutoStart() || false
    spectrumStyle.value = config?.spectrumStyle || 'bars'
    comp.value = { ...comp.value, ...(config?.components || {}) }
    window.api?.onUpdateStatus((status) => {
        updateStatus.value = status
        if (status.type !== 'checking' && status.type !== 'downloading') {
            checking.value = false
        }
    })
})

onUnmounted(() => {
    // cleanup listener handled by electron
})

const save = async () => {
    saving.value = true
    await window.api?.saveConfig({ apiKey: apiKey.value })
    flashSaved()
    saving.value = false
}

const toggleComp = async (key) => {
    comp.value[key] = !comp.value[key]
    await window.api?.saveConfig({ components: { ...comp.value } })
    flashSaved()
}

const onPositionChange = async () => {
    await window.api?.saveConfig({ position: position.value })
    flashSaved()
}

const toggleAutoStart = async () => {
    autostart.value = await window.api?.setAutoStart(!autostart.value)
    flashSaved()
}

const onSpectrumStyleChange = async () => {
    await window.api?.saveConfig({ spectrumStyle: spectrumStyle.value })
    flashSaved()
}

const flashSaved = () => {
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
}

const checkUpdate = () => {
    checking.value = true
    updateStatus.value = null
    window.api?.checkUpdate()
}

const installUpdate = () => {
    window.api?.installUpdate()
}
</script>

<template>
  <div class="settings">
    <h1>设置</h1>
    <div class="row">
      <label>天气 API Key</label>
      <input v-model="apiKey" @keyup.enter="save" placeholder="uapis.cn API Key（可选）" />
      <button @click="save" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button>
    </div>
    <p class="hint">保存后自动重启桌面小组件生效</p>
    <div class="row">
      <label>窗口位置</label>
      <select v-model="position" @change="onPositionChange">
        <option value="center">居中</option>
        <option value="top-left">左上</option>
        <option value="top-right">右上</option>
        <option value="bottom-left">左下</option>
        <option value="bottom-right">右下</option>
      </select>
      <span class="pos-hint">角落模式窗口 500×300，UI 等比缩放</span>
    </div>
    <div class="group">
      <h2>常规</h2>
      <div class="comp-row">
        <span class="comp-name">开机自启动</span>
        <button class="toggle" :class="{ on: autostart }" @click="toggleAutoStart"></button>
      </div>
    </div>
    <div class="group">
      <h2>更新</h2>
      <div class="comp-row">
        <button @click="checkUpdate" :disabled="checking">
          {{ checking ? '检查中…' : '检查更新' }}
        </button>
        <button v-if="updateStatus?.type === 'downloaded'" @click="installUpdate" class="primary">
          立即重启安装
        </button>
      </div>
      <div v-if="updateStatus" class="update-log">
        <p v-if="updateStatus.type === 'checking'" class="log-item">正在检查更新…</p>
        <p v-if="updateStatus.type === 'available'" class="log-item">
          发现新版本 v{{ updateStatus.version }}
          <span v-if="updateStatus.releaseDate" class="log-sub">
            ({{ new Date(updateStatus.releaseDate).toLocaleDateString() }})
          </span>
        </p>
        <p v-if="updateStatus.type === 'not-available'" class="log-item">已是最新版本</p>
        <p v-if="updateStatus.type === 'downloading'" class="log-item">
          正在下载… {{ updateStatus.percent }}%
          <span v-if="updateStatus.speed > 0" class="log-sub">{{ updateStatus.speed }} MB/s</span>
        </p>
        <p v-if="updateStatus.type === 'downloaded'" class="log-item ok">更新已下载，点击重启安装</p>
        <p v-if="updateStatus.type === 'error'" class="log-item err">{{ updateStatus.message }}</p>
        <p v-if="updateStatus.releaseNotes" class="log-notes">{{ updateStatus.releaseNotes }}</p>
      </div>
    </div>
    <div class="group">
      <h2>频谱</h2>
      <div class="comp-row">
        <span class="comp-name">频谱样式</span>
        <select v-model="spectrumStyle" @change="onSpectrumStyleChange">
          <option value="bars">基础柱条</option>
          <option value="mirror">音频条（上下扩展）</option>
          <option value="line">波形线</option>
          <option value="ring">圆环柱</option>
          <option value="dots">圆点环绕</option>
          <option value="pulse">脉冲同心圆</option>
          <!-- <option value="waterfall">瀑布流</option> -->
          <option value="stars">星际粒子</option>
          <option value="radar">雷达多边形</option>
          <option value="strings">琴弦震动</option>
        </select>
      </div>
    </div>
    <div class="group">
      <h2>组件</h2>
      <div class="comp-row" v-for="c in components" :key="c.key">
        <span class="comp-name">{{ c.label }}</span>
        <button class="toggle" :class="{ on: comp[c.key] }" @click="toggleComp(c.key)"></button>
      </div>
    </div>
    <p v-if="saved" class="ok">已保存，桌面小组件已刷新</p>
  </div>
</template>

<style scoped>
.settings {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 0 40px;
  box-sizing: border-box;
}

h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 400;
  color: #fff;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
}

label {
  font-size: 14px;
  color: #9ca3af;
  white-space: nowrap;
}

input {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  color: #fff;
  background: #1f2028;
  border: 1px solid #2e303a;
  border-radius: 6px;
  outline: none;
}

input:focus {
  border-color: #555;
}

button {
  padding: 8px 16px;
  font-size: 14px;
  color: #fff;
  background: #2e303a;
  border: 1px solid #4b4f5c;
  border-radius: 6px;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #3a3d49;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

select {
  padding: 8px 12px;
  font-size: 14px;
  color: #fff;
  background: #1f2028;
  border: 1px solid #2e303a;
  border-radius: 6px;
  outline: none;
}

.pos-hint {
  font-size: 12px;
  color: #6b7280;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  color: #9ca3af;
}

.comp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comp-name {
  font-size: 14px;
  color: #fff;
}

.toggle {
  position: relative;
  width: 40px;
  height: 22px;
  padding: 0;
  background: #2e303a;
  border: 1px solid #4b4f5c;
  border-radius: 11px;
  transition: background 0.2s;
}

.toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #9ca3af;
  transition: left 0.2s, background 0.2s;
}

.toggle.on {
  background: #22c55e;
  border-color: #22c55e;
}

.toggle.on::after {
  left: 20px;
  background: #fff;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

.ok {
  margin: 0;
  font-size: 12px;
  color: #4ade80;
}

.primary {
  background: #3b82f6;
  border-color: #3b82f6;
}

.primary:hover {
  background: #2563eb;
}

.update-log {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.log-item {
  margin: 0;
  font-size: 12px;
  color: #d1d5db;
}

.log-item.err {
  color: #f87171;
}

.log-item.ok {
  color: #4ade80;
}

.log-sub {
  color: #6b7280;
}

.log-notes {
  margin: 4px 0 0;
  font-size: 11px;
  color: #9ca3af;
  white-space: pre-wrap;
  max-height: 80px;
  overflow-y: auto;
}
</style>
