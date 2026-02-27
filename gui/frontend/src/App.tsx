import { useAppStore } from './stores/appStore';
import { LandingPage } from './components/Landing/LandingPage';
import { AppShell } from './components/Layout/AppShell';
import './styles/shimmer.css';

export default function App() {
  const view = useAppStore((s) => s.view);

  return view === 'landing' ? <LandingPage /> : <AppShell />;
}
