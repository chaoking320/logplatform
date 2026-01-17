import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'  // ✅ 使用相对路径
import './index.css'  // ✅ 明确的相对路径

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
