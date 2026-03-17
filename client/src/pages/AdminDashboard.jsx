import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [events, setEvents] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // New Event Form State
    const [newEvent, setNewEvent] = useState({
        title: '', description: '', date: '', location: '', capacity: ''
    });
    const [imageFile, setImageFile] = useState(null);
    // Optional Event Tickets
    const [ticketTier, setTicketTier] = useState({ name: 'General Admission', price: '', quantity_available: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const statsRes = await axios.get(`${import.meta.env.VITE_API_URL}/admin/stats`, { withCredentials: true });
            if (statsRes.data.success) setStats(statsRes.data.stats);

            const eventsRes = await axios.get(`${import.meta.env.VITE_API_URL}/events`, { withCredentials: true });
            if (eventsRes.data.success) setEvents(eventsRes.data.events);


        } catch (error) {
            console.error("Admin fetch error", error);
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
            if (imageFile) {
                formData.append('image', imageFile);
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

                setShowCreateModal(false);
                setNewEvent({ title: '', description: '', date: '', location: '', capacity: '' });
                setImageFile(null);
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

    const handleDeleteEvent = async (id) => {
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/events/${id}`, { withCredentials: true });
            fetchData();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    if (loading) return <div className="p-12 text-center text-zinc-500">Loading admin data...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-extrabold text-white mb-8">Admin Control Center</h1>

            {/* KPI Stats Row */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-800">
                        <div className="text-zinc-500 mb-2 font-medium">Total Revenue</div>
                        <div className="text-3xl font-bold text-white">${stats.revenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-800">
                        <div className="text-zinc-500 mb-2 font-medium">Total Registrations</div>
                        <div className="text-3xl font-bold text-white">{stats.registrations}</div>
                    </div>
                    <div className="bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-800">
                        <div className="text-zinc-500 mb-2 font-medium">Active Events</div>
                        <div className="text-3xl font-bold text-white">{stats.events}</div>
                    </div>
                    <div className="bg-zinc-900 p-6 rounded-2xl shadow-2xl border border-zinc-800">
                        <div className="text-zinc-500 mb-2 font-medium">Platform Users</div>
                        <div className="text-3xl font-bold text-white">{stats.users}</div>
                    </div>
                </div>
            )}

            {/* Event Management Block */}
            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">
                <div className="border-b border-zinc-800 bg-zinc-800/50 px-8 py-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Event Management</h2>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-white text-zinc-950 font-bold px-5 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors text-sm shadow-lg"
                    >
                        + Create New Event
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
                            {events.map((event) => (
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
                                    <td className="p-4">
                                        <button 
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="text-red-400 hover:text-red-300 font-bold text-sm transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                                    {events.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-zinc-500 font-medium">
                                                No events found. Start by creating one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>


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
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Event Image</label>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={e => setImageFile(e.target.files[0])} 
                                        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-700 file:text-zinc-300 hover:file:bg-zinc-600 transition-all" 
                                    />
                                    {imageFile && <p className="text-xs text-zinc-500 mt-2 truncate">Selected: {imageFile.name}</p>}
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
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">Ticket Price ($)</label>
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
        </div>
    );
}
