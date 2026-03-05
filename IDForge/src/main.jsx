import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import IDCardGenerator from './IDCardGenerator'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IDCardGenerator />
  </StrictMode>
)