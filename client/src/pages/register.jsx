import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    roleName: 'User' // Default standard role
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/register`, formData);
      navigate('/login');
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 p-8">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Create an Account</h1>
          <p className="text-zinc-400">Join EventHub to start booking tickets.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-center">
              <p className="text-sm text-red-400 font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:bg-zinc-800 transition-all text-sm text-white placeholder-zinc-500"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Username</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:bg-zinc-800 transition-all text-sm text-white placeholder-zinc-500"
              placeholder="jane.doe99"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:bg-zinc-800 transition-all text-sm text-white placeholder-zinc-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Account Type</label>
            <select
                value={formData.roleName}
                onChange={(e) => setFormData({...formData, roleName: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-600 text-white"
            >
                <option value="User" className="bg-zinc-900">Attendee (Book Tickets)</option>
                <option value="Admin" className="bg-zinc-900">Organizer (Create Events)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-zinc-950 font-bold py-3 rounded-xl hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-all text-sm shadow-lg mt-2"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-white font-semibold hover:text-zinc-300 transition-colors">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}