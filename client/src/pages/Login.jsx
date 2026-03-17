import { useState } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, {
        username,
        password
      }, { withCredentials: true });
      
      const userRole = response.data.user.roleName;
      if (userRole === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
      // Force reload to update Navbar state
      window.location.reload(); 
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 p-8">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-zinc-400">Sign in to manage your tickets or events.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-center">
              <p className="text-sm text-red-400 font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:bg-zinc-800 transition-all text-sm text-white placeholder-zinc-500"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:bg-zinc-800 transition-all text-sm text-white placeholder-zinc-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-zinc-950 font-bold py-3 rounded-xl hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-all text-sm shadow-lg"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-white font-semibold hover:text-zinc-300 transition-colors">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
