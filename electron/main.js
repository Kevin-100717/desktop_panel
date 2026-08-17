const { app, BrowserWindow, Tray, Menu, screen, nativeImage, ipcMain, desktopCapturer, session } = require('electron')
const { join } = require('path')
const { readFileSync, writeFileSync } = require('fs')
const os = require('os')
const win32 = require('./win32')

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let settingsWin = null
let widgetWin = null
let tray = null
let ensureTimer = null
let weatherTimer = null
let weatherCache = null
let quitting = false

const env = app.isPackaged ? 'production' : 'development'
const urls = {
    development: 'http://localhost:5173',
    production: join(__dirname, '../dist/index.html')
}
const widgetUrls = {
    development: 'http://localhost:5173/widget.html',
    production: join(__dirname, '../dist/widget.html')
}
const configPath = join(app.getPath('userData'), 'config.json')

const defaultConfig = {
    apiKey: '',
    position: 'center',
    spectrumStyle: 'bars',
    components: { clock: true, date: true, week: true, weather: true, spectrum: true, perf: true }
}
let config = JSON.parse(JSON.stringify(defaultConfig))
try {
    const saved = JSON.parse(readFileSync(configPath, 'utf8')) || {}
    config = {
        ...defaultConfig,
        ...saved,
        components: { ...defaultConfig.components, ...(saved.components || {}) }
    }
} catch {}

let weatherPromise = null
const fetchWeather = () => {
    if (!weatherPromise) {
        weatherPromise = (async () => {
            try {
                const params = new URLSearchParams({ lang: 'zh' })
                if (config.apiKey) params.set('apikey', config.apiKey)
                const res = await fetch(`https://uapis.cn/api/v1/misc/weather?${params}`)
                const data = await res.json()
                if (data && data.city) {
                    weatherCache = data
                    if (widgetWin && !widgetWin.isDestroyed()) {
                        widgetWin.webContents.send('weather:update', data)
                    }
                }
            } catch {}
        })()
        weatherPromise.finally(() => {
            weatherPromise = null
        })
    }
    return weatherPromise
}

const applyWidgetPosition = () => {
    if (!widgetWin || widgetWin.isDestroyed()) return
    const pos = config.position || 'center'
    if (pos === 'center') {
        widgetWin.setBounds({ width: 800, height: 600 })
        widgetWin.center()
        return
    }
    const W = 500
    const H = 300
    widgetWin.setBounds({ width: W, height: H })
    const wa = screen.getDisplayMatching(widgetWin.getBounds()).workArea
    let x = wa.x
    let y = wa.y
    if (pos === 'top-right') x = wa.x + wa.width - W
    if (pos === 'bottom-right') {
        x = wa.x + wa.width - W
        y = wa.y + wa.height - H
    }
    if (pos === 'bottom-left') y = wa.y + wa.height - H
    widgetWin.setPosition(x, y)
}

const createSettingsWindow = () => {
    settingsWin = new BrowserWindow({
        width: 480,
        height: 420,
        show: false,
        webPreferences: {
            webSecurity: false,
            preload: join(__dirname, 'preload.js')
        }
    })
    settingsWin.loadURL(urls[env])
    settingsWin.webContents.setZoomFactor(1)
    settingsWin.on('close', (e) => {
        if (!quitting) {
            e.preventDefault()
            settingsWin.hide()
        }
    })
}

const createWidgetWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    widgetWin = new BrowserWindow({
        width: 800,
        height: 600,
        x: Math.round((width - 800) / 2),
        y: Math.round((height - 600) / 2),
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        show: true,
        webPreferences: {
            webSecurity: false,
            preload: join(__dirname, 'preload.js')
        }
    })
    widgetWin.loadURL(widgetUrls[env])
    widgetWin.webContents.setZoomFactor(1)
    let widgetReady = false
    const showWidget = () => {
        if (widgetReady) return
        widgetReady = true
        widgetWin.setIgnoreMouseEvents(true)
        win32.attachToWallpaper(widgetWin)
        applyWidgetPosition()
        win32.disableRoundedCorners(widgetWin)
        win32.registerOverlay(widgetWin)
        ensureTimer = setInterval(() => win32.ensureWallpaper(widgetWin), 5000)
        fetchWeather()
        weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000)
    }
    widgetWin.webContents.once('did-finish-load', showWidget)
    widgetWin.once('ready-to-show', showWidget)
    setTimeout(showWidget, 3000)
    widgetWin.on('minimize', () => widgetWin.restore())
}

const createTrayIcon = () => {
    const size = 32
    const buf = Buffer.alloc(size * size * 4)
    const c = size / 2
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const d = Math.hypot(x + 0.5 - c, y + 0.5 - c)
            const onRing = d >= 9.5 && d <= 13.5
            const onHour = Math.abs(x - c) <= 1.2 && y >= c - 6.5 && y <= c
            const onMin = Math.abs(y - c) <= 1.2 && x >= c && x <= c + 9
            if (onRing || onHour || onMin) {
                const i = (y * size + x) * 4
                buf[i] = 255
                buf[i + 1] = 255
                buf[i + 2] = 255
                buf[i + 3] = 255
            }
        }
    }
    return nativeImage.createFromBitmap(buf, { width: size, height: size })
}

const createTray = () => {
    tray = new Tray(createTrayIcon())
    tray.setToolTip('桌面小组件')
    const menu = Menu.buildFromTemplate([
        {
            label: '打开设置',
            click: () => settingsWin.show()
        },
        {
            label: '显示/隐藏桌面小组件',
            click: () => {
                if (widgetWin.isVisible()) widgetWin.hide()
                else widgetWin.show()
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                quitting = true
                app.quit()
            }
        }
    ])
    tray.setContextMenu(menu)
    tray.on('click', () => settingsWin.show())
}

ipcMain.handle('config:get', () => config)
ipcMain.handle('config:save', (_e, newConfig) => {
    config = { ...config, ...newConfig }
    try {
        writeFileSync(configPath, JSON.stringify(config, null, 2))
    } catch {}
    if (widgetWin && !widgetWin.isDestroyed()) {
        widgetWin.webContents.reload()
    }
    applyWidgetPosition()
    fetchWeather()
    return config
})
ipcMain.handle('weather:get', async () => {
    await fetchWeather()
    return weatherCache
})
ipcMain.handle('autostart:get', () => app.getLoginItemSettings().openAtLogin)
ipcMain.handle('autostart:set', (_e, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return app.getLoginItemSettings().openAtLogin
})

let prevCpu = null
const getCpuUsage = () => {
    const cpus = os.cpus()
    let idle = 0
    let total = 0
    for (const c of cpus) {
        idle += c.times.idle
        total += c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq
    }
    if (!prevCpu) {
        prevCpu = { idle, total }
        return 0
    }
    const dIdle = idle - prevCpu.idle
    const dTotal = total - prevCpu.total
    prevCpu = { idle, total }
    if (dTotal <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((1 - dIdle / dTotal) * 100)))
}
ipcMain.handle('stats:get', () => ({
    cpu: getCpuUsage(),
    mem: Math.round((1 - os.freemem() / os.totalmem()) * 100)
}))

app.whenReady().then(() => {
    session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] })
            .then((sources) => {
                if (sources[0]) callback({ video: sources[0], audio: 'loopback' })
                else callback({})
            })
            .catch(() => callback({}))
    })
    createSettingsWindow()
    createWidgetWindow()
    createTray()
    app.on('activate', () => {
        settingsWin.show()
    })
})
app.on('before-quit', () => {
    if (ensureTimer) clearInterval(ensureTimer)
    if (weatherTimer) clearInterval(weatherTimer)
    if (widgetWin) win32.unregisterOverlay(widgetWin)
})
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})