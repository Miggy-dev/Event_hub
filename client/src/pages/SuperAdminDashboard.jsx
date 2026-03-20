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
    Lock as LockIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SuperAdminDashboard() {
    console.log('SuperAdminDashboard: Rendering');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });
    const [selectedUsers, setSelectedUsers] = useState([]);

    const filteredUsers = (users || []).filter(user => {
        if (!user) return false;
        const matchesSearch = (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (user.username || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'All' || user.role_name === roleFilter;
        return matchesSearch && matchesRole;
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/super/users`, { withCredentials: true });
            if (res.data.success) {
                setUsers(res.data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            showFlash('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showFlash = (text, type) => {
        setFlashMessage({ text, type });
        setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
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
                    <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 shadow-xl">
                        <div className="bg-zinc-800/80 p-3 rounded-xl border border-zinc-700">
                            <UsersIcon className="text-zinc-400" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Active Entities</p>
                            <p className="text-xl font-black text-white">{(users || []).length} <span className="text-zinc-600 font-medium text-sm">Users</span></p>
                        </div>
                    </div>
                </div>

                {/* Flash Message */}
                {flashMessage.text && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 animate-slideIn shadow-2xl ${
                        flashMessage.type === 'success' 
                            ? 'bg-green-950/40 border-green-500/30 text-green-400' 
                            : 'bg-red-950/40 border-red-500/30 text-red-400'
                    }`}>
                        {flashMessage.type === 'success' ? <SuccessIcon size={18} /> : <ErrorIcon size={18} />}
                        <span className="font-semibold text-sm">{flashMessage.text}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Organizers', count: (users || []).filter(u => u?.role_name === 'Admin').length, icon: CogIcon, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                        { label: 'Attendees', count: (users || []).filter(u => u?.role_name === 'User').length, icon: UsersIcon, color: 'text-green-400', bg: 'bg-green-400/10' },
                        { label: 'Admins', count: (users || []).filter(u => u?.role_name === 'Super Admin').length, icon: ShieldIcon, color: 'text-[#ffdd95]', bg: 'bg-[#ffdd95]/10' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-zinc-900/40 border border-zinc-800/60 p-6 rounded-3xl hover:border-zinc-700 transition-all group">
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
