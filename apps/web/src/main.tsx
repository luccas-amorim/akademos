import '@akademos/ui/styles.css';
import { I18nProvider } from '@lingui/react';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { i18n } from './i18n';
import { router } from './router';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root ausente em index.html');

createRoot(root).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nProvider>
  </StrictMode>,
);
