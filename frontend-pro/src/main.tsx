import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')

if (root) {
  try {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    console.error('Failed to render app:', error)
    root.innerHTML = `<div style="padding: 20px; color: red;">
      App failed to load: ${error instanceof Error ? error.message : 'Unknown error'}
    </div>`
  }
} else {
  console.error('Root element not found')
}
