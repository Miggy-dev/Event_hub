import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ShieldCheck, 
    BarChart3, 
    Zap, 
    Layers, 
    Search,
    Download,
    Eye,
    Globe,
    PhilippinePeso,
    Activity
} from 'lucide-react';

export default function SuperAdminPayments() {
    const [summary, setSummary] = useState(null);
    const [payments, setPayments] = useState([]);
    const [config, setConfig] = useState({ platform_fee: '2.00' });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPayments = async () => {
        try {
            const [revRes, configRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/super/platform-revenue`, { withCredentials: true }),
                axios.get(`${import.meta.env.VITE_API_URL}/platform/config`)
            ]);
            
            if (revRes.data.success) {
                setSummary(revRes.data.summary);
                setPayments(revRes.data.payments);
            }
            if (configRes.data.success) {
                setConfig(configRes.data.config);
            }
        } catch (error) {
            console.error("Error fetching platform data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const filteredPayments = payments.filter(p => 
        p.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.organizer_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex-1 flex items-center justify-center bg-zinc-950 min-h-screen">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="flex-1 bg-zinc-950 min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
                            <ShieldCheck size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">Platform Vault</h1>
                            <p className="text-zinc-500 font-medium">Global payment monitoring and platform fee collection.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all">
                            <Download size={20} />
                        </button>
                        <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-900/40 hover:bg-indigo-700 transition-all flex items-center gap-2">
                             EXPORT DATA
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Zap size={160} />
                        </div>
                        <p className="text-indigo-100/60 text-[10px] font-black uppercase tracking-widest mb-2">Platform Revenue</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-indigo-200 text-2xl font-bold">₱</span>
                            <p className="text-5xl font-black text-white tracking-tighter decoration-4 decoration-indigo-300 underline-offset-8 underline">
                                {parseFloat(summary?.total_platform_earnings || 0).toLocaleString()}
                            </p>
                        </div>
                        <p className="text-indigo-100/40 text-[10px] mt-6 font-bold uppercase tracking-tight flex items-center gap-2">
                            <Globe size={12} /> Total Fees Collected
                        </p>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                <BarChart3 size={20} />
                            </div>
                        </div>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Collected Fees</p>
                        <p className="text-3xl font-black text-emerald-500 tracking-tight">₱{parseFloat(summary?.collected_platform_fees || 0).toLocaleString()}</p>
                        <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                            <span className="text-[10px] text-zinc-600 font-bold uppercase">Actual Revenue</span>
                            <span className="text-xs font-mono text-zinc-400 font-bold">GCash / Settled</span>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                                <Layers size={20} />
                            </div>
                        </div>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Pending Fees</p>
                        <p className="text-3xl font-black text-orange-500 tracking-tight">₱{parseFloat(summary?.pending_platform_fees || 0).toLocaleString()}</p>
                        <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                            <span className="text-[10px] text-zinc-600 font-bold uppercase">Receivable</span>
                            <span className="text-xs font-mono text-zinc-400 font-bold">P2P Pending</span>
                        </div>
                    </div>

                    <div className="bg-zinc-950 border-2 border-dashed border-zinc-800 p-8 rounded-[40px] flex flex-col items-center justify-center text-center">
                        <PhilippinePeso size={32} className="text-zinc-700 mb-2" />
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-tight">Current Platform Fee</p>
                        <p className="text-2xl font-black text-zinc-400 tracking-tighter">₱{parseFloat(config.platform_fee).toFixed(2)} / REG</p>
                    </div>
                </div>

                {/* Operations Table */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl">
                    <div className="p-10 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <h2 className="text-2xl font-black text-white flex items-center gap-4 italic uppercase tracking-tighter">
                            <Activity className="text-indigo-500" /> Transaction Ledger
                        </h2>
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input 
                                type="text"
                                placeholder="Search by Event or Organizer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-medium"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.1em] bg-zinc-950/40">
                                    <th className="px-10 py-5">Reference</th>
                                    <th className="px-10 py-5">Event Detail</th>
                                    <th className="px-10 py-5">Organizer</th>
                                    <th className="px-10 py-5">Gross Amount</th>
                                    <th className="px-10 py-5">Our Fee</th>
                                    <th className="px-10 py-5">Method</th>
                                    <th className="px-10 py-5">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40">
                                {filteredPayments.length > 0 ? filteredPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-indigo-500/[0.03] transition-colors group">
                                        <td className="px-10 py-6 text-zinc-500 font-mono text-[11px] uppercase">{(p.id || '').split('-')[0] || 'N/A'}...</td>
                                        <td className="px-10 py-6">
                                            <p className="text-white font-bold text-sm group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{p.event_title || 'Unknown Event'}</p>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-[10px] font-black uppercase">
                                                    {(p.organizer_name || 'U')[0]}
                                                </div>
                                                <p className="text-zinc-400 text-sm font-bold tracking-tight">{p.organizer_name || 'Unknown Organizer'}</p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-sm font-bold text-zinc-400 italic">₱{parseFloat(p.total_price || 0).toFixed(2)}</td>
                                        <td className="px-10 py-6">
                                            <div className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-2 border shadow-sm ${
                                                p.platform_fee_status === 'Paid' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                            }`}>
                                                 ₱{parseFloat(p.platform_fee).toFixed(2)} <span className="text-[8px] uppercase opacity-60">{p.platform_fee_status}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                                                p.payment_method === 'GCash' ? 'bg-blue-600/10 text-blue-500' : 'bg-zinc-800 text-zinc-500'
                                            }`}>
                                                {p.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-zinc-500 text-[10px] font-black uppercase tracking-tighter">
                                            {new Date(p.purchased_at).toLocaleString()}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="7" className="px-10 py-32 text-center text-zinc-700 font-bold uppercase tracking-widest animate-pulse">
                                            No payment records found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-3xl flex items-center gap-6 justify-center">
                    <Zap className="text-indigo-500" size={24} />
                    <p className="text-indigo-300 font-medium text-sm">
                        Fees are automatically split at the point of registration. No manual payouts required.
                    </p>
                </div>
            </div>
        </div>
    );
}
