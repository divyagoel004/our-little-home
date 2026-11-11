import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { HomeProvider } from './hooks/HomeContext';
import { AppShell } from './components/AppShell';
import Welcome from './pages/Welcome';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Diary = lazy(() => import('./pages/Diary'));
const Feelings = lazy(() => import('./pages/Feelings'));
const FutureSelf = lazy(() => import('./pages/FutureSelf'));
const Memories = lazy(() => import('./pages/Memories'));

function Gate() {
  const { status } = useAuth();
  if (status === 'loading') return <div className="fullcenter"><p className="hand" style={{ fontSize: '2rem' }}>Opening the door…</p></div>;
  if (status !== 'ready') return <Navigate to="/" replace />;
  return (
    <HomeProvider>
      <AppShell />
    </HomeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Suspense fallback={<div className="fullcenter"><p className="hand" style={{ fontSize: '2rem' }}>Opening the door…</p></div>}>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route element={<Gate />}>
              <Route path="/home" element={<Dashboard />} />
              <Route path="/my-diary" element={<Diary whose="mine" />} />
              <Route path="/their-diary" element={<Diary whose="theirs" />} />
              <Route path="/feelings" element={<Feelings />} />
              <Route path="/future" element={<FutureSelf />} />
              <Route path="/memories" element={<Memories />} />
            </Route>
            {/* magic-link returns land on #access_token=… — send them home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthProvider>
  );
}
