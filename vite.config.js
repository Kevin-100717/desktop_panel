
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [vue()],
    base: './',
    manifest: true,
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    },
optimizeDeps: {
        exclude: ['electron'], // 告诉 Vite 排除预构建 electron，不然会出现 __diranme is not defined
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                widget: resolve(__dirname, 'widget.html')
            }
        }
    }
})

