import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';

export default function App() {
  const location = useLocation();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="logo">
            <span className="logo-icon">◧</span>
            INE Price Tracker
          </Link>
          <nav className="nav-links">
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      </main>

      <footer className="app-footer">
        INE Price Tracker · Monitoring demo.inelabteamdev.com · Prices refresh every 2 hours
      </footer>
    </div>
  );
}
