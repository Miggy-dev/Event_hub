import React, { useState } from 'react';
import axios from 'axios';

const OrganizerDebtBlock = ({ totalOwed, onSettle }) => {
    const [isSettling, setIsSettling] = useState(false);
    const [message, setMessage] = useState('');

    const handleSettle = async () => {
        setIsSettling(true);
        setMessage('');
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/organizer/settle-fees`, {}, { withCredentials: true });
            if (response.data.success) {
                setMessage('Successfully settled all platform fees!');
                if (onSettle) onSettle();
            } else {
                setMessage('Failed to settle fees. Please try again.');
            }
        } catch (error) {
            console.error('Settlement error:', error);
            setMessage('An error occurred while settling fees.');
        } finally {
            setIsSettling(false);
        }
    };
    

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/90 backdrop-blur-lg p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-500/10">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
                    <p className="text-zinc-400 mb-6">
                        Your organizer account has been restricted due to platform fees that have been unpaid for more than 30 days.
                    </p>

                    <div className="w-full bg-zinc-800/50 rounded-xl p-4 mb-8">
                        <span className="text-sm text-zinc-500 uppercase tracking-wider font-semibold">Total Amount Owed</span>
                        <div className="text-4xl font-black text-red-500 mt-1">
                            ₱{parseFloat(totalOwed).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <button
                        onClick={handleSettle}
                        disabled={isSettling}
                        className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${
                            isSettling 
                            ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-[0.98]'
                        }`}
                    >
                        {isSettling ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </span>
                        ) : 'Settle Owed Fees Now'}
                    </button>

                    {message && (
                        <p className={`mt-4 text-sm ${message.includes('Success') ? 'text-green-500' : 'text-red-500'}`}>
                            {message}
                        </p>
                    )}
                    
                    <p className="mt-8 text-xs text-zinc-600">
                        Once paid, your access will be restored immediately. For GCash payments, please coordinate with the Super Admin for manual verification if automatic detection fails.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OrganizerDebtBlock;
