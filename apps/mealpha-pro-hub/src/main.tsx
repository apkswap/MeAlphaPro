import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from 'react-error-boundary';
function Fallback({ error }: { error: Error }) { return <div className="p-8"><h2>MeAlpha Pro</h2><pre>{error.message}</pre><button onClick={() => location.reload()}>Reload</button></div>; }
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary fallbackRender={({ error }) => <Fallback error={error} />}><App /></ErrorBoundary></StrictMode>);
