<script setup>
import { computed } from 'vue'
import { useClock } from '../useClock'

const now = useClock()

const week = computed(() => {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return days[now.value.getDay()]
})
</script>

<template>
  <div class="week">{{ week }}</div>
</template>

<style scoped>
.week {
  font-size: 22px;
  font-weight: 300;
  letter-spacing: 6px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
</style>