import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function AdminRegistrants() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [registrants, setRegistrants] = useState([]);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRegistrants = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/events/${id}/registrants`, { withCredentials: true });
                if (res.data.success) {
                    setRegistrants(res.data.registrants);
                    setEvent(res.data.event);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch registrants');
            } finally {
                setLoading(false);
            }
        };
        fetchRegistrants();
    }, [id]);

    if (loading) return <div className="p-12 text-center text-zinc-500">Loading registrants data...</div>;
    
    // Count stats
    const totalRegistrations = registrants.length;
    const totalRevenue = registrants.reduce((sum, r) => sum + parseFloat(r.revenue), 0);
    const totalTicketsSold = registrants.reduce((sum, r) => sum + parseInt(r.quantity), 0);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <button 
                        onClick={() => navigate('/admin')}
                        className="text-zinc-500 hover:text-white mb-4 flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    
                    {event ? (
                        <div className="flex items-center gap-4">
                            {event.image_url ? (
                                <img 
                                    src={event.image_url.startsWith('http') ? event.image_url : `${import.meta.env.VITE_API_URL}/uploads/${event.image_url}`} 
                                    alt={event.title} 
                                    className="w-16 h-16 rounded-xl object-cover border border-zinc-700 shadow-md" 
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700 shadow-md">
                                    <ImageIcon size={24} className="text-zinc-600" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-extrabold text-white">{event.title}</h1>
                                <p className="text-zinc-400 mt-1 text-sm">{new Date(event.date).toLocaleDateString()} • {event.location}</p>
                            </div>
                        </div>
                    ) : (
                        <h1 className="text-3xl font-extrabold text-white">Event Registrants</h1>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-950/30 border border-red-900/50 text-red-500 p-4 rounded-xl mb-8">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-800">
                    <div className="text-zinc-500 mb-1 font-medium">Total Orders</div>
                    <div className="text-3xl font-bold text-white">{totalRegistrations}</div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-800">
                    <div className="text-zinc-500 mb-1 font-medium">Tickets Sold</div>
                    <div className="text-3xl font-bold text-white">{totalTicketsSold}</div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-800">
                    <div className="text-zinc-500 mb-1 font-medium">Order Revenue</div>
                    <div className="text-3xl font-bold text-white">₱{totalRevenue.toLocaleString()}</div>
                </div>
            </div>

            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">
                <div className="border-b border-zinc-800 bg-zinc-800/50 px-8 py-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Attendee Roster</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-800/30 border-b border-zinc-800/50">
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Attendee</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Ticket Tier</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Device Used</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Sale Total</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Date Purchased</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrants.map((reg) => (
                                <tr key={reg.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/40 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-white">{reg.user_name}</div>
                                        <div className="text-xs text-zinc-500">{reg.user_email}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-medium text-zinc-300">{reg.ticket_name}</span>
                                        <div className="text-xs text-zinc-600">Qty: {reg.quantity}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 text-xs font-bold rounded-full border bg-zinc-800 text-zinc-400 border-zinc-700">
                                            {reg.device_info || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-green-400">
                                        ₱{parseFloat(reg.revenue).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-sm text-zinc-500">
                                        {new Date(reg.purchased_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {registrants.length === 0 && !error && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-zinc-500 font-medium tracking-wide">
                                        No registrations found for this event yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
