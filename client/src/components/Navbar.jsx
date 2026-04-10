import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { User as UserIcon, ChevronDown, Settings, LogOut } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
            <Link to="/" className="flex items-center">
              <img src="/logo.svg" alt="EventHub" className="h-11 object-contain" />
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">Browse Events</Link>
            
            {user ? (
              <div className="flex items-center gap-4">
                {user.roleName === 'Super Admin' && (
                  <>
                    <Link to="/super-admin" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">Super Admin Hub</Link>
                    <Link to="/super-admin/payments" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">Platform Vault</Link>
                  </>
                )}
                {user.roleName === 'Admin' && (
                  <>
                    <Link to="/admin" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">Admin Panel</Link>
                    <Link to="/admin/financials" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">Financials</Link>
                  </>
                )}
                {user.roleName === 'User' && (
                  <Link to="/dashboard" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">My Tickets</Link>
                )}
                <div className="h-6 w-px bg-zinc-800 mx-1"></div>
                
                {/* Profile Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 bg-zinc-800/50 pl-1 pr-3 py-1 rounded-full border border-zinc-700/50 hover:border-zinc-500 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:border-[#ffdd95]/50 transition-colors">
                      {user.profile_image ? (
                        <img 
                          src={`${import.meta.env.VITE_API_URL}/uploads/${user.profile_image}`} 
                          alt={user.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon size={16} className="text-zinc-500" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-zinc-100 whitespace-nowrap group-hover:text-white">{user.name}</span>
                    <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsDropdownOpen(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-2 z-20 overflow-hidden animate-fadeIn">
                        <div className="px-4 py-3 border-b border-zinc-800 mb-1">
                          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Account</p>
                          <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        </div>
                        <Link 
                          to="/profile" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                          <Settings size={16} /> Manage Profile
                        </Link>
                        <div className="h-px bg-zinc-800 my-1"></div>
                        <button 
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-100 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                        >
                          <LogOut size={16} /> Log Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
