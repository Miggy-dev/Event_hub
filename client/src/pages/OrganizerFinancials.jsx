import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    TrendingUp, 
    DollarSign, 
    CreditCard, 
    Calendar, 
    ArrowUpRight, 
    ArrowDownRight, 
    Activity,
    CheckCircle2,
    Clock
} from 'lucide-react';
import PlatformFeeModal from '../components/PlatformFeeModal.jsx';

export default function OrganizerFinancials() {
    const [summary, setSummary] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Fee Modal State
    const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
    const [pendingRegData, setPendingRegData] = useState(null);

    const fetchFinancials = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/organizer/revenue`, { withCredentials: true });
            if (res.data.success) {
                setSummary(res.data.summary);
                setTransactions(res.data.transactions);
            }
        } catch (error) {
            console.error("Error fetching financials", error);
        } finally {
            setLoading(false);
        }
    };

    const confirmPayment = async (regId, feeStatus = null) => {
        // If marking as Paid and no fee status decided yet, open modal
        if (!feeStatus) {
            const reg = transactions.find(t => t.id === regId);
            
            // Check if event has ended
            if (reg && reg.event_date && new Date(reg.event_date) < new Date()) {
                alert('Cannot confirm payment for past events');
                return;
            }
            
            setPendingRegData({ id: regId, name: reg?.user_name || 'Attendee' });
            setIsFeeModalOpen(true);
            return;
        }

        try {
            const res = await axios.patch(`${import.meta.env.VITE_API_URL}/registrations/${regId}/payment-status`, { 
                payment_status: 'Paid',
                platform_fee_status: feeStatus
            }, { withCredentials: true });
            
            if (res.data.success) {
                fetchFinancials();
                setIsFeeModalOpen(false);
                setPendingRegData(null);
            }
        } catch (error) {
            if (error.response?.status === 403) {
                alert(error.response?.data?.message || 'Cannot confirm payment for past events');
            } else {
                alert("Failed to confirm payment");
            }
            setIsFeeModalOpen(false);
            setPendingRegData(null);
        }
    };

    useEffect(() => {
        fetchFinancials();
    }, []);

    if (loading) return (
        <div className="flex-1 flex items-center justify-center bg-zinc-950 min-h-screen">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="flex-1 bg-zinc-950 min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">Financials</h1>
                        <p className="text-zinc-500 font-medium">Manage your earnings, platform fees, and payouts.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp size={80} className="text-blue-500" />
                        </div>
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                            <DollarSign size={12} /> Net Earnings
                        </p>
                        <p className="text-4xl font-black text-white">₱{parseFloat(summary?.total_earnings).toLocaleString()}</p>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                            <CreditCard size={12} /> Collected
                        </p>
                        <p className="text-4xl font-black text-white">₱{parseFloat(summary?.collected_earnings).toLocaleString()}</p>
                        <p className="text-zinc-600 text-[10px] mt-4 font-bold flex items-center gap-1 uppercase tracking-tight">
                            <CheckCircle2 size={10} /> Fully Settled
                        </p>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Clock size={12} /> Pending Cash
                        </p>
                        <p className="text-4xl font-black text-orange-500">₱{parseFloat(summary?.pending_earnings).toLocaleString()}</p>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity size={80} className="text-red-500" />
                        </div>
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-2 text-red-500/70">
                            Platform Debt
                        </p>
                        <p className="text-4xl font-black text-white">₱{parseFloat(summary?.pending_platform_debt).toLocaleString()}</p>
                        <div className="mt-4 flex flex-col gap-2">
                             <div className="flex items-center gap-2 text-red-400">
                                <span className="text-[10px] font-bold uppercase tracking-tighter italic">Required payment after 30 days</span>
                            </div>
                            {parseFloat(summary?.pending_platform_debt) > 0 && (
                                <button 
                                    onClick={() => {
                                        if(window.confirm(`Settle ₱${summary?.pending_platform_debt} in platform fees?`)) {
                                            axios.post(`${import.meta.env.VITE_API_URL}/organizer/settle-fees`, {}, { withCredentials: true })
                                                .then(() => fetchFinancials())
                                                .catch(() => alert("Failed to settle fees"));
                                        }
                                    }}
                                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg transition-all shadow-lg shadow-red-900/20 uppercase"
                                >
                                    Settle Now
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Transitions Table */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 italic">
                            <Calendar className="text-blue-500" /> Recent Transactions
                        </h2>
                        <input 
                            type="text"
                            placeholder="Search event or client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-widest bg-zinc-950/30">
                                    <th className="px-8 py-4">Transaction ID</th>
                                    <th className="px-8 py-4">Event</th>
                                    <th className="px-8 py-4">Client</th>
                                    <th className="px-8 py-4">Gross Amt</th>
                                    <th className="px-8 py-4">Fee Status</th>
                                    <th className="px-8 py-4">Your Net</th>
                                    <th className="px-8 py-4">Method</th>
                                    <th className="px-8 py-4">Status</th>
                                    <th className="px-8 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {transactions.length > 0 ? transactions
                                    .filter(t => 
                                        t.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        t.user_name.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((t) => (
                                    <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors group">
                                        <td className="px-8 py-5 text-zinc-500 font-mono text-[10px] uppercase">{t.id.split('-')[0]}...</td>
                                        <td className="px-8 py-5">
                                            <p className="text-white font-bold text-sm leading-tight">{t.event_title}</p>
                                            <p className="text-zinc-600 text-[10px] uppercase font-black tracking-tighter">{new Date(t.purchased_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-zinc-300">{t.user_name}</td>
                                        <td className="px-8 py-5 text-sm font-bold text-zinc-400">₱{parseFloat(t.total_price).toFixed(2)}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${t.platform_fee_status === 'Paid' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    ₱{parseFloat(t.platform_fee).toFixed(2)} {t.platform_fee_status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-black text-emerald-400">₱{parseFloat(t.organizer_revenue).toFixed(2)}</td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${
                                                t.payment_method === 'GCash' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-zinc-700/10 text-zinc-400 border-zinc-700/20'
                                            }`}>
                                                {t.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${t.payment_status === 'Paid' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500 animate-pulse'}`}></div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${t.payment_status === 'Paid' ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                    {t.payment_status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {t.payment_status === 'Pending' && (
                                                <button 
                                                    onClick={() => confirmPayment(t.id)}
                                                    className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
                                                >
                                                    CONFIRM CASH
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="9" className="px-8 py-20 text-center text-zinc-600 font-medium italic">
                                            {searchTerm ? `No transactions match "${searchTerm}".` : 'No transactions found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between px-4">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Billing records are updated in real-time.</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">© 2026 EventHub Pay</p>
                </div>
            </div>

            {/* Platform Fee Modal */}
            <PlatformFeeModal 
                isOpen={isFeeModalOpen}
                onClose={() => {
                    setIsFeeModalOpen(false);
                    setPendingRegData(null);
                }}
                onConfirm={(feeStatus) => {
                    if (pendingRegData) {
                        confirmPayment(pendingRegData.id, feeStatus);
                    }
                }}
                attendeeName={pendingRegData?.name}
            />
        </div>
    );
}
