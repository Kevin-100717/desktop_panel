const koffi = require('koffi')

const user32 = koffi.load('user32.dll')
const dwmapi = koffi.load('dwmapi.dll')

const FindWindowW = user32.func('__stdcall', 'FindWindowW', 'void *', ['str16', 'str16'])
const FindWindowExW = user32.func('__stdcall', 'FindWindowExW', 'void *', ['void *', 'void *', 'str16', 'str16'])
const SendMessageTimeoutW = user32.func('__stdcall', 'SendMessageTimeoutW', 'intptr_t', ['void *', 'uint32', 'uintptr_t', 'intptr_t', 'uint32', 'uint32', 'void *'])
const EnumWindowsCallback = koffi.proto('__stdcall', 'EnumWindowsCallback', 'int32', ['void *', 'intptr_t'])
const EnumWindows = user32.func('__stdcall', 'EnumWindows', 'int32', [koffi.pointer(EnumWindowsCallback), 'intptr_t'])
const SetParent = user32.func('__stdcall', 'SetParent', 'void *', ['void *', 'void *'])
const GetParent = user32.func('__stdcall', 'GetParent', 'void *', ['void *'])
const ShowWindow = user32.func('__stdcall', 'ShowWindow', 'int32', ['void *', 'int32'])
const SetWindowLongPtrW = user32.func('__stdcall', 'SetWindowLongPtrW', 'intptr_t', ['void *', 'int32', 'intptr_t'])
const GetWindowLongPtrW = user32.func('__stdcall', 'GetWindowLongPtrW', 'intptr_t', ['void *', 'int32'])
const SetWindowPos = user32.func('__stdcall', 'SetWindowPos', 'int32', ['void *', 'void *', 'int32', 'int32', 'int32', 'int32', 'uint32'])
const GetForegroundWindow = user32.func('__stdcall', 'GetForegroundWindow', 'void *', [])
const GetClassNameW = user32.func('__stdcall', 'GetClassNameW', 'int32', ['void *', 'char16_t *', 'int32'])
const IsIconic = user32.func('__stdcall', 'IsIconic', 'int32', ['void *'])
const IsWindowVisible = user32.func('__stdcall', 'IsWindowVisible', 'int32', ['void *'])
const WinEventProc = koffi.proto('__stdcall', 'WinEventProc', 'void', ['void *', 'uint32', 'void *', 'int32', 'int32', 'uint32', 'uint32'])
const SetWinEventHook = user32.func('__stdcall', 'SetWinEventHook', 'void *', ['uint32', 'uint32', 'void *', koffi.pointer(WinEventProc), 'uint32', 'uint32', 'uint32'])
const UnhookWinEvent = user32.func('__stdcall', 'UnhookWinEvent', 'int32', ['void *'])
const DwmSetWindowAttribute = dwmapi.func('int __stdcall DwmSetWindowAttribute(void *hwnd, uint32_t dwAttribute, void *pvAttribute, uint32_t cbAttribute)')

const SMTO_NORMAL = 0x0000
const GWL_STYLE = -16
const GWL_EXSTYLE = -20
const WS_CHILD = 0x40000000
const WS_POPUP = 0x80000000
const WS_VISIBLE = 0x10000000
const WS_CLIPSIBLINGS = 0x04000000
const WS_EX_TOOLWINDOW = 0x00000080
const WS_EX_NOACTIVATE = 0x08000000
const WS_EX_APPWINDOW = 0x00040000
const SW_SHOWNOACTIVATE = 4
const SW_RESTORE = 9
const HWND_BOTTOM = 1
const SWP_NOMOVE = 0x0002
const SWP_NOSIZE = 0x0001
const SWP_NOACTIVATE = 0x0010
const SWP_NOSENDCHANGING = 0x0400
const SWP_SHOWWINDOW = 0x0040
const EVENT_SYSTEM_FOREGROUND = 0x0003
const WINEVENT_OUTOFCONTEXT = 0x0000
const DWMWA_WINDOW_CORNER_PREFERENCE = 33
const DWMWCP_DONOTROUND = 1

const hwndOf = (win) => {
    const buf = win.getNativeWindowHandle()
    return buf.length >= 8 ? Number(buf.readBigUInt64LE(0)) : buf.readUInt32LE(0)
}

const findWorkerW = () => {
    const progman = FindWindowW('Progman', null)
    if (!progman) return null
    SendMessageTimeoutW(progman, 0x052C, 0xD, 0x1, SMTO_NORMAL, 1000, Buffer.alloc(8))
    let shellViewParent = null
    const cb = koffi.register((hwnd) => {
        if (FindWindowExW(hwnd, null, 'SHELLDLL_DefView', null)) {
            shellViewParent = hwnd
            return 0
        }
        return 1
    }, koffi.pointer(EnumWindowsCallback))
    EnumWindows(cb, 0)
    koffi.unregister(cb)
    if (!shellViewParent) return null
    return FindWindowExW(null, shellViewParent, 'WorkerW', null)
}

function attachToWallpaper(win) {
    if (win.isDestroyed()) return false
    const hwnd = hwndOf(win)
    const exStyle = Number(GetWindowLongPtrW(hwnd, GWL_EXSTYLE))
    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, (exStyle | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE) & ~WS_EX_APPWINDOW)

    const workerW = findWorkerW()
    if (!workerW) {
        pushToBottom(win)
        ShowWindow(hwnd, SW_SHOWNOACTIVATE)
        return false
    }
    const style = Number(GetWindowLongPtrW(hwnd, GWL_STYLE))
    SetWindowLongPtrW(hwnd, GWL_STYLE, (style & ~WS_POPUP) | WS_CHILD)
    SetParent(hwnd, workerW)
    ShowWindow(hwnd, SW_SHOWNOACTIVATE)
    return true
}

function ensureWallpaper(win) {
    if (win.isDestroyed()) return false
    const hwnd = hwndOf(win)
    const workerW = findWorkerW()
    if (workerW && GetParent(hwnd) !== workerW) {
        return attachToWallpaper(win)
    }
    if (!workerW) {
        pushToBottom(win)
        return false
    }
    return true
}

function pushToBottom(win) {
    if (win.isDestroyed()) return
    const hwnd = hwndOf(win)
    const style = Number(GetWindowLongPtrW(hwnd, GWL_STYLE))
    SetWindowLongPtrW(hwnd, GWL_STYLE, (style & ~WS_CHILD) | WS_POPUP | WS_VISIBLE | WS_CLIPSIBLINGS)
    SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOSENDCHANGING)
}

function disableRoundedCorners(win) {
    if (win.isDestroyed()) return 0
    const value = Buffer.alloc(4)
    value.writeInt32LE(DWMWCP_DONOTROUND)
    return DwmSetWindowAttribute(hwndOf(win), DWMWA_WINDOW_CORNER_PREFERENCE, value, 4)
}

const overlays = new Set()
let watchHook = null
let watchCallback = null

const isDesktopForeground = () => {
    const fg = GetForegroundWindow()
    if (!fg) return false
    const buf = Buffer.alloc(512)
    const len = GetClassNameW(fg, buf, 256)
    if (len <= 0) return false
    const className = buf.toString('utf16le', 0, len * 2)
    return className === 'Progman' || className === 'WorkerW'
}

function registerOverlay(win) {
    if (win.isDestroyed()) return
    overlays.add(win)
    if (!watchHook) {
        watchCallback = koffi.register((_hook, _event, _hwnd, _idObj, _idChild, _tid, _time) => {
            if (isDesktopForeground()) {
                setTimeout(() => {
                    for (const w of overlays) {
                        try {
                            const h = hwndOf(w)
                            if (IsIconic(h)) ShowWindow(h, SW_RESTORE)
                            if (!IsWindowVisible(h)) ShowWindow(h, SW_SHOWNOACTIVATE)
                            ensureWallpaper(w)
                        } catch {}
                    }
                }, 200)
            }
        }, koffi.pointer(WinEventProc))
        watchHook = SetWinEventHook(EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND, null, watchCallback, 0, 0, WINEVENT_OUTOFCONTEXT)
    }
}

function unregisterOverlay(win) {
    overlays.delete(win)
    if (!overlays.size && watchHook) {
        UnhookWinEvent(watchHook)
        koffi.unregister(watchCallback)
        watchHook = null
        watchCallback = null
    }
}

module.exports = { attachToWallpaper, ensureWallpaper, pushToBottom, disableRoundedCorners, registerOverlay, unregisterOverlay }