import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Users as UsersIcon, 
    ShieldAlert as ShieldIcon, 
    UserCog as CogIcon, 
    Trash2 as DeleteIcon, 
    CheckCircle2 as SuccessIcon, 
    AlertCircle as ErrorIcon,
    Search as SearchIcon,
    Filter as FilterIcon,
    UserPlus as AddIcon,
    Activity as ActivityIcon,
    SearchX as NoSearchIcon,
    CheckSquare as CheckedIcon,
    Square as UncheckedIcon,
    UserMinus as RemoveIcon,
    Lock as LockIcon,
    CalendarCheck as EventIcon,
    Settings as SettingsIcon,
    Save as SaveIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    console.log('SuperAdminDashboard: Rendering');
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [config, setConfig] = useState({ platform_fee: '2.00' });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });
    const [selectedUsers, setSelectedUsers] = useState([]);
    
    // Config Editing State
    const [editingFee, setEditingFee] = useState('2.00');
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

    const filteredUsers = (users || []).filter(user => {
        if (!user) return false;
        const matchesSearch = (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (user.username || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'All' || user.role_name === roleFilter;
        return matchesSearch && matchesRole;
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchUsers(),
                fetchStats(),
                fetchConfig()
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/platform/config`);
            if (res.data.success) {
                setConfig(res.data.config);
                setEditingFee(res.data.config.platform_fee);
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/super/platform-revenue`, { withCredentials: true });
            if (res.data.success) {
                setStats(res.data.summary);
            }
        } catch (error) {
            console.error('Failed to fetch platform stats:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/super/users`, { withCredentials: true });
            if (res.data.success) {
                setUsers(res.data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
            }
            showFlash('Failed to load users', 'error');
        }
    };

    const showFlash = (text, type) => {
        setFlashMessage({ text, type });
        setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
    };

    const updateConfig = async () => {
        setIsUpdatingConfig(true);
        try {
            const res = await axios.patch(`${import.meta.env.VITE_API_URL}/super/config`, 
                { platform_fee: editingFee }, 
                { withCredentials: true }
            );
            if (res.data.success) {
                showFlash('Platform fee updated successfully', 'success');
                fetchConfig();
            }
        } catch (error) {
            showFlash(error.response?.data?.message || 'Failed to update config', 'error');
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/super/users/${userId}/role`, 
                { roleName: newRole }, 
                { withCredentials: true }
            );
            if (res.data.success) {
                showFlash(`Role updated to ${newRole}`, 'success');
                fetchUsers();
            }
        } catch (error) {
            showFlash('Failed to update role', 'error');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            const res = await axios.delete(`${import.meta.env.VITE_API_URL}/super/users/${userId}`, { withCredentials: true });
            if (res.data.success) {
                showFlash('User deleted successfully', 'success');
                setSelectedUsers(prev => prev.filter(id => id !== userId));
                fetchUsers();
            }
        } catch (error) {
            showFlash('Failed to delete user', 'error');
        }
    };

    const handleBatchDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return;

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/super/users/batch-delete`, 
                { userIds: selectedUsers }, 
                { withCredentials: true }
            );
            if (res.data.success) {
                showFlash(res.data.message, 'success');
                setSelectedUsers([]);
                fetchUsers();
            }
        } catch (error) {
            showFlash('Batch delete failed', 'error');
        }
    };

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId) 
                : [...prev, userId]
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const selectableIds = filteredUsers
                .filter(u => u.role_name !== 'Super Admin')
                .map(u => u.id);
            setSelectedUsers(selectableIds);
        } else {
            setSelectedUsers([]);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#ffdd95]/20 border-t-[#ffdd95] rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-medium animate-pulse">Loading System Data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                                <ShieldIcon className="text-red-500" size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Super Admin Hub</h1>
                        </div>
                        <p className="text-zinc-400">Total System Control: Management of all roles, users, and platform integrity.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 shadow-xl hidden md:flex">
                            <div className="bg-zinc-800/80 p-3 rounded-xl border border-zinc-700">
                                <UsersIcon className="text-zinc-400" size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Active Entities</p>
                                <p className="text-xl font-black text-white">{(users || []).length} <span className="text-zinc-600 font-medium text-sm">Users</span></p>
                            </div>
                        </div>
                        <Link to="/super-admin/events" className="inline-flex items-center justify-center gap-2 bg-[#ffdd95]/10 hover:bg-[#ffdd95]/20 text-[#ffdd95] font-black px-6 py-4 rounded-2xl border border-[#ffdd95]/20 shadow-xl transition-all">
                            <EventIcon size={18} />
                            Event Management
                        </Link>
                    </div>
                </div>

                {/* Platform Configuration Section */}
                <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner border border-emerald-500/20">
                                <SettingsIcon size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight italic uppercase">System Configuration</h2>
                                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mt-0.5 font-mono">Platform Fee Control</p>
                            </div>
                        </div>
                        
                        <div className="flex-1 max-w-lg w-full">
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1 group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-xl italic group-focus-within/input:text-emerald-500 transition-colors">₱</div>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={editingFee}
                                        onChange={(e) => setEditingFee(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white font-black text-2xl tracking-tighter focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <button 
                                    onClick={updateConfig}
                                    disabled={isUpdatingConfig || editingFee === (config?.platform_fee || '2.00')}
                                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800/50 disabled:text-zinc-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-900/20 hover:shadow-emerald-900/40 transition-all flex items-center gap-2 shrink-0 border border-emerald-500/20 active:scale-95"
                                >
                                    {isUpdatingConfig ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <SaveIcon size={16} />
                                    )}
                                    Update Fee
                                </button>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Active Rate: <span className="text-zinc-300">₱{parseFloat(config?.platform_fee || 2.00).toFixed(2)}</span> per registration</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Flash Message (Floating Toast) */}
                {flashMessage.text && (
                    <div className={`fixed top-6 right-6 z-[100] p-4 rounded-2xl border flex items-center gap-3 animate-slideIn shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-xl ${
                        flashMessage.type === 'success' 
                            ? 'bg-green-950/90 border-green-500/30 text-green-400' 
                            : 'bg-red-950/90 border-red-500/30 text-red-400'
                    }`}>
                        {flashMessage.type === 'success' ? <SuccessIcon size={20} className="drop-shadow-md" /> : <ErrorIcon size={20} className="drop-shadow-md" />}
                        <span className="font-bold text-sm tracking-wide drop-shadow-sm">{flashMessage.text}</span>
                    </div>
                )}

                {/* Batch Action Bar */}
                {selectedUsers.length > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-8 z-50 animate-slideUp">
                        <div className="flex items-center gap-3 pr-8 border-r border-zinc-800">
                            <CheckedIcon className="text-[#ffdd95]" size={20} />
                            <span className="text-white font-bold text-sm tracking-tight">{selectedUsers.length} Users Selected</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleBatchDelete}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95"
                            >
                                <RemoveIcon size={14} />
                                Batch Delete
                            </button>
                            <button 
                                onClick={() => setSelectedUsers([])}
                                className="text-zinc-500 hover:text-white text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Organizers', count: (users || []).filter(u => u?.role_name === 'Admin').length, icon: CogIcon, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                        { label: 'Attendees', count: (users || []).filter(u => u?.role_name === 'User').length, icon: UsersIcon, color: 'text-green-400', bg: 'bg-green-400/10' },
                        { label: 'Platform Fees', count: '₱' + (stats?.total_platform_earnings || 0).toLocaleString(), icon: ActivityIcon, color: 'text-emerald-400', bg: 'bg-emerald-400/10', link: '/super-admin/payments' },
                        { label: 'Admins', count: (users || []).filter(u => u?.role_name === 'Super Admin').length, icon: ShieldIcon, color: 'text-[#ffdd95]', bg: 'bg-[#ffdd95]/10' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-zinc-900/40 border border-zinc-800/60 p-6 rounded-3xl hover:border-zinc-700 transition-all group relative">
                            {stat.link && <Link to={stat.link} className="absolute inset-0 z-10" />}
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                <ActivityIcon size={18} className="text-zinc-800 group-hover:text-zinc-600 transition-colors" />
                            </div>
                            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</h3>
                            <p className="text-3xl font-black text-white">{stat.count}</p>
                        </div>
                    ))}
                </div>

                {/* Management Table Area */}
                <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-sm">
                    {/* Controls Bar */}
                    <div className="p-6 border-b border-zinc-800/60 flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-900/50">
                        <div className="relative w-full sm:w-96 group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ffdd95] transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by name or username..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ffdd95]/30 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <FilterIcon className="text-zinc-500" size={18} />
                            <select 
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-2xl px-4 py-3 outline-none"
                            >
                                <option value="All">All Roles</option>
                                <option value="User">Attendees</option>
                                <option value="Admin">Organizers</option>
                                <option value="Super Admin">System Admins</option>
                            </select>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900/20 text-zinc-500 border-b border-zinc-800/60">
                                    <th className="px-6 py-4 w-12">
                                        <div className="flex items-center justify-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 cursor-pointer" 
                                                onChange={handleSelectAll}
                                                checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsers.filter(u => u.role_name !== 'Super Admin').length}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">User Details</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Status / Role</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right whitespace-nowrap">Management Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-zinc-800/10 transition-all group ${selectedUsers.includes(user.id) ? 'bg-[#ffdd95]/5' : ''}`}>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center">
                                                {user.role_name !== 'Super Admin' ? (
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 cursor-pointer" 
                                                        checked={selectedUsers.includes(user.id)}
                                                        onChange={() => toggleUserSelection(user.id)}
                                                    />
                                                ) : (
                                                    <LockIcon className="text-zinc-800" size={14} />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center group-hover:border-[#ffdd95]/30 shadow-lg">
                                                    {user.profile_image ? (
                                                        <img 
                                                            src={`${import.meta.env.VITE_API_URL}/uploads/${user.profile_image}`} 
                                                            alt={user.name} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <UsersIcon size={20} className="text-zinc-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm group-hover:text-[#ffdd95] transition-colors">{user.name}</p>
                                                    <p className="text-xs text-zinc-500 font-mono">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                    user.role_name === 'Super Admin' 
                                                        ? 'bg-[#ffdd95]/10 border-[#ffdd95]/20 text-[#ffdd95]' 
                                                        : user.role_name === 'Admin'
                                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                                }`}>
                                                    {user.role_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                {user.role_name !== 'Super Admin' && (
                                                    <>
                                                        <select 
                                                            onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                                            className="bg-zinc-800/50 border border-zinc-700 text-[10px] font-bold text-zinc-300 rounded-lg px-2 py-1.5 focus:border-[#ffdd95]/50 hover:bg-zinc-700 outline-none"
                                                            defaultValue=""
                                                        >
                                                            <option value="" disabled>Change Role</option>
                                                            <option value="User">Attendee</option>
                                                            <option value="Admin">Organizer</option>
                                                            <option value="Super Admin">System Admin</option>
                                                        </select>
                                                        <button 
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                                                            title="Delete User Account"
                                                        >
                                                            <DeleteIcon size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                {user.role_name === 'Super Admin' && (
                                                    <span className="text-[10px] font-bold text-zinc-800 italic border border-zinc-800/10 px-2 py-1 rounded-lg">Protected</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {filteredUsers.length === 0 && (
                        <div className="py-24 flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/10">
                            <NoSearchIcon size={48} className="mb-4 opacity-20" />
                            <p className="font-bold text-lg text-zinc-500">No matching users found</p>
                            <p className="text-sm text-zinc-700">Try adjusting your search or filters.</p>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="mt-8 pt-8 border-t border-zinc-900/50 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-900">
                        <ActivityIcon size={12} className="text-zinc-600 animate-pulse" />
                        <span className="text-[10px] text-zinc-700 uppercase tracking-widest font-black">System Infrastructure Monitoring Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
