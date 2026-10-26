import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { SavedPartsProvider } from './auth/SavedPartsContext.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SavedPartsProvider>
          <App />
        </SavedPartsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
