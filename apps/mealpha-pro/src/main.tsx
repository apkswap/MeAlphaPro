import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from "./App";
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function RuntimeErrorFallback(props: { error: Error }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box', background: '#0b1224', color: '#f8fafc', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 620, border: '1px solid #334155', borderRadius: 20, background: '#111c32', padding: 28, boxSizing: 'border-box', boxShadow: '0 24px 80px #0008' }}>
        <div style={{ color: '#67e8f9', fontWeight: 800, letterSpacing: '.08em', marginBottom: 12 }}>MEALPHA PRO</div>
        <h3 style={{ margin: '0 0 12px', fontSize: 20 }}>MeAlpha Pro could not load this screen</h3>
        <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap', borderRadius: 12, background: '#07101f', color: '#fecaca', padding: 16, fontSize: 13 }}>{props.error.message}</pre>
        <button type="button" onClick={() => location.reload()} style={{ marginTop: 16, border: 0, borderRadius: 10, background: '#0ea5e9', color: '#06111f', padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>Reload application</button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fallbackRender={props => <RuntimeErrorFallback error={props.error} />}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
