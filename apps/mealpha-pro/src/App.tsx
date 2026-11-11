import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DropboxOAuthHandler from './components/DropboxOAuthHandler';
import { Toaster } from '@project/components/ui/sonner';
import { StoreProvider, useStore } from './lib/store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Focus from './pages/Focus';
import Transactions from './pages/Transactions';
import Wealth from './pages/Wealth';
import Insights from './pages/Insights';
import SettingsPage from './pages/Settings';
import Workspace from './pages/Workspace';

function Splash() {
  return <div className="min-h-screen grid place-items-center"><div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center font-black text-white text-xl animate-pulse">α</div></div>;
}
function Shell() {
  const { data } = useStore();
  if (!data) return <Splash />;
  return <BrowserRouter basename={window.location.pathname.startsWith("/MeAlphaPro/preview") ? "/MeAlphaPro/preview" : undefined}><Routes><Route element={<Layout />}>
    <Route path="/" element={<Dashboard />} /><Route path="/goals" element={<Goals />} />
    <Route path="/tasks" element={<Tasks />} /><Route path="/habits" element={<Habits />} />
    <Route path="/focus" element={<Focus />} /><Route path="/transactions" element={<Transactions />} />
    <Route path="/wealth" element={<Wealth />} /><Route path="/insights" element={<Insights />} />
    <Route path="/settings" element={<SettingsPage />} /><Route path="/workspace" element={<Workspace />} /><Route path="*" element={<Dashboard />} />
  </Route></Routes></BrowserRouter>;
}
export default function App() {
  return <StoreProvider><DropboxOAuthHandler /><Shell /><Toaster /></StoreProvider>;
}
