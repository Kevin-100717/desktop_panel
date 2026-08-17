<script setup>
import { onMounted, ref } from 'vue'

const weather = ref(null)

onMounted(async () => {
    weather.value = await window.api?.getWeather()
    window.api?.onWeather((data) => {
        weather.value = data
    })
})
</script>

<template>
  <div class="weather">
    <template v-if="weather">
      <div class="city">{{ weather.city }}</div>
      <div class="temp">{{ Math.round(weather.temperature) }}°C</div>
      <div class="desc">{{ weather.weather }} · {{ weather.humidity }}%</div>
    </template>
    <div v-else class="empty">天气未配置</div>
  </div>
</template>

<style scoped>
.weather {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 200px;
}

.city {
  font-size: 18px;
  font-weight: 300;
  letter-spacing: 4px;
}

.temp {
  font-size: 40px;
  font-weight: 200;
  line-height: 1;
}

.desc {
  font-size: 15px;
  font-weight: 300;
  letter-spacing: 2px;
  opacity: 0.85;
}

.empty {
  font-size: 15px;
  font-weight: 300;
  letter-spacing: 2px;
  opacity: 0.5;
}
</style>