import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LandingPage } from './landing/LandingPage';
import './styles/base.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container is missing from index.html.');

/**
 * Two entry points on one bundle: the landing page at "/" and the dashboard at
 * "/app" (its own screens continue to route in the hash, e.g. /app#/history).
 * The host rewrites every path to index.html — see vercel.json.
 */
const path = window.location.pathname.replace(/\/+$/, '');
const isDashboard = path === '/app' || path.startsWith('/app/');

createRoot(container).render(<StrictMode>{isDashboard ? <App /> : <LandingPage />}</StrictMode>);
