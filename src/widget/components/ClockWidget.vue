<script setup>
import { computed } from 'vue'
import { useClock } from '../useClock'

const now = useClock()

const time = computed(() => {
  const h = String(now.value.getHours()).padStart(2, '0')
  const m = String(now.value.getMinutes()).padStart(2, '0')
  const s = String(now.value.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
})
</script>

<template>
  <div class="clock">{{ time }}</div>
</template>

<style scoped>
.clock {
  font-size: 100px;
  font-weight: 200;
  line-height: 1;
  letter-spacing: 4px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}
</style>