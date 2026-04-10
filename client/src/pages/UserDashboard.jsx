import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Ticket, MapPin, Archive, Trash2, CheckCircle2, AlertCircle, User as UserIcon, Copy } from 'lucide-react';

export default function UserDashboard() {
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [selectedIds, setSelectedIds] = useState([]);
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [regRes, sessionRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/my-registrations`, { withCredentials: true }),
                    axios.get(`${import.meta.env.VITE_API_URL}/get-session`, { withCredentials: true })
                ]);

                if (regRes.data.success) {
                    setRegistrations(regRes.data.registrations);
                }
                if (sessionRes.data.session) {
                    setUser(sessionRes.data.user);
                } else {
                    navigate('/login');
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData(); 
    }, []);

    const handleUnregister = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this ticket? This action cannot be undone.")) return;
        try {
            const res = await axios.delete(`${import.meta.env.VITE_API_URL}/registrations/${id}`, { withCredentials: true });
            if (res.data.success) {
                setRegistrations(prev => prev.filter(r => r.id !== id));
                setSelectedIds(prev => prev.filter(sid => sid !== id));
                setFlashMessage({ text: 'Ticket cancelled successfully.', type: 'success' });
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 4000);
            }
        } catch (error) {
            console.error("Failed to cancel ticket", error);
            const errMsg = error.response?.data?.message || 'Error cancelling ticket';
            alert(errMsg);
        }
    };

    const handleArchive = async (idsToArchive) => {
        const count = Array.isArray(idsToArchive) ? idsToArchive.length : 1;
        if (!window.confirm(`Are you sure you want to move ${count} ticket(s) to the archive?`)) return;
        
        const ids = Array.isArray(idsToArchive) ? idsToArchive : [idsToArchive];
        
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/registrations/archive`, { ids }, { withCredentials: true });
            if (res.data.success) {
                setRegistrations(prev => prev.filter(r => !ids.includes(r.id)));
                setSelectedIds(prev => prev.filter(sid => !ids.includes(sid)));
                setFlashMessage({ text: `${ids.length} ticket(s) moved to archive.`, type: 'success' });
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 4000);
            }
        } catch (error) {
            console.error("Failed to archive tickets", error);
            alert("Error archiving tickets. Please try again.");
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const upcomingRegs = registrations.filter(r => !isEventEnded(r.event_date));
        if (selectedIds.length === upcomingRegs.length && upcomingRegs.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(upcomingRegs.map(r => r.id));
        }
    };

    const copyRegistrationId = (regId) => {
        navigator.clipboard.writeText(regId);
        setCopiedId(regId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase();
        if (s === 'completed' || s === 'confirmed') return 'bg-green-500/10 text-green-400 border-green-500/20';
        if (s === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        if (s === 'cancelled') return 'bg-red-500/10 text-red-400 border-red-500/20';
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    };

    const isEventEnded = (eventDate) => {
        return new Date(eventDate) < new Date();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32">
            
            {/* Header / Profile Card */}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 mb-10 overflow-hidden relative group">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffdd95]/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-[#ffdd95]/10 transition-colors duration-500"></div>
                
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                    {/* Profile Photo */}
                    <div className="w-32 h-32 rounded-3xl bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xl group-hover:border-[#ffdd95]/30 transition-colors duration-300">
                        {user?.profile_image ? (
                            <img 
                                src={`${import.meta.env.VITE_API_URL}/uploads/${user.profile_image}`} 
                                alt={user.name} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <UserIcon size={48} className="text-zinc-600 opacity-50" />
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
                            <h1 className="text-3xl font-black text-white">{user?.name || 'My Dashboard'}</h1>
                            <span className="inline-flex items-center px-3 py-1 bg-[#ffdd95]/10 text-[#ffdd95] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#ffdd95]/20 self-center md:self-auto">
                                {user?.roleName || 'User'}
                            </span>
                        </div>
                        
                        <div className="max-w-2xl">
                            <p className="text-zinc-400 leading-relaxed italic text-sm sm:text-base">
                                {user?.bio || 'You haven\'t added a bio yet. Share something about yourself!'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Flash Message (Floating Toast) */}
            {flashMessage.text && (
                <div className={`fixed top-6 right-6 z-[100] p-4 rounded-2xl border flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-xl animate-fadeIn ${
                    flashMessage.type === 'success' 
                        ? 'bg-green-950/90 border-green-500/30 text-green-400' 
                        : 'bg-red-950/90 border-red-500/30 text-red-400'
                }`}>
                    {flashMessage.type === 'success' ? <CheckCircle2 size={20} className="drop-shadow-md" /> : <AlertCircle size={20} className="drop-shadow-md" />}
                    <span className="font-bold text-sm tracking-wide drop-shadow-sm">{flashMessage.text}</span>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Total Tickets</p>
                    <p className="text-2xl font-bold text-white">{loading ? '—' : registrations.length}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Upcoming</p>
                    <p className="text-2xl font-bold text-white">
                        {loading ? '—' : registrations.filter(r => new Date(r.event_date) >= new Date()).length}
                    </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 hidden sm:block">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Archive Size</p>
                    <p className="text-2xl font-bold text-white">
                        <Link to="/archive" className="hover:text-zinc-300 transition-colors flex items-center gap-2">
                            <Archive size={20} /> View
                        </Link>
                    </p>
                </div>
            </div>

            {/* Tickets Section */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden relative">
                {/* Section Header */}
                <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-[#ffdd95] focus:ring-[#ffdd95] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                checked={registrations.length > 0 && selectedIds.length === registrations.filter(r => !isEventEnded(r.event_date)).length && registrations.some(r => !isEventEnded(r.event_date))}
                                onChange={toggleSelectAll}
                                disabled={registrations.every(r => isEventEnded(r.event_date))}
                            />
                            <span className="text-sm font-semibold text-white">
                                {selectedIds.length > 0 ? `${selectedIds.length} Selected` : 'My Upcoming Tickets'}
                            </span>
                        </label>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {selectedIds.length > 0 ? (
                            <button 
                                onClick={() => handleArchive(selectedIds)}
                                className="bg-[#ffdd95]/10 hover:bg-[#ffdd95]/20 text-[#ffdd95] text-xs font-bold px-4 py-2 rounded-lg border border-[#ffdd95]/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ffdd95]/10"
                                disabled={selectedIds.some(id => isEventEnded(registrations.find(r => r.id === id)?.event_date))}
                            >
                                <Archive size={14} /> Archive Selected
                            </button>
                        ) : (
                            <Link to="/archive" className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5">
                                <Archive size={14} /> View Archive
                            </Link>
                        )}
                        {!loading && registrations.length > 0 && selectedIds.length === 0 && (
                            <span className="text-xs text-zinc-500 font-medium hidden sm:inline">| {registrations.length} total</span>
                        )}
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="space-y-3">
                            {[1,2,3].map(n => (
                                <div key={n} className="h-20 bg-zinc-800/50 animate-pulse rounded-xl"></div>
                            ))}
                        </div>
                    ) : registrations.length > 0 ? (
                        <div className="space-y-3">
                            {registrations.map(reg => {
                                const eventDate = new Date(reg.event_date);
                                const isSelected = selectedIds.includes(reg.id);
                                
                                return (
                                    <div
                                        key={reg.id}
                                        className={`group relative flex items-center gap-4 bg-zinc-800 border ${isSelected ? 'border-[#ffdd95]/40 bg-zinc-800/80 shadow-[0_0_15px_rgba(255,221,149,0.05)]' : 'border-zinc-700/50'} rounded-xl p-4 sm:p-5 hover:border-zinc-600 transition-all`}
                                    >
                                        {/* Checkbox Trigger */}
                                        <div 
                                            onClick={() => !isEventEnded(reg.event_date) && toggleSelect(reg.id)}
                                            className={isEventEnded(reg.event_date) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                        >
                                            <input 
                                                type="checkbox" 
                                                readOnly
                                                checked={isSelected}
                                                disabled={isEventEnded(reg.event_date)}
                                                className="w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-[#ffdd95] focus:ring-[#ffdd95] pointer-events-none disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Main Content (Clickable to view details) */}
                                        <Link
                                            to={`/event/${reg.event_id}`}
                                            className="flex-1 flex items-center gap-4 sm:gap-5 min-w-0"
                                        >
                                            {/* Date Block */}
                                            <div className="flex-shrink-0 w-14 h-14 bg-zinc-900 border border-zinc-700 rounded-lg flex flex-col items-center justify-center">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none">
                                                    {eventDate.toLocaleDateString(undefined, { month: 'short' })}
                                                </span>
                                                <span className="text-xl font-bold text-white leading-none mt-0.5">
                                                    {eventDate.getDate()}
                                                </span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-white text-sm sm:text-base truncate group-hover:text-zinc-200 transition-colors">
                                                        {reg.event_title}
                                                    </h3>
                                                </div>
                                                
                                                {/* Registration ID */}
                                                <div className="flex items-center gap-2 mb-2 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-700/50 w-fit">
                                                    <span className="text-[11px] font-mono text-zinc-400">
                                                        Ticket ID: <span className="text-zinc-300 font-semibold">{reg.id.split('-')[0]}...</span>
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            copyRegistrationId(reg.id);
                                                        }}
                                                        className="p-0.5 hover:bg-zinc-800 rounded transition-colors"
                                                        title="Copy full Registration ID"
                                                    >
                                                        <Copy size={12} className={copiedId === reg.id ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'} />
                                                    </button>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 text-xs text-zinc-400">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} /> {reg.location}
                                                    </span>
                                                    <span className="hidden sm:inline text-zinc-600">•</span>
                                                    <span className="hidden sm:flex items-center gap-1">
                                                        <Ticket size={12} /> {reg.quantity}x {reg.ticket_name}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border hidden md:inline-block ${getStatusStyle(reg.payment_status)}`}>
                                                {reg.payment_status}
                                            </span>
                                            
                                            <div className="flex items-center bg-zinc-900/50 rounded-lg p-1 border border-zinc-700/50">
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); handleArchive(reg.id); }}
                                                    disabled={isEventEnded(reg.event_date)}
                                                    className={`p-1.5 rounded transition-colors ${
                                                        isEventEnded(reg.event_date)
                                                            ? 'text-zinc-600 bg-zinc-900/30 cursor-not-allowed'
                                                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                                    }`}
                                                    title={isEventEnded(reg.event_date) ? "Cannot archive past events" : "Archive"}
                                                >
                                                    <Archive size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); handleUnregister(reg.id); }}
                                                    disabled={isEventEnded(reg.event_date)}
                                                    className={`p-1.5 rounded transition-colors ${
                                                        isEventEnded(reg.event_date)
                                                            ? 'text-zinc-600 bg-zinc-900/30 cursor-not-allowed'
                                                            : 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800'
                                                    }`}
                                                    title={isEventEnded(reg.event_date) ? "Cannot cancel past events" : "Cancel Ticket"}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="flex justify-center mb-4">
                                <Ticket size={48} className="text-zinc-700 opacity-40" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No tickets yet</h3>
                            <p className="text-zinc-500 mb-6 max-w-sm mx-auto text-sm">
                                You haven't registered for any events yet. Browse events to get started.
                            </p>
                            <Link to="/" className="inline-flex bg-white text-zinc-950 font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors">
                                Browse Events
                            </Link>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
