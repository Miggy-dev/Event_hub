import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, Mail, Phone, User as UserIcon, Lock, BookOpen } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    emailAddress: '',
    phoneNumber: '',
    password: '',
    roleName: 'User',
    bio: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const data = new FormData();
    data.append('username', formData.username);
    data.append('emailAddress', formData.emailAddress);
    data.append('phoneNumber', formData.phoneNumber);
    data.append('name', formData.name);
    data.append('password', formData.password);
    data.append('roleName', formData.roleName);
    data.append('bio', formData.bio);
    if (profileImage) {
      data.append('profile_image', profileImage);
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/register`, data);
      navigate('/login');
    } catch (error) {
      console.error("Registration full error:", error);
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
            <Sparkles className="text-[#ffdd95]" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Create an Account</h1>
          <p className="text-zinc-400">Stop scrolling, start living. Join EventHub!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-center">
              <p className="text-sm text-red-400 font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Profile Photo (Optional)</label>
            <div className="flex items-center gap-4 bg-zinc-800 p-4 rounded-xl border border-zinc-700 border-dashed hover:border-zinc-500 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-16 h-16 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center border border-zinc-600 flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles size={24} className="text-zinc-500" />
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Choose File</p>
                <p className="text-[10px] text-zinc-500 mt-1">Recommended: Square PNG/JPG</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5 font-semibold">Full Name</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#ffdd95] transition-colors">
                <UserIcon size={18} />
              </div>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/20 focus:border-[#ffdd95]/50 focus:bg-zinc-800/50 transition-all text-sm text-white placeholder-zinc-600"
                placeholder="Jane Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5 font-semibold">Username</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#ffdd95] transition-colors">
                  <UserIcon size={16} />
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/20 focus:border-[#ffdd95]/50 focus:bg-zinc-800/50 transition-all text-sm text-white placeholder-zinc-600"
                  placeholder="jane.doe99"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5 font-semibold">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#ffdd95] transition-colors">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  name="emailAddress"
                  required
                  value={formData.emailAddress}
                  onChange={(e) => setFormData({...formData, emailAddress: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/20 focus:border-[#ffdd95]/50 focus:bg-zinc-800/50 transition-all text-sm text-white placeholder-zinc-600"
                  placeholder="jane@example.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5 font-semibold">Phone Number</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#ffdd95] transition-colors">
                <Phone size={18} />
              </div>
              <input
                type="tel"
                name="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/20 focus:border-[#ffdd95]/50 focus:bg-zinc-800/50 transition-all text-sm text-white placeholder-zinc-600"
                placeholder="+63 9xx xxxx xxx"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5 font-semibold">Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#ffdd95] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/20 focus:border-[#ffdd95]/50 focus:bg-zinc-800/50 transition-all text-sm text-white placeholder-zinc-600"
                placeholder="••••••••"
              />
            </div>
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

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Bio (Optional)</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-all text-sm text-white placeholder-zinc-500 resize-none h-24"
              placeholder="Tell us a bit about yourself..."
            />
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