import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import { SavedPlacesProvider } from './context/SavedPlacesContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CurrencyProvider>
        <SavedPlacesProvider>
          <App />
        </SavedPlacesProvider>
      </CurrencyProvider>
    </AuthProvider>
  </React.StrictMode>
);
