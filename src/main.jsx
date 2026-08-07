import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ThemeProvider from '@/components/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import App from '@/App.jsx';
import '@/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
