import { ref } from 'vue'

const now = ref(new Date())

setInterval(() => {
  now.value = new Date()
}, 1000)

export function useClock() {
  return now
}