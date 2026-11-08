import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from "./App";
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function RuntimeErrorFallback(props: { error: Error }) {
  return (
    <div className="fixed inset-0 grid place-items-center p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-xl">
        <h3 className="mb-3 font-semibold">MeAlpha Pro could not load this screen</h3>
        <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">{props.error.message}</pre>
        <button type="button" onClick={() => location.reload()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground">Reload</button>
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
