import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function EventDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/events/${id}`);
                if (res.data.success) {
                    setEvent(res.data.event);
                    setTickets(res.data.tickets || []);
                    if (res.data.tickets?.length > 0) {
                        setSelectedTicket(res.data.tickets[0].id);
                    }
                }
            } catch (err) {
                setError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleRegister = async () => {
        if (!selectedTicket) {
            setError('Please select a ticket tier');
            return;
        }

        setError('');
        setSuccess('');
        setRegistering(true);

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/register-event`, {
                event_id: id,
                ticket_id: selectedTicket,
                quantity: parseInt(quantity)
            }, { withCredentials: true });

            if (res.data.success) {
                setSuccess('Registration successful! Redirecting to your dashboard...');
                setTimeout(() => navigate('/dashboard'), 2000);
            }
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login'); // Redirect to login if unauthenticated
            } else {
                setError(err.response?.data?.message || 'Failed to complete registration.');
            }
        } finally {
            setRegistering(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-zinc-500">Loading experience...</div>;
    if (!event) return <div className="text-center py-20 text-red-400">Event not found.</div>;

    const eventDate = new Date(event.date);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col lg:flex-row">
                
                {/* Visual / Info Side */}
                <div className="lg:w-2/3 flex flex-col">
                    <div className="h-[400px] w-full bg-zinc-800 relative">
                        {event.image_url ? (
                            <img 
                                src={event.image_url.startsWith('http') ? event.image_url : `${import.meta.env.VITE_API_URL}/uploads/${event.image_url}`} 
                                alt={event.title} 
                                className="w-full h-full object-cover opacity-90" 
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-300">
                                <span className="text-6xl">📸</span>
                            </div>
                        )}
                        <div className="absolute top-6 left-6 bg-zinc-900/90 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold text-zinc-100 shadow-sm flex items-center gap-2 border border-zinc-700">
                            <span>📅</span> 
                            {eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>

                    <div className="p-8 lg:p-12">
                        <h1 className="text-4xl font-extrabold text-white mb-6">{event.title}</h1>
                        <div className="flex flex-wrap items-center gap-6 mb-10 text-zinc-400">
                            <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
                                <span>📍</span> 
                                <span className="font-medium">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
                                <span>⏰</span> 
                                <span className="font-medium">
                                    {eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
                                <span>👥</span> 
                                <span className="font-medium">{event.capacity} Capacity</span>
                            </div>
                        </div>

                        <div className="prose prose-invert prose-zinc max-w-none">
                            <h3 className="text-xl font-bold text-white mb-4">About this Event</h3>
                            <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                {event.description || 'No description provided.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Checkout / Ticketing Side */}
                <div className="lg:w-1/3 bg-zinc-800 border-l border-zinc-700 p-8 lg:p-10 flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-8">Secure Your Spot</h3>
                    
                    {error && (
                        <div className="mb-6 bg-red-950/30 border border-red-900/50 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 bg-green-950/30 border border-green-900/50 text-green-400 px-4 py-3 rounded-xl text-sm font-medium">
                            {success}
                        </div>
                    )}

                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-300 mb-3">Select Ticket Tier</label>
                            {tickets.length > 0 ? (
                                <div className="space-y-3">
                                    {tickets.map(ticket => (
                                        <div 
                                            key={ticket.id}
                                            onClick={() => ticket.quantity_available > 0 && setSelectedTicket(ticket.id)}
                                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                                                selectedTicket === ticket.id 
                                                    ? 'border-white bg-zinc-900 shadow-lg' 
                                                    : ticket.quantity_available > 0 
                                                        ? 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500' 
                                                        : 'border-zinc-800 bg-zinc-900 opacity-40 cursor-not-allowed'
                                            }`}
                                        >
                                            <div>
                                                <h4 className="font-bold text-white">{ticket.name}</h4>
                                                <p className="text-xs text-zinc-500 mt-1">
                                                    {ticket.quantity_available > 0 ? `${ticket.quantity_available} remaining` : 'Sold Out'}
                                                </p>
                                            </div>
                                            <div className="text-lg text-white font-extrabold text-right flex flex-col">
                                                <span>${parseFloat(ticket.price).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-400 bg-zinc-900 p-4 rounded-xl border border-zinc-700">
                                    Free Registration (No tiers configured)
                                </p>
                            )}
                        </div>

                        {tickets.length > 0 && (
                            <div>
                                <label className="block text-sm font-semibold text-zinc-300 mb-3">Quantity</label>
                                <select 
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-600 font-medium text-white"
                                >
                                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                        <option key={n} value={n} className="bg-zinc-900">{n} Ticket{n > 1 ? 's' : ''}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {tickets.length > 0 && selectedTicket && (
                            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-700 shadow-sm mt-8">
                                <div className="flex justify-between items-center text-sm font-medium text-zinc-400 mb-2">
                                    <span>Subtotal ({quantity}x)</span>
                                    <span>${(parseFloat(tickets.find(t => t.id === selectedTicket)?.price || 0) * quantity).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium text-zinc-400 mb-4 pb-4 border-b border-zinc-700">
                                    <span>Platform Fee</span>
                                    <span>$2.50</span>
                                </div>
                                <div className="flex justify-between items-center font-bold text-lg text-white">
                                    <span>Total</span>
                                    <span>${((parseFloat(tickets.find(t => t.id === selectedTicket)?.price || 0) * quantity) + 2.50).toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                    </div>

                    <button 
                        onClick={handleRegister}
                        disabled={registering || (tickets.length > 0 && !selectedTicket)}
                        className="w-full bg-white text-zinc-950 font-bold text-lg py-5 rounded-xl hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:shadow-none transition-all mt-8"
                    >
                        {registering ? 'Processing...' : 'Checkout & Register'}
                    </button>
                    <p className="text-center text-xs text-zinc-500 mt-4 font-medium flex items-center justify-center gap-1.5">
                        <span>🔒</span> Secure 1-click checkout
                    </p>
                </div>
            </div>
        </div>
    );
}
