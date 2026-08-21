import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ThemeProvider from '@/components/ThemeProvider';
import { LanguageProvider } from '@/context/LanguageContext';
import { UiHintsProvider } from '@/context/UiHintsContext';
import { AuthProvider } from '@/context/AuthContext';
import App from '@/App.jsx';
import '@/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <LanguageProvider>
        <UiHintsProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </UiHintsProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
