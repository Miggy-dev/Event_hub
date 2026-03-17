import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function UserDashboard() {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRegistrations = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/my-registrations`, { withCredentials: true });
                if (res.data.success) {
                    setRegistrations(res.data.registrations);
                }
            } catch (error) {
                console.error("Failed to fetch registrations", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRegistrations();
    }, []);

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase();
        if (s === 'completed' || s === 'confirmed') return 'bg-green-500/10 text-green-400 border-green-500/20';
        if (s === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        if (s === 'cancelled') return 'bg-red-500/10 text-red-400 border-red-500/20';
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
                <p className="text-zinc-400 mt-2 text-lg">Manage your tickets and upcoming events.</p>
            </div>

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
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Past Events</p>
                    <p className="text-2xl font-bold text-white">
                        {loading ? '—' : registrations.filter(r => new Date(r.event_date) < new Date()).length}
                    </p>
                </div>
            </div>

            {/* Tickets Section */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                {/* Section Header */}
                <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        🎟️ My Tickets
                    </h2>
                    {!loading && registrations.length > 0 && (
                        <span className="text-xs text-zinc-500 font-medium">{registrations.length} ticket{registrations.length !== 1 ? 's' : ''}</span>
                    )}
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
                                const isPast = eventDate < new Date();
                                
                                return (
                                    <Link
                                        key={reg.id}
                                        to={`/event/${reg.event_id}`}
                                        className={`block bg-zinc-800 border border-zinc-700/50 rounded-xl p-4 sm:p-5 hover:border-zinc-600 hover:bg-zinc-800/80 transition-all group ${isPast ? 'opacity-60 hover:opacity-80' : ''}`}
                                    >
                                        <div className="flex items-center gap-4 sm:gap-5">
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
                                                <div className="flex items-center gap-3 text-xs text-zinc-400">
                                                    <span className="flex items-center gap-1">
                                                        📍 {reg.location}
                                                    </span>
                                                    <span className="hidden sm:inline text-zinc-600">•</span>
                                                    <span className="hidden sm:flex items-center gap-1">
                                                        🎫 {reg.quantity}x {reg.ticket_name}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status + Arrow */}
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border hidden sm:inline-block ${getStatusStyle(reg.payment_status)}`}>
                                                    {reg.payment_status}
                                                </span>
                                                <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                        
                                        {/* Mobile status */}
                                        <div className="mt-3 flex items-center justify-between sm:hidden">
                                            <span className="text-xs text-zinc-500">🎫 {reg.quantity}x {reg.ticket_name}</span>
                                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getStatusStyle(reg.payment_status)}`}>
                                                {reg.payment_status}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-4 opacity-40">🎫</div>
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
