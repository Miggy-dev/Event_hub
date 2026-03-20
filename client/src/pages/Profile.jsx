import { useState, useEffect } from 'react';
import axios from 'axios';
import { User as UserIcon, Camera, Save, CheckCircle2, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        bio: ''
    });
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });

    // Password Reset State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [updatingPassword, setUpdatingPassword] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/get-session`, { withCredentials: true });
                if (res.data.session) {
                    const u = res.data.user;
                    setUser(u);
                    setFormData({
                        name: u.name || '',
                        bio: u.bio || ''
                    });
                    if (u.profile_image) {
                        setImagePreview(`${import.meta.env.VITE_API_URL}/uploads/${u.profile_image}`);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

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
        setSaving(true);
        setFlashMessage({ text: '', type: '' });

        const data = new FormData();
        data.append('name', formData.name);
        data.append('bio', formData.bio);
        if (profileImage) {
            data.append('profile_image', profileImage);
        }

        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/profile`, data, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                setFlashMessage({ text: 'Profile updated successfully!', type: 'success' });
                setUser(res.data.user);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
            console.error("Update failed", error);
            const detail = error.response?.data?.error ? `: ${error.response.data.error}` : '';
            setFlashMessage({ 
                text: `${error.response?.data?.message || 'Failed to update profile'}${detail}`, 
                type: 'error' 
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setFlashMessage({ text: 'New passwords do not match', type: 'error' });
            return;
        }

        setUpdatingPassword(true);
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/profile/password`, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, { withCredentials: true });

            if (res.data.success) {
                setFlashMessage({ text: 'Password updated successfully!', type: 'success' });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            console.error("Password update failed", error);
            setFlashMessage({ 
                text: error.response?.data?.message || 'Failed to update password', 
                type: 'error' 
            });
        } finally {
            setUpdatingPassword(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-zinc-500">Loading profile...</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="mb-8">
                <Link to={user?.roleName === 'Admin' ? '/admin' : '/dashboard'} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
            </div>

            <div className="space-y-8">
                {flashMessage.text && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fadeIn shadow-lg sticky top-20 z-30 ${
                        flashMessage.type === 'success' 
                            ? 'bg-green-950/40 border-green-500/50 text-green-400 backdrop-blur-md' 
                            : 'bg-red-950/40 border-red-500/50 text-red-400 backdrop-blur-md'
                    }`}>
                        {flashMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span className="font-medium text-sm">{flashMessage.text}</span>
                    </div>
                )}

                <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-zinc-800 bg-zinc-800/30">
                        <h1 className="text-2xl font-bold text-white">Manage Profile</h1>
                        <p className="text-zinc-400 text-sm mt-1">Update your personal information and how others see you.</p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Photo Upload Section */}
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-3xl bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center shadow-xl group-hover:border-[#ffdd95]/50 transition-all">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={48} className="text-zinc-600" />
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 bg-[#ffdd95] text-zinc-950 p-2 rounded-xl cursor-pointer shadow-lg hover:bg-white transition-colors">
                                        <Camera size={20} />
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                    </label>
                                </div>
                                <div className="text-center md:text-left">
                                    <h3 className="text-white font-bold mb-1">Your Profile Photo</h3>
                                    <p className="text-xs text-zinc-500">Pick a square image for best results. JPG or PNG allowed.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/50 transition-all"
                                        placeholder="Jane Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Username</label>
                                    <input 
                                        type="text" 
                                        value={user?.username || ''} 
                                        disabled 
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 cursor-not-allowed font-bold" 
                                    />
                                    <p className="text-[10px] text-zinc-600 mt-1.5 ml-1">Username cannot be changed.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">Biography</label>
                                <textarea 
                                    rows="4" 
                                    value={formData.bio}
                                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/50 transition-all resize-none"
                                    placeholder="Tell us a bit about yourself..."
                                ></textarea>
                                <p className="text-[11px] text-zinc-500 mt-2">Display this on your dashboard to let others know who you are.</p>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-white text-zinc-950 font-black px-8 py-3 rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 shadow-xl"
                                >
                                    <Save size={18} />
                                    {saving ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Password Reset Section */}
                <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Shield className="text-[#ffdd95]" size={20} /> Security Settings
                            </h2>
                            <p className="text-zinc-400 text-sm mt-1">Change your password to keep your account secure.</p>
                        </div>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handlePasswordUpdate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">Current Password</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/50 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">New Password</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/50 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/50 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-zinc-800">
                                <button 
                                    type="submit" 
                                    disabled={updatingPassword}
                                    className="flex items-center gap-2 bg-zinc-800 text-white font-bold px-8 py-3 rounded-2xl hover:bg-zinc-700 transition-all disabled:opacity-50 border border-zinc-700"
                                >
                                    <Save size={18} />
                                    {updatingPassword ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
