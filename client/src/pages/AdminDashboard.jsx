import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Users, Edit, Trash2, Clock, CheckCircle2, AlertCircle, User as UserIcon, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [events, setEvents] = useState([]);
    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });
    
    // New Event Form State
    const [newEvent, setNewEvent] = useState({
        title: '', description: '', date: '', location: '', capacity: ''
    });
    const [editingEvent, setEditingEvent] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    // Optional Event Tickets
    const [ticketTier, setTicketTier] = useState({ name: 'General Admission', price: '', quantity_available: '' });

    const setAsCover = (index) => {
        if (index === 0) return;
        const updated = [...imageFiles];
        const [selected] = updated.splice(index, 1);
        updated.unshift(selected);
        setImageFiles(updated);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const statsRes = await axios.get(`${import.meta.env.VITE_API_URL}/admin/stats`, { withCredentials: true });
            if (statsRes.data.success) setStats(statsRes.data.stats);

            const eventsRes = await axios.get(`${import.meta.env.VITE_API_URL}/my-created-events`, { withCredentials: true });
            if (eventsRes.data.success) setEvents(eventsRes.data.events);

            const sessionRes = await axios.get(`${import.meta.env.VITE_API_URL}/get-session`, { withCredentials: true });
            if (sessionRes.data.session) setUser(sessionRes.data.user);


        } catch (error) {
            console.error("Admin fetch error", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', newEvent.title);
            formData.append('description', newEvent.description);
            formData.append('date', newEvent.date);
            formData.append('location', newEvent.location);
            formData.append('capacity', newEvent.capacity);
            if (imageFiles && imageFiles.length > 0) {
                imageFiles.forEach(file => {
                    formData.append('images', file);
                });
            }

            // 1. Create Event
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/events`, formData, { 
                withCredentials: true
            });
            
            if (res.data.success) {
                const eventId = res.data.id;
                
                // 2. Create Ticket Tier if fields are filled
                if (ticketTier.price && ticketTier.quantity_available) {
                    await axios.post(`${import.meta.env.VITE_API_URL}/events/${eventId}/tickets`, ticketTier, { withCredentials: true });
                }

                setFlashMessage({ text: 'Event published successfully!', type: 'success' });
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 4000);
                
                setShowCreateModal(false);
                setNewEvent({ title: '', description: '', date: '', location: '', capacity: '' });
                setImageFiles([]);
                setTicketTier({ name: 'General Admission', price: '', quantity_available: '' });
                fetchData(); // Refresh table
            }
        } catch (error) {
            console.error('Failed to create event', error);
            const errMsg = error.response?.data?.message || 'Error creating event';
            const detail = error.response?.data?.error || '';
            alert(`${errMsg}${detail ? ': ' + detail : ''}`);
        }
    };

    const handleUpdateEvent = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', editingEvent.title);
            formData.append('description', editingEvent.description);
            formData.append('date', editingEvent.date);
            formData.append('location', editingEvent.location);
            formData.append('capacity', editingEvent.capacity);
            formData.append('status', editingEvent.status);
            if (imageFiles && imageFiles.length > 0) {
                imageFiles.forEach(file => {
                    formData.append('images', file);
                });
            }

            // 1. Update Event Details
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/events/${editingEvent.id}`, formData, { 
                withCredentials: true
            });
            
            if (res.data.success) {
                // 2. Update Ticket Details
                if (editingEvent.ticketPrice !== undefined && editingEvent.ticketQuantity !== undefined) {
                    await axios.put(`${import.meta.env.VITE_API_URL}/events/${editingEvent.id}/tickets`, {
                        price: editingEvent.ticketPrice,
                        quantity_available: editingEvent.ticketQuantity
                    }, { withCredentials: true });
                }

                setFlashMessage({ text: 'Event updated successfully!', type: 'success' });
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 4000);
                setShowEditModal(false);
                setEditingEvent(null);
                setImageFiles([]);
                fetchData();
            }
        } catch (error) {
            console.error('Failed to update event', error);
            const errMsg = error.response?.data?.message || 'Error updating event';
            const detail = error.response?.data?.detail || '';
            alert(`${errMsg}${detail ? ': ' + detail : ''}`);
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/events/${id}`, { withCredentials: true });
            setFlashMessage({ text: 'Event deleted successfully.', type: 'success' });
            setTimeout(() => setFlashMessage({ text: '', type: '' }), 4000);
            fetchData();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const openEditModal = async (event) => {
        try {
            // Fetch latest event details including tickets
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/events/${event.id}`);
            const fullEvent = res.data.event;
            const tickets = res.data.tickets || [];
            const mainTicket = tickets[0] || {};

            const eventDate = new Date(fullEvent.date);
            const formattedDate = eventDate.toISOString().slice(0, 16);
            
            setEditingEvent({ 
                ...fullEvent, 
                date: formattedDate,
                ticketPrice: mainTicket.price || '',
                ticketQuantity: mainTicket.quantity_available || ''
            });
            setShowEditModal(true);
        } catch (error) {
            console.error("Error opening edit modal", error);
            alert("Failed to load event details");
        }
    };

    const { upcomingEvents, endedEvents } = useMemo(() => {
        const now = new Date();
        const upcoming = [];
        const ended = [];
        events.forEach(event => {
            if (new Date(event.date) < now) {
                ended.push(event);
            } else {
                upcoming.push(event);
            }
        });
        return { upcomingEvents: upcoming, endedEvents: ended };
    }, [events]);

    if (loading) return <div className="p-12 text-center text-zinc-500">Loading admin data...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Profile Card Overlay */}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 mb-10 overflow-hidden relative group shadow-2xl">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/10 transition-colors duration-500"></div>
                
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                    {/* Profile Photo */}
                    <div className="w-32 h-32 rounded-3xl bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xl group-hover:border-white/30 transition-colors duration-300">
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
                            <h1 className="text-3xl font-black text-white">{user?.name || 'Admin Center'}</h1>
                            <span className="inline-flex items-center px-3 py-1 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20 self-center md:self-auto">
                                {user?.roleName || 'Admin'}
                            </span>
                        </div>
                        
                        <div className="max-w-2xl">
                            <p className="text-zinc-400 leading-relaxed italic text-sm sm:text-base">
                                {user?.bio || 'No biography provided.'}
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

            {/* KPI Stats Row */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-800">
                        <div className="text-zinc-500 mb-2 font-medium">Total Revenue</div>
                        <div className="text-3xl font-bold text-white">₱{stats.revenue?.toLocaleString() || 0}</div>
                    </div>
                    <div className="bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-800">
                        <div className="text-zinc-500 mb-2 font-medium">Active Registrations</div>
                        <div className="text-3xl font-bold text-white">{stats.activeRegistrations ?? (stats.registrations || 0)}</div>
                    </div>
                    <div className="bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-800">
                        <div className="text-zinc-500 mb-2 font-medium">Active Events</div>
                        <div className="text-3xl font-bold text-white">{stats.activeEvents ?? (stats.events || 0)}</div>
                    </div>
                    <div className="bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-800">
                        <div className="text-zinc-500 mb-2 font-medium">Platform Users</div>
                        <div className="text-3xl font-bold text-white">{stats.users || 0}</div>
                    </div>
                </div>
            )}

            {/* Event Management Block */}
            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">
                <div className="border-b border-zinc-800 bg-zinc-800/50 px-8 py-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Event Management</h2>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-white text-zinc-950 font-bold px-5 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors text-sm shadow-lg flex items-center gap-2"
                    >
                        <Plus size={18} /> Create New Event
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-800/50 border-b border-zinc-800">
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Event</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Capacity</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {upcomingEvents.map((event) => (
                                <tr key={event.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-white">{event.title}</div>
                                        <div className="text-xs text-zinc-500">{event.location}</div>
                                    </td>
                                    <td className="p-4 text-sm text-zinc-300">
                                        {new Date(event.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-sm text-zinc-300">{event.capacity}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                                            event.status === 'Published' ? 'bg-green-950/30 text-green-400 border-green-900/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                        }`}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="p-4 space-x-4">
                                        <button 
                                            onClick={() => navigate(`/admin/events/${event.id}/registrants`)}
                                            className="text-blue-400 hover:text-blue-300 font-bold text-sm transition-colors flex items-center gap-1 inline-flex"
                                        >
                                            <Users size={14} /> Registrants
                                        </button>
                                        <button 
                                            onClick={() => openEditModal(event)}
                                            className="text-zinc-400 hover:text-white font-bold text-sm transition-colors flex items-center gap-1 inline-flex"
                                        >
                                            <Edit size={14} /> Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="text-red-400 hover:text-red-300 font-bold text-sm transition-colors flex items-center gap-1 inline-flex"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                                    {upcomingEvents.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-zinc-500 font-medium">
                                                No upcoming events found. Start by creating one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>


            {/* Ended Events Table */}
            {endedEvents.length > 0 && (
                <div className="mt-12 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center gap-2">
                            <Clock size={20} className="text-zinc-600" />
                            <h2 className="text-xl font-bold text-zinc-500 tracking-tight">Ended Events</h2>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
                        <span className="text-xs text-zinc-600 font-medium">{endedEvents.length} event{endedEvents.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="bg-[#12141a] rounded-3xl shadow-2xl border border-zinc-800/50 overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-800/30 border-b border-zinc-800/50">
                                        <th className="p-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Event</th>
                                        <th className="p-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Date</th>
                                        <th className="p-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Capacity</th>
                                        <th className="p-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Status</th>
                                        <th className="p-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {endedEvents.map((event) => (
                                        <tr key={`ended-${event.id}`} className="border-b border-zinc-800/30 hover:bg-zinc-800/40 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-zinc-400">{event.title}</div>
                                                <div className="text-xs text-zinc-600">{event.location}</div>
                                            </td>
                                            <td className="p-4 text-sm text-zinc-500">
                                                {new Date(event.date).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-sm text-zinc-500">{event.capacity}</td>
                                            <td className="p-4">
                                                <span className="px-3 py-1 text-xs font-bold rounded-full border bg-zinc-900/50 text-zinc-600 border-zinc-800/50">
                                                    Ended
                                                </span>
                                            </td>
                                            <td className="p-4 space-x-4">
                                                <button 
                                                    onClick={() => navigate(`/admin/events/${event.id}/registrants`)}
                                                    className="text-blue-600 hover:text-blue-400 font-bold text-sm transition-colors cursor-pointer flex items-center gap-1 inline-flex"
                                                >
                                                    <Users size={14} /> Registrants
                                                </button>
                                                <button 
                                                    onClick={() => openEditModal(event)}
                                                    className="text-zinc-600 hover:text-zinc-300 font-bold text-sm transition-colors flex items-center gap-1 inline-flex"
                                                >
                                                    <Edit size={14} /> Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                    className="text-red-900/70 hover:text-red-500 font-bold text-sm transition-colors flex items-center gap-1 inline-flex"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Event Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-8 border border-zinc-800">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Create New Event</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white text-3xl font-light">&times;</button>
                        </div>
                        
                        <form onSubmit={handleCreateEvent} className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Event Title</label>
                                    <input required type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-zinc-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Date & Time</label>
                                    <input required type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-zinc-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Location</label>
                                    <input required type="text" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-zinc-600" />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Event Images (Up to 10)</label>
                                    <input 
                                        type="file" 
                                        multiple
                                        accept="image/*"
                                        onChange={e => setImageFiles(Array.from(e.target.files).slice(0, 10))} 
                                        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-700 file:text-zinc-300 hover:file:bg-zinc-600 transition-all cursor-pointer" 
                                    />
                                    {imageFiles.length > 0 && (
                                        <div className="mt-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                            <p className="text-xs text-zinc-500 mb-3 font-bold uppercase tracking-wider">{imageFiles.length} / 10 images selected</p>
                                            <div className="flex gap-3 flex-wrap">
                                                {imageFiles.map((f, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => setAsCover(idx)}
                                                        className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 shadow-md cursor-pointer group transition-colors ${idx === 0 ? 'border-blue-500' : 'border-zinc-700 hover:border-zinc-500'}`}
                                                    >
                                                        <img src={URL.createObjectURL(f)} className={`w-full h-full object-cover ${idx !== 0 ? 'group-hover:opacity-50 transition-opacity' : ''}`} />
                                                        {idx === 0 ? (
                                                            <span className="absolute bottom-0 left-0 w-full text-center text-[10px] font-bold bg-blue-600 text-white py-0.5 z-10">COVER</span>
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span className="bg-zinc-900/90 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg border border-zinc-700">Set Cover</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            

                            
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">Description</label>
                                <textarea required rows="3" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"></textarea>
                            </div>
                            
                            <hr className="border-zinc-800" />
                            
                            {/* Tickets Setup */}
                            <h3 className="text-lg font-bold text-white">Ticketing (Optional)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Total Venue Capacity</label>
                                    <input required type="number" min="1" value={newEvent.capacity} onChange={e => setNewEvent({...newEvent, capacity: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Ticket Price (₱)</label>
                                    <input type="number" step="0.01" min="0" value={ticketTier.price} onChange={e => setTicketTier({...ticketTier, price: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" placeholder="e.g. 50.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Tickets Available</label>
                                    <input type="number" min="1" value={ticketTier.quantity_available} onChange={e => setTicketTier({...ticketTier, quantity_available: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-white text-zinc-950 font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all shadow-lg mt-4">
                                Publish Event
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Event Modal */}
            {showEditModal && editingEvent && (
                <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-8 border border-zinc-800">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Edit Event</h2>
                            <button onClick={() => { setShowEditModal(false); setEditingEvent(null); setImageFiles([]); }} className="text-zinc-500 hover:text-white text-3xl font-light">&times;</button>
                        </div>
                        
                        <form onSubmit={handleUpdateEvent} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Event Title</label>
                                    <input required type="text" value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-zinc-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Date & Time</label>
                                    <input required type="datetime-local" value={editingEvent.date} onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-zinc-600" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Location</label>
                                    <input required type="text" value={editingEvent.location} onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-zinc-600" />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Change Images (Overwrites existing 10)</label>
                                    <input 
                                        type="file" 
                                        multiple
                                        accept="image/*"
                                        onChange={e => setImageFiles(Array.from(e.target.files).slice(0, 10))} 
                                        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-700 file:text-zinc-300 hover:file:bg-zinc-600 transition-all cursor-pointer" 
                                    />
                                    {imageFiles.length > 0 ? (
                                        <div className="mt-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                            <p className="text-xs text-zinc-500 mb-3 font-bold uppercase tracking-wider">{imageFiles.length} / 10 new images selected</p>
                                            <div className="flex gap-3 flex-wrap">
                                                {imageFiles.map((f, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => setAsCover(idx)}
                                                        className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 shadow-md cursor-pointer group transition-colors ${idx === 0 ? 'border-blue-500' : 'border-zinc-700 hover:border-zinc-500'}`}
                                                    >
                                                        <img src={URL.createObjectURL(f)} className={`w-full h-full object-cover ${idx !== 0 ? 'group-hover:opacity-50 transition-opacity' : ''}`} />
                                                        {idx === 0 ? (
                                                            <span className="absolute bottom-0 left-0 w-full text-center text-[10px] font-bold bg-blue-600 text-white py-0.5 z-10">COVER</span>
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span className="bg-zinc-900/90 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg border border-zinc-700">Set Cover</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : editingEvent.image_url && (
                                        <div className="mt-4">
                                            <p className="text-xs text-zinc-500 mb-2 font-bold uppercase tracking-wider">Current Cover Image</p>
                                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 shadow-md">
                                                <img src={editingEvent.image_url.startsWith('http') ? editingEvent.image_url : `${import.meta.env.VITE_API_URL}/uploads/${editingEvent.image_url}`} className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">Description</label>
                                <textarea required rows="3" value={editingEvent.description} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"></textarea>
                            </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Total Venue Capacity</label>
                                    <input required type="number" min="1" value={editingEvent.capacity} onChange={e => setEditingEvent({...editingEvent, capacity: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Event Status</label>
                                    <select value={editingEvent.status} onChange={e => setEditingEvent({...editingEvent, status: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white">
                                        <option value="Published">Published</option>
                                        <option value="Draft">Draft</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            <hr className="border-zinc-800" />
                            <h3 className="text-lg font-bold text-white">Ticketing Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Ticket Price (₱)</label>
                                    <input type="number" step="0.01" min="0" value={editingEvent.ticketPrice} onChange={e => setEditingEvent({...editingEvent, ticketPrice: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" placeholder="e.g. 50.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Tickets Available</label>
                                    <input type="number" min="1" value={editingEvent.ticketQuantity} onChange={e => setEditingEvent({...editingEvent, ticketQuantity: e.target.value})} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-white text-zinc-950 font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all shadow-lg mt-4">
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
