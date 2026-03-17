import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/get-session`, { withCredentials: true });
      if (res.data.session) {
        setUser(res.data.user);
      }
    } catch (error) {
      console.error('Session check failed', error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/logout`, {}, { withCredentials: true });
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
              <span className="text-3xl">🎫</span> EventHub
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">Browse Events</Link>
            
            {user ? (
              <div className="flex items-center gap-4">
                {user.roleName === 'Admin' && (
                  <Link to="/admin" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">Admin Panel</Link>
                )}
                {user.roleName === 'User' && (
                  <Link to="/dashboard" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">My Tickets</Link>
                )}
                <div className="h-6 w-px bg-zinc-800 mx-2"></div>
                <span className="text-sm font-medium text-zinc-300">Hi, {user.name}</span>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-red-400 bg-red-950/30 hover:bg-red-950/50 rounded-lg border border-red-900/50 transition-colors"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
                  Log in
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-all shadow-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </nav>
  );
}
