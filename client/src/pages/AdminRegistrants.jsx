import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Image as ImageIcon, CheckCircle2, AlertCircle, CheckSquare as CheckedIcon, Square as UncheckedIcon, QrCode, BarChart3 } from 'lucide-react';
import PlatformFeeModal from '../components/PlatformFeeModal.jsx';

export default function AdminRegistrants() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [registrants, setRegistrants] = useState([]);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });
    const [selectedRegs, setSelectedRegs] = useState([]);
    
    // Fee Modal State
    const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
    const [pendingRegData, setPendingRegData] = useState(null);

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

    useEffect(() => {
        fetchRegistrants();
    }, [id]);

    const handlePaymentStatusChange = async (registrationId, newStatus, feeStatus = null) => {
        // If marking as Paid and no fee status decided yet, open modal
        if (newStatus === 'Paid' && !feeStatus) {
            // Check if event has ended
            if (event && new Date(event.date) < new Date()) {
                setFlashMessage({ text: 'Cannot update payment status for past events', type: 'error' });
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
                return;
            }
            
            const reg = registrants.find(r => r.id === registrationId);
            setPendingRegData({ id: registrationId, name: reg?.user_name || 'Attendee' });
            setIsFeeModalOpen(true);
            return;
        }

        try {
            const res = await axios.patch(
                `${import.meta.env.VITE_API_URL}/registrations/${registrationId}/payment-status`,
                { 
                    payment_status: newStatus,
                    platform_fee_status: feeStatus 
                },
                { withCredentials: true }
            );
            if (res.data.success) {
                // Update locally without refetching
                setRegistrants(prev => prev.map(r => 
                    r.id === registrationId ? { ...r, payment_status: newStatus, platform_fee_status: feeStatus || r.platform_fee_status } : r
                ));
                setFlashMessage({ text: `Payment marked as ${newStatus}${feeStatus ? ` (Fee: ${feeStatus})` : ''}`, type: 'success' });
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
                setIsFeeModalOpen(false);
                setPendingRegData(null);
            }
        } catch (err) {
            setFlashMessage({ text: err.response?.data?.message || 'Failed to update status', type: 'error' });
            setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
        }
    };

    const handleBatchPaymentStatusChange = async (newStatus) => {
        if (selectedRegs.length === 0) return;
        
        // As per user request: Batch Paid automatically adds to Platform Debt
        const feeStatus = newStatus === 'Paid' ? 'Pending' : null;

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/registrations/batch-payment-status`,
                { 
                    registrationIds: selectedRegs, 
                    payment_status: newStatus,
                    platform_fee_status: feeStatus
                },
                { withCredentials: true }
            );
            if (res.data.success) {
                // Update locally
                setRegistrants(prev => prev.map(r => 
                    selectedRegs.includes(r.id) ? { ...r, payment_status: newStatus, platform_fee_status: feeStatus || r.platform_fee_status } : r
                ));
                setSelectedRegs([]);
                setFlashMessage({ text: `Batch updated ${res.data.updatedIds.length} payments to ${newStatus}${feeStatus === 'Pending' ? ' (Added to Debt)' : ''}`, type: 'success' });
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
            }
        } catch (err) {
            setFlashMessage({ text: err.response?.data?.message || 'Batch update failed', type: 'error' });
            setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRegs(registrants.map(r => r.id));
        } else {
            setSelectedRegs([]);
        }
    };

    const toggleSelection = (id) => {
        setSelectedRegs(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
    };


    const getStatusBadge = (status) => {
        const styles = {
            'Paid': 'bg-green-950/40 text-green-400 border-green-900/50',
            'Pending': 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
            'Cancelled': 'bg-red-950/40 text-red-400 border-red-900/50',
            'Completed': 'bg-green-950/40 text-green-400 border-green-900/50'
        };
        return styles[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
    };

    const isEventEnded = () => {
        if (!event) return false;
        const eventDate = new Date(event.date);
        return eventDate < new Date();
    };

    if (loading) return <div className="p-12 text-center text-zinc-500">Loading registrants data...</div>;
    
    // Stats
    const totalRegistrations = registrants.length;
    const paidRevenue = registrants.filter(r => r.payment_status === 'Paid' || r.payment_status === 'Completed').reduce((sum, r) => sum + parseFloat(r.revenue), 0);
    const pendingRevenue = registrants.filter(r => r.payment_status === 'Pending').reduce((sum, r) => sum + parseFloat(r.revenue), 0);
    const cancelledCount = registrants.filter(r => r.payment_status === 'Cancelled').length;
    const totalTicketsSold = registrants.reduce((sum, r) => sum + parseInt(r.quantity), 0);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex justify-between items-start mb-8 gap-4 flex-col md:flex-row">
                <div className="flex-1">
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

                {/* Check-In Buttons */}
                {event && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate(`/admin/events/${id}/check-in`)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20 text-sm"
                        >
                            <QrCode size={18} /> QR Code
                        </button>
                        <button
                            onClick={() => navigate(`/admin/events/${id}/attendance`)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/20 text-sm"
                        >
                            <BarChart3 size={18} /> Attendance
                        </button>
                    </div>
                )}
            </div>

            {/* Flash Message (Floating Toast) */}
            {flashMessage.text && (
                <div className={`fixed top-6 right-6 z-[100] p-4 rounded-2xl border flex items-center gap-3 animate-slideIn shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-xl ${
                    flashMessage.type === 'success' 
                        ? 'bg-green-950/90 border-green-500/30 text-green-400' 
                        : 'bg-red-950/90 border-red-500/30 text-red-400'
                }`}>
                    {flashMessage.type === 'success' ? <CheckCircle2 size={20} className="drop-shadow-md" /> : <AlertCircle size={20} className="drop-shadow-md" />}
                    <span className="font-bold text-sm tracking-wide drop-shadow-sm">{flashMessage.text}</span>
                </div>
            )}

            {error && (
                <div className="bg-red-950/30 border border-red-900/50 text-red-500 p-4 rounded-xl mb-8">
                    {error}
                </div>
            )}

            {isEventEnded() && (
                <div className="bg-orange-950/30 border border-orange-900/50 text-orange-400 p-4 rounded-xl mb-8 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <span className="font-medium">This event has ended. You can view registrants but cannot modify payment statuses or manage registrations.</span>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-800">
                    <div className="text-zinc-500 mb-1 font-medium">Total Orders</div>
                    <div className="text-3xl font-bold text-white">{totalRegistrations}</div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-800">
                    <div className="text-zinc-500 mb-1 font-medium">Tickets Sold</div>
                    <div className="text-3xl font-bold text-white">{totalTicketsSold}</div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-800">
                    <div className="text-zinc-500 mb-1 font-medium flex items-center gap-2">
                        Paid Revenue
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-950/40 text-green-400 border border-green-900/50 rounded-full font-bold">COLLECTED</span>
                    </div>
                    <div className="text-3xl font-bold text-green-400">₱{paidRevenue.toLocaleString()}</div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-800">
                    <div className="text-zinc-500 mb-1 font-medium flex items-center gap-2">
                        Pending
                        <span className="text-[10px] px-1.5 py-0.5 bg-yellow-950/40 text-yellow-400 border border-yellow-900/50 rounded-full font-bold">AWAITING</span>
                    </div>
                    <div className="text-3xl font-bold text-yellow-400">₱{pendingRevenue.toLocaleString()}</div>
                    {cancelledCount > 0 && (
                        <div className="text-xs text-red-400 mt-1">{cancelledCount} cancelled</div>
                    )}
                </div>
            </div>

            {/* Registrants Table */}
            <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">
                <div className="border-b border-zinc-800 bg-zinc-800/50 px-8 py-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Attendee Roster</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-800/30 border-b border-zinc-800/50">
                                <th className="p-4 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                                        onChange={handleSelectAll}
                                        checked={selectedRegs.length > 0 && selectedRegs.length === registrants.length}
                                        disabled={isEventEnded()}
                                    />
                                </th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Attendee</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Ticket Tier</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Sale Total</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Payment Status</th>
                                <th className="p-4 text-sm font-bold text-zinc-500 uppercase tracking-wider">Date Purchased</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrants.map((reg) => (
                                <tr key={reg.id} className={`border-b border-zinc-800/30 transition-colors ${selectedRegs.includes(reg.id) ? 'bg-[#ffdd95]/5' : 'hover:bg-zinc-800/40'}`}>
                                    <td className="p-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                                            checked={selectedRegs.includes(reg.id)}
                                            onChange={() => toggleSelection(reg.id)}
                                            disabled={isEventEnded()}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-white">{reg.user_name}</div>
                                        <div className="text-xs text-zinc-500">{reg.user_email}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-medium text-zinc-300">{reg.ticket_name}</span>
                                        <div className="text-xs text-zinc-600">Qty: {reg.quantity}</div>
                                    </td>
                                    <td className="p-4 font-bold text-green-400">
                                        ₱{parseFloat(reg.revenue).toFixed(2)}
                                    </td>
                                    <td className="p-4">
                                        <div className="inline-flex items-center bg-zinc-800/80 rounded-full p-0.5 border border-zinc-700/50">
                                            {[
                                                { value: 'Paid', label: 'Paid', activeClass: 'bg-green-500/20 text-green-400 border-green-500/40 shadow-lg shadow-green-500/10' },
                                                { value: 'Pending', label: 'Pending', activeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-lg shadow-yellow-500/10' },
                                                { value: 'Cancelled', label: 'Cancelled', activeClass: 'bg-red-500/20 text-red-400 border-red-500/40 shadow-lg shadow-red-500/10' }
                                            ].map(opt => {
                                                const isActive = (reg.payment_status || 'Pending') === opt.value;
                                                const isDisabled = isEventEnded();
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => !isActive && !isDisabled && handlePaymentStatusChange(reg.id, opt.value)}
                                                        disabled={isDisabled}
                                                        className={`px-3 py-1 text-[11px] font-bold rounded-full border transition-all duration-200 ${
                                                            isActive 
                                                                ? opt.activeClass 
                                                                : isDisabled
                                                                ? 'border-transparent text-zinc-600 bg-zinc-800/30 cursor-not-allowed'
                                                                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 cursor-pointer'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
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

            {/* Batch Action Bar */}
            {selectedRegs.length > 0 && !isEventEnded() && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-8 z-50 animate-slideUp">
                    <div className="flex items-center gap-3 pr-8 border-r border-zinc-800">
                        <CheckedIcon className="text-[#ffdd95]" size={20} />
                        <span className="text-white font-bold text-sm tracking-tight">{selectedRegs.length} Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest mr-2">Mark as:</span>
                        <div className="inline-flex items-center bg-zinc-800/80 rounded-full p-1 border border-zinc-700/50">
                            <button 
                                onClick={() => handleBatchPaymentStatusChange('Paid')}
                                className="px-4 py-1.5 text-xs font-bold rounded-full text-green-400 hover:bg-green-500/20 hover:border-green-500/40 border border-transparent transition-all"
                            >
                                Paid
                            </button>
                            <button 
                                onClick={() => handleBatchPaymentStatusChange('Pending')}
                                className="px-4 py-1.5 text-xs font-bold rounded-full text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/40 border border-transparent transition-all"
                            >
                                Pending
                            </button>
                            <button 
                                onClick={() => handleBatchPaymentStatusChange('Cancelled')}
                                className="px-4 py-1.5 text-xs font-bold rounded-full text-red-400 hover:bg-red-500/20 hover:border-red-500/40 border border-transparent transition-all"
                            >
                                Cancelled
                            </button>
                        </div>
                        <div className="w-px h-6 bg-zinc-800 mx-2"></div>
                        <button 
                            onClick={() => setSelectedRegs([])}
                            className="text-zinc-500 hover:text-white text-xs font-bold transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {/* Platform Fee Modal */}
            <PlatformFeeModal 
                isOpen={isFeeModalOpen}
                onClose={() => {
                    setIsFeeModalOpen(false);
                    setPendingRegData(null);
                }}
                onConfirm={(feeStatus) => {
                    if (pendingRegData) {
                        handlePaymentStatusChange(pendingRegData.id, 'Paid', feeStatus);
                    }
                }}
                attendeeName={pendingRegData?.name}
            />
        </div>
    );
}
