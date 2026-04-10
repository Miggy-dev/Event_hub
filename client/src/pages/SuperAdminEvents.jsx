import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Users as UsersIcon, 
    CalendarDays as EventIcon,
    Trash2 as DeleteIcon,
    Eye as ViewIcon,
    Search as SearchIcon,
    AlertCircle as ErrorIcon,
    CheckCircle2 as SuccessIcon,
    MapPin,
    Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function SuperAdminEvents() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/super/events`, { withCredentials: true });
            if (res.data.success) {
                setEvents(res.data.events);
            }
        } catch (error) {
            console.error('Failed to fetch events:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
            }
            showFlash('Failed to load events', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Are you strictly sure you want to permanently delete this event? This action cannot be undone and deletes all associated tickets and registrations.')) return;

        try {
            const res = await axios.delete(`${import.meta.env.VITE_API_URL}/super/events/${eventId}`, { withCredentials: true });
            if (res.data.success) {
                showFlash('Event permanently deleted', 'success');
                fetchEvents();
            }
        } catch (error) {
            console.error('Failed to delete event:', error);
            showFlash('Failed to delete event', 'error');
        }
    };

    const showFlash = (text, type) => {
        setFlashMessage({ text, type });
        setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
    };

    const filteredEvents = events.filter(ev => 
        (ev.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (ev.organizer_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#ffdd95]/20 border-t-[#ffdd95] rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-medium animate-pulse">Loading Platform Events...</p>
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
                            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <EventIcon className="text-blue-400" size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Event Management</h1>
                        </div>
                        <p className="text-zinc-400">Global overview and destructive controls for all platform events.</p>
                    </div>
                    
                    <Link to="/super-admin" className="inline-flex items-center gap-2 bg-zinc-900/50 hover:bg-zinc-800 text-white font-black px-6 py-3 rounded-2xl border border-zinc-700 shadow-xl transition-all">
                        <UsersIcon size={18} className="text-[#ffdd95]" />
                        User Management
                    </Link>
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

                {/* Management Table Area */}
                <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-sm">
                    {/* Controls Bar */}
                    <div className="p-6 border-b border-zinc-800/60 bg-zinc-900/50">
                        <div className="relative w-full md:max-w-md group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-400 transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by event title or organizer name..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                            />
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900/20 text-zinc-500 border-b border-zinc-800/60">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Event Timeline</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Organizer</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Registrations</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Location</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40">
                                {filteredEvents.map((ev) => {
                                    const isEnded = new Date(ev.date) < new Date();
                                    return (
                                        <tr key={ev.id} className="hover:bg-zinc-800/10 transition-all">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${isEnded ? 'bg-zinc-600' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}></div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{ev.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Clock size={12} className="text-zinc-500" />
                                                            <p className="text-[10px] text-zinc-400">{new Date(ev.date).toLocaleDateString()}</p>
                                                            {isEnded && <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded uppercase font-bold ml-1">Ended</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-zinc-300">{ev.organizer_name || 'System / Unknown'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-black text-[#ffdd95]">
                                                {ev.total_registrations}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <MapPin size={14} />
                                                    <span className="text-xs truncate max-w-[150px]">{ev.location}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link 
                                                        to={`/event/${ev.id}`}
                                                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                                                        title="View Event"
                                                    >
                                                        <ViewIcon size={16} />
                                                    </Link>
                                                    <button 
                                                        onClick={() => handleDeleteEvent(ev.id)}
                                                        className="p-2 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                                        title="Global Delete Event"
                                                    >
                                                        <DeleteIcon size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredEvents.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">
                                            No events found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
