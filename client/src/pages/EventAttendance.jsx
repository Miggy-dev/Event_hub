import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Users, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function EventAttendance() {
    const { id } = useParams();
    const [stats, setStats] = useState(null);
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });

    const fetchAttendance = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/events/${id}/attendance`, { withCredentials: true });
            
            if (res.data.success) {
                setStats(res.data.stats);
                setAttendees(res.data.attendees);
            }
        } catch (error) {
            setFlashMessage({ text: error.response?.data?.message || 'Failed to load attendance', type: 'error' });
            setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [id]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(fetchAttendance, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, [autoRefresh, id]);

    if (loading) {
        return (
            <div className="flex-1 bg-zinc-950 min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-zinc-950 min-h-screen p-4 md:p-8">
            {/* Floating Toast */}
            {flashMessage.text && (
                <div className={`fixed top-6 right-6 z-[100] p-4 rounded-2xl border flex items-center gap-3 animate-slideIn shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-xl ${
                    flashMessage.type === 'success' 
                        ? 'bg-green-950/90 border-green-500/30 text-green-400' 
                        : 'bg-red-950/90 border-red-500/30 text-red-400'
                }`}>
                    {flashMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold text-sm">{flashMessage.text}</span>
                </div>
            )}

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase">Event Attendance</h1>
                        <p className="text-zinc-500 font-medium">Real-time check-in tracking</p>
                    </div>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            autoRefresh
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                    >
                        {autoRefresh ? '🔄 Auto-Refresh ON' : '⏸ Auto-Refresh OFF'}
                    </button>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Registrations */}
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Users size={12} /> Total Registrations
                            </p>
                            <p className="text-4xl font-black text-white">{stats.totalRegistrations}</p>
                        </div>

                        {/* Checked In */}
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <CheckCircle2 size={12} className="text-emerald-500" /> Checked In
                            </p>
                            <p className="text-4xl font-black text-emerald-400">{stats.checkedInCount}</p>
                            <p className="text-zinc-600 text-[10px] mt-2 uppercase font-bold">
                                {stats.attendanceRate}% Attendance
                            </p>
                        </div>

                        {/* Not Checked In */}
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Clock size={12} className="text-orange-500" /> Not Checked In
                            </p>
                            <p className="text-4xl font-black text-orange-400">{stats.notCheckedIn}</p>
                            <p className="text-zinc-600 text-[10px] mt-2 uppercase font-bold">
                                Pending
                            </p>
                        </div>
                    </div>
                )}

                {/* Checked In Attendees */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-zinc-800">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 italic">
                            <CheckCircle2 className="text-emerald-500" /> Checked-In Attendees
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        {attendees.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest bg-zinc-950/30">
                                        <th className="px-8 py-4">Name</th>
                                        <th className="px-8 py-4">Check-In Time</th>
                                        <th className="px-8 py-4">Checked In By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {attendees.map((attendee) => (
                                        <tr key={attendee.registration_id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-8 py-5">
                                                <p className="text-white font-bold text-sm">{attendee.name}</p>
                                            </td>
                                            <td className="px-8 py-5 text-zinc-400 text-sm">
                                                {new Date(attendee.checked_in_at).toLocaleTimeString()}
                                            </td>
                                            <td className="px-8 py-5 text-zinc-400 text-sm">
                                                {attendee.checked_in_by || 'Mobile Scan'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-zinc-600 text-sm italic">No check-ins yet. Attendees will appear here as they arrive.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                    <p className="text-blue-200 text-sm font-bold mb-2">💡 Tips for Event Check-In</p>
                    <ul className="text-blue-300 text-sm space-y-2 list-disc list-inside">
                        <li>Display the QR code at the event entrance or share via mobile scanner link</li>
                        <li>Attendees scan with their phone camera to check in instantly</li>
                        <li>Real-time updates show attendance as people arrive</li>
                        <li>Auto-refresh updates the list every 5 seconds when enabled</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
