<script setup>
import { onMounted, ref } from 'vue'
import ClockWidget from './components/ClockWidget.vue'
import DateWidget from './components/DateWidget.vue'
import WeekWidget from './components/WeekWidget.vue'
import WeatherWidget from './components/WeatherWidget.vue'
import SpectrumWidget from './components/SpectrumWidget.vue'
import PerfWidget from './components/PerfWidget.vue'

const comp = ref({ clock: true, date: true, week: true, weather: true, spectrum: true, perf: true })
const corner = ref(false)

onMounted(async () => {
    const config = await window.api?.getConfig()
    comp.value = { ...comp.value, ...(config?.components || {}) }
    corner.value = config?.position && config.position !== 'center'
})
</script>

<template>
  <div class="widget-page">
    <div class="stage" :class="{ corner }">
      <div v-if="comp.clock || comp.date || comp.week" class="time-block">
        <ClockWidget v-if="comp.clock" />
        <DateWidget v-if="comp.date" />
        <WeekWidget v-if="comp.week" />
      </div>
    <div v-if="comp.weather || comp.spectrum || comp.perf" class="bottom-row">
      <WeatherWidget v-if="comp.weather" />
      <SpectrumWidget v-if="comp.spectrum" />
      <PerfWidget v-if="comp.perf" />
    </div>
    </div>
  </div>
</template>

<style scoped>
.widget-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage {
  width: 800px;
  height: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;
  color: #fff;
  user-select: none;
}

.stage.corner {
  transform: scale(0.5);
}

.time-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.bottom-row {
  display: flex;
  align-items: center;
  gap: 64px;
}
</style>
