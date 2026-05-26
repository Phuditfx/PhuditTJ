import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// ลงทะเบียน Service Worker และตั้งค่าให้อัปเดตอัตโนมัติ
const updateSW = registerSW({
  onNeedRefresh() {
    // เมื่อมีเวอร์ชันใหม่ ให้อัปเดตและรีโหลดหน้าจอทันที
    updateSW(true)
  },
  onOfflineReady() {
    console.log('App is ready to work offline')
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
