import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Lock, User, Key, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function SuperRegister() {
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        password: '',
        secretKey: ''
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ text: '', type: '' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ text: '', type: '' });

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/super-register`, formData);
            if (res.data.success) {
                setStatus({ text: 'Super Admin created successfully!', type: 'success' });
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (error) {
            setStatus({ 
                text: error.response?.data?.message || 'Failed to create Super Admin', 
                type: 'error' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="mb-8 text-center">
                    <div className="inline-flex p-3 bg-[#ffdd95]/10 rounded-2xl border border-[#ffdd95]/20 mb-4">
                        <ShieldCheck className="text-[#ffdd95]" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">System Initialization</h1>
                    <p className="text-zinc-500 text-sm mt-2">Authorized Personnel Only: Create Super Admin Account</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                    {/* Decorative Background */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ffdd95]/5 blur-[80px] rounded-full"></div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        {status.text && (
                            <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fadeIn ${
                                status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                                {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                <span className="text-sm font-medium">{status.text}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ffdd95] transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/20 focus:border-[#ffdd95]/50 transition-all"
                                    placeholder="System Administrator"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Username</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ffdd95] transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/20 focus:border-[#ffdd95]/50 transition-all font-mono"
                                    placeholder="root_admin"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">System Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ffdd95] transition-colors" size={18} />
                                <input 
                                    type="password" 
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/20 focus:border-[#ffdd95]/50 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-800">
                            <label className="block text-xs font-bold text-[#ffdd95] uppercase tracking-widest mb-2 ml-1 italic">Authorized Secret Key</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ffdd95] transition-colors" size={18} />
                                <input 
                                    type="password" 
                                    required
                                    value={formData.secretKey}
                                    onChange={(e) => setFormData({...formData, secretKey: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-[#ffdd95]/20 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/40 focus:border-[#ffdd95]/60 transition-all font-mono placeholder:text-zinc-800"
                                    placeholder="Enter backend secret..."
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-4 bg-[#ffdd95] hover:bg-white text-zinc-950 font-black rounded-2xl transition-all shadow-xl shadow-[#ffdd95]/5 flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <ShieldCheck size={20} className="group-hover:scale-110 transition-transform" />
                                    Initialize Super Account
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <Link to="/login" className="inline-flex items-center gap-2 text-zinc-600 hover:text-white transition-colors text-sm font-medium">
                        <ArrowLeft size={16} /> Return to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
