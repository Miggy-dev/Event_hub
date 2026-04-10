import { useState, useEffect } from 'react';
import axios from 'axios';
import { Landmark, CreditCard, Clock, X } from 'lucide-react';

const PlatformFeeModal = ({ isOpen, onClose, onConfirm, attendeeName }) => {
    const [currentFee, setCurrentFee] = useState(2.00);

    useEffect(() => {
        if (isOpen) {
            const fetchConfig = async () => {
                try {
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/platform/config`);
                    if (res.data.success) {
                        setCurrentFee(parseFloat(res.data.config.platform_fee));
                    }
                } catch (error) {
                    console.error("Error fetching fee config", error);
                }
            };
            fetchConfig();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Modal */}
            <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden animate-fadeIn">
                <div className="absolute top-4 right-4">
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                            <Landmark size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Platform Fee Handler</h2>
                            <p className="text-zinc-500 text-xs font-medium">Attendee: <span className="text-zinc-300">{attendeeName}</span></p>
                        </div>
                    </div>

                    <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                        You are marking this registration as <span className="text-emerald-400 font-bold">Paid</span>. 
                        A platform fee of <span className="text-white font-bold">₱{currentFee.toFixed(2)}</span> is required. 
                        How would you like to handle this fee?
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => onConfirm('Paid')}
                            className="group flex items-center gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all text-left"
                        >
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Pay ₱{currentFee.toFixed(2)} Now</p>
                                <p className="text-emerald-500/60 text-[10px] font-black uppercase tracking-widest">Settle immediately</p>
                            </div>
                        </button>

                        <button
                            onClick={() => onConfirm('Pending')}
                            className="group flex items-center gap-4 p-5 bg-zinc-800/50 border border-zinc-700 rounded-2xl hover:bg-zinc-800 hover:border-zinc-500 transition-all text-left"
                        >
                            <div className="w-10 h-10 bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 group-hover:scale-110 transition-transform">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-zinc-300 font-bold text-sm">Add to Platform Debt</p>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Pay later (Stacks in financials)</p>
                            </div>
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-800/50 flex justify-center">
                        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase tracking-widest transition-colors">
                            Wait, I'm not ready
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlatformFeeModal;
