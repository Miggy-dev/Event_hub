import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Package, Clock, MapPin, Ticket, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

export default function Archive() {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });

    const fetchArchivedRegistrations = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/my-archived-registrations`, { withCredentials: true });
            if (res.data.success) {
                setRegistrations(res.data.registrations);
            }
        } catch (error) {
            console.error("Failed to fetch archived registrations", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArchivedRegistrations(); 
    }, []);

    const handleRetrieve = async (id) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/registrations/unarchive`, { ids: [id] }, { withCredentials: true });
            if (res.data.success) {
                setFlashMessage({ text: 'Ticket retrieved successfully!', type: 'success' });
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 4000);
                fetchArchivedRegistrations();
            }
        } catch (error) {
            console.error("Failed to retrieve ticket", error);
            const msg = error.response?.data?.message || error.response?.data?.detail || error.message;
            alert(`Failed to retrieve ticket: ${msg}`);
        }
    };

    // Split registrations into two groups
    const { archivedTickets, endedTickets } = useMemo(() => {
        const now = new Date();
        const archived = [];
        const ended = [];
        registrations.forEach(reg => {
            const eventDate = new Date(reg.event_date);
            if (eventDate < now) {
                ended.push(reg);
            } else {
                archived.push(reg);
            }
        });
        return { archivedTickets: archived, endedTickets: ended };
    }, [registrations]);

    // Reusable ticket card renderer
    const renderTicketCard = (reg, type) => {
        const eventDate = new Date(reg.event_date);
        return (
            <div
                key={reg.id}
                className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 sm:p-5 opacity-80 hover:opacity-100 transition-opacity"
            >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                    <div className="flex items-center gap-4 sm:gap-5 flex-1">
                        {/* Date Block */}
                        <div className={`flex-shrink-0 w-14 h-14 border rounded-lg flex flex-col items-center justify-center ${
                            type === 'ended' 
                                ? 'bg-zinc-950 border-zinc-800 opacity-60' 
                                : 'bg-zinc-900 border-zinc-700 opacity-80'
                        }`}>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none">
                                {eventDate.toLocaleDateString(undefined, { month: 'short' })}
                            </span>
                            <span className="text-xl font-bold text-white leading-none mt-0.5">
                                {eventDate.getDate()}
                            </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold text-sm sm:text-base truncate ${type === 'ended' ? 'text-zinc-300' : 'text-white'}`}>
                                {reg.event_title}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} /> {reg.location}
                                </span>
                                <span className="hidden sm:inline text-zinc-600">•</span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <Ticket size={12} /> {reg.quantity}x {reg.ticket_name}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0 border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0">
                        {type === 'ended' ? (
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-zinc-950/50 text-zinc-500 border-zinc-800">
                                Event Ended
                            </span>
                        ) : (
                            <>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-amber-950/20 text-amber-500 border-amber-900/30">
                                    Archived
                                </span>
                                <button 
                                    onClick={() => handleRetrieve(reg.id)}
                                    className="text-xs font-bold text-white bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg transition-colors"
                                >
                                    Retrieve
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderLoadingSkeleton = () => (
        <div className="space-y-3">
            {[1,2,3].map(n => (
                <div key={n} className="h-20 bg-zinc-800/50 animate-pulse rounded-xl"></div>
            ))}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            
            {/* Header */}
            <div className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Ticket Archive</h1>
                    <p className="text-zinc-400 mt-2 text-lg">History of your past events.</p>
                </div>
                <Link to="/dashboard" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                    ← Back to Dashboard
                </Link>
            </div>

            {flashMessage.text && (
                <div className={`mb-8 p-4 rounded-xl border animate-fadeIn flex items-center gap-3 ${
                    flashMessage.type === 'success' 
                        ? 'bg-green-950/20 border-green-900/50 text-green-400' 
                        : 'bg-red-950/20 border-red-900/50 text-red-400'
                }`}>
                    {flashMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="font-medium text-sm">{flashMessage.text}</span>
                </div>
            )}

            {/* Warning Note */}
            <div className="bg-amber-900/20 border border-amber-900/50 rounded-xl p-4 mb-8">
                <p className="text-amber-200/80 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> Tickets are automatically removed from the archive 30 days after the event ends.
                </p>
            </div>

            {/* Archived Tickets Section (manually archived, upcoming events) */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden mb-8">
                <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <Package size={18} className="text-amber-500/80" /> Archived Tickets
                    </h2>
                    {!loading && archivedTickets.length > 0 && (
                        <span className="text-xs text-amber-500/70 font-medium">{archivedTickets.length} ticket{archivedTickets.length !== 1 ? 's' : ''}</span>
                    )}
                </div>
                
                <div className="p-6">
                    {loading ? renderLoadingSkeleton() : archivedTickets.length > 0 ? (
                        <div className="space-y-3">
                            {archivedTickets.map(reg => renderTicketCard(reg, 'archived'))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="flex justify-center mb-3">
                                <Package size={48} className="text-zinc-700 opacity-40" />
                            </div>
                            <h3 className="text-base font-bold text-white mb-1">No archived tickets</h3>
                            <p className="text-zinc-500 max-w-sm mx-auto text-sm">
                                Tickets you manually archive will appear here. You can retrieve them anytime before the event ends.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Event Ended Section (past events) */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <Clock size={18} className="text-zinc-500" /> Event Ended
                    </h2>
                    {!loading && endedTickets.length > 0 && (
                        <span className="text-xs text-zinc-500 font-medium">{endedTickets.length} ticket{endedTickets.length !== 1 ? 's' : ''}</span>
                    )}
                </div>
                
                <div className="p-6">
                    {loading ? renderLoadingSkeleton() : endedTickets.length > 0 ? (
                        <div className="space-y-3">
                            {endedTickets.map(reg => renderTicketCard(reg, 'ended'))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="flex justify-center mb-3">
                                <Clock size={48} className="text-zinc-700 opacity-40" />
                            </div>
                            <h3 className="text-base font-bold text-white mb-1">No ended events</h3>
                            <p className="text-zinc-500 max-w-sm mx-auto text-sm">
                                Your past event tickets will appear here once the events have ended.
                            </p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
