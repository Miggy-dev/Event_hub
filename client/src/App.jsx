import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import { useState, useEffect } from 'react';
import axios from 'axios';
import OrganizerDebtBlock from './components/OrganizerDebtBlock.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const checkSession = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/get-session`, { withCredentials: true });
      if (res.data.session) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session check failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, [location.pathname]); // Re-check on navigation to ensure restriction is up to date

  const isRestrictedPath = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />
      <main className="flex-1">
        {user?.isRestricted && isRestrictedPath && (
          <OrganizerDebtBlock 
            totalOwed={user.totalOwed} 
            onSettle={() => {
              checkSession(); // Refresh session after settling
            }} 
          />
        )}
        <Outlet context={{ user, checkSession }} />
      </main>
      <footer className="bg-zinc-900 text-zinc-400 py-8 text-center text-sm border-t border-zinc-800">
        <p>© 2026 EventHub. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App;
