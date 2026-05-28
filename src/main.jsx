import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

window.addEventListener('error', (event) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.background = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.innerText = 'Global Error: ' + event.message + '\n' + event.filename + ':' + event.lineno;
  document.body.appendChild(errorDiv);
});

window.addEventListener('unhandledrejection', (event) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '100px';
  errorDiv.style.left = '0';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.background = 'orange';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.innerText = 'Unhandled Rejection: ' + event.reason;
  document.body.appendChild(errorDiv);
});

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

import { LanguageProvider } from './contexts/LanguageContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
