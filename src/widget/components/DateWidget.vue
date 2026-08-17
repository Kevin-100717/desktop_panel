<script setup>
import { computed } from 'vue'
import { useClock } from '../useClock'

const now = useClock()

const date = computed(() => {
  const y = now.value.getFullYear()
  const m = now.value.getMonth() + 1
  const d = now.value.getDate()
  return `${y}年${m}月${d}日`
})
</script>

<template>
  <div class="date">{{ date }}</div>
</template>

<style scoped>
.date {
  font-size: 28px;
  font-weight: 300;
  letter-spacing: 5px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
</style>