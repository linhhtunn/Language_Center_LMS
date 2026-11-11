import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import 'bootstrap/dist/css/bootstrap.min.css'; // Quan trọng
import 'animate.css';
import './index.css' // File CSS tùy chỉnh của bạn
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)