<script setup>
import { onMounted, ref } from 'vue'

const apiKey = ref('')
const position = ref('center')
const saved = ref(false)
const saving = ref(false)
const autostart = ref(false)
const comp = ref({ clock: true, date: true, week: true, weather: true, spectrum: true })
const components = [
    { key: 'clock', label: '时钟' },
    { key: 'date', label: '日期' },
    { key: 'week', label: '星期' },
    { key: 'weather', label: '天气' },
    { key: 'spectrum', label: '音频频谱' }
]

onMounted(async () => {
    const config = await window.api?.getConfig()
    apiKey.value = config?.apiKey || ''
    position.value = config?.position || 'center'
    autostart.value = await window.api?.getAutoStart() || false
    comp.value = { ...comp.value, ...(config?.components || {}) }
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
    autostart.value = await window.api?.setAutoStart(autostart.value)
    flashSaved()
}

const flashSaved = () => {
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
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
</style>
