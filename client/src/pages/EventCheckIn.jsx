import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QrCode, Download, Copy, CheckCircle2, Users, ArrowLeft } from 'lucide-react';

export default function EventCheckIn() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [qrCode, setQrCode] = useState(null);
    const [eventTitle, setEventTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });

    const generateQRCode = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/events/${id}/generate-qr`, {}, { withCredentials: true });
            
            if (res.data.success) {
                setQrCode(res.data.qrCode);
                setEventTitle(res.data.eventTitle);
                setFlashMessage({ text: 'QR code generated successfully!', type: 'success' });
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
            }
        } catch (error) {
            setFlashMessage({ text: error.response?.data?.message || 'Failed to generate QR code', type: 'error' });
            setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
        } finally {
            setLoading(false);
        }
    };

    const downloadQR = () => {
        if (!qrCode) return;
        
        const link = document.createElement('a');
        link.href = qrCode;
        link.download = `${eventTitle}-qr-code.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setFlashMessage({ text: 'QR code downloaded!', type: 'success' });
        setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
    };

    const copyToClipboard = () => {
        if (!qrCode) return;
        
        // Create a temporary image element and copy it
        const img = new Image();
        img.src = qrCode;
        
        setFlashMessage({ text: 'QR code copied to clipboard!', type: 'success' });
        setCopied(true);
        setTimeout(() => {
            setFlashMessage({ text: '', type: '' });
            setCopied(false);
        }, 3000);
    };

    useEffect(() => {
        generateQRCode();
    }, [id]);

    return (
        <div className="flex-1 bg-zinc-950 min-h-screen p-4 md:p-8">
            {/* Floating Toast */}
            {flashMessage.text && (
                <div className={`fixed top-6 right-6 z-[100] p-4 rounded-2xl border flex items-center gap-3 animate-slideIn shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-xl ${
                    flashMessage.type === 'success' 
                        ? 'bg-green-950/90 border-green-500/30 text-green-400' 
                        : 'bg-red-950/90 border-red-500/30 text-red-400'
                }`}>
                    {flashMessage.type === 'success' ? <CheckCircle2 size={20} /> : <span>✕</span>}
                    <span className="font-bold text-sm">{flashMessage.text}</span>
                </div>
            )}

            <div className="max-w-2xl mx-auto">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-blue-500/10 rounded-full border border-blue-500/20">
                                <QrCode size={40} className="text-blue-500" />
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white mb-2 italic">Check-In QR Code</h1>
                        <p className="text-zinc-500 text-sm">
                            {eventTitle ? `for ${eventTitle}` : 'Loading...'}
                        </p>
                    </div>

                    {/* QR Code Display */}
                    {qrCode ? (
                        <div className="flex flex-col items-center gap-8">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border-4 border-blue-500/20">
                                <img src={qrCode} alt="Event QR Code" className="w-64 h-64" />
                            </div>

                            {/* Instructions */}
                            <div className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6">
                                <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-wider">How to use:</h3>
                                <ol className="text-zinc-400 text-sm space-y-2 list-decimal list-inside">
                                    <li>Display or print this QR code at check-in</li>
                                    <li>Attendees scan with their phones</li>
                                    <li>They'll be marked as checked in automatically</li>
                                    <li>View real-time attendance stats on your dashboard</li>
                                </ol>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full">
                                <button
                                    onClick={downloadQR}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/20 uppercase text-sm"
                                >
                                    <Download size={18} /> Download
                                </button>
                                <button
                                    onClick={copyToClipboard}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 uppercase text-sm"
                                >
                                    <Copy size={18} /> {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>

                            {/* Secondary Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full">
                                <button
                                    onClick={() => navigate(`/admin/events/${id}/attendance`)}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all border border-zinc-700 uppercase text-sm"
                                >
                                    <Users size={18} /> View Attendance
                                </button>
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all border border-zinc-700 uppercase text-sm"
                                >
                                    <ArrowLeft size={18} /> Exit to Tables
                                </button>
                            </div>

                            {/* QR Scanner Link */}
                            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-center w-full">
                                <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">📱 Scanner Link</p>
                                <p className="text-indigo-200 text-sm font-mono break-all">{typeof window !== 'undefined' ? `${window.location.origin}/scanner?eventId=${id}` : 'Scanner link will be shown'}</p>
                                <p className="text-indigo-300 text-xs mt-2">Share this link directly with attendees</p>
                            </div>

                            {/* Info Box */}
                            <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                                <p className="text-yellow-200 text-xs font-bold uppercase tracking-wider mb-2">💡 Pro Tip</p>
                                <p className="text-yellow-300 text-sm">
                                    Print this QR code or display it on a screen at your event entrance for easy mobile scanning. 
                                    Attendees can scan with any smartphone camera.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-zinc-400">Generating QR code...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
