import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SavedPartsProvider } from './context/SavedPartsContext.jsx';
import './index.css';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(<StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SavedPartsProvider>
          <App />
        </SavedPartsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>);
