import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import jsQR from 'jsqr';

export default function EventScanner() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const eventIdFromUrl = searchParams.get('eventId');
    const [eventId, setEventId] = useState(eventIdFromUrl);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    
    const [hasCamera, setHasCamera] = useState(true);
    const [scanning, setScanning] = useState(!eventIdFromUrl);
    const [flashMessage, setFlashMessage] = useState({ text: '', type: '' });
    const [checkingIn, setCheckingIn] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [showManualInput, setShowManualInput] = useState(!!eventIdFromUrl);
    const [eventTitle, setEventTitle] = useState('');

    useEffect(() => {
        if (eventIdFromUrl) {
            setEventId(eventIdFromUrl);
            setShowManualInput(true);
            setScanning(false);
        }
    }, [eventIdFromUrl]);

    const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvasElement = canvasRef.current;
            const canvas = canvasElement.getContext('2d', { willReadFrequently: true });
            
            canvasElement.height = videoRef.current.videoHeight;
            canvasElement.width = videoRef.current.videoWidth;
            
            canvas.drawImage(videoRef.current, 0, 0, canvasElement.width, canvasElement.height);
            
            const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code) {
                console.log('Found QR code:', code.data);
                handleScanResult(code.data);
                return; // Stop ticking once found
            }
        }
        requestRef.current = requestAnimationFrame(tick);
    };

    const handleScanResult = (data) => {
        try {
            // Check if it's a URL
            if (data.startsWith('http')) {
                const url = new URL(data);
                const sParam = url.searchParams.get('eventId');
                if (sParam) {
                    setEventId(sParam);
                    setSearchParams({ eventId: sParam });
                    setShowManualInput(true);
                    setScanning(false);
                    setFlashMessage({ text: 'Event recognized! Enter your ID.', type: 'success' });
                    setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
                    return;
                }
            }
            
            // If it's a raw UUID or ID, try checking in directly
            // But based on user requirement, we usually go to manual input after scanning event QR
            // If the user scanned a TICKET QR, we could auto-check-in
            if (data.length > 20) { // Likely a UUID
                setManualInput(data.toUpperCase());
                setFlashMessage({ text: 'Ticket detected!', type: 'success' });
                // We'll let the user click Check In or we can trigger it
                // For now, let's just populate the input
                setShowManualInput(true);
                setScanning(false);
            }
        } catch (err) {
            console.error('Scan processing error:', err);
        }
        
        // Resume scanning if not handled
        if (!eventId) {
            requestRef.current = requestAnimationFrame(tick);
        }
    };

    useEffect(() => {
        if (eventIdFromUrl) return;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setScanning(true);
                    requestRef.current = requestAnimationFrame(tick);
                }
            } catch (error) {
                setHasCamera(false);
                setFlashMessage({ text: 'Camera access denied', type: 'error' });
            }
        };

        startCamera();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [eventIdFromUrl]);

    const handleCheckIn = async () => {
        if (checkingIn || !manualInput) {
            setFlashMessage({ text: 'Please enter your registration ID', type: 'error' });
            setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
            return;
        }
        
        setCheckingIn(true);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/registrations/${manualInput}/mobile-check-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            });

            const data = await res.json();

            if (data.success) {
                setFlashMessage({ 
                    text: `✓ ${data.attendeeName} checked in!`, 
                    type: 'success' 
                });
                setManualInput('');
                setTimeout(() => {
                    setFlashMessage({ text: '', type: '' });
                    if (!eventId) {
                        setShowManualInput(false);
                        setScanning(true);
                    }
                    setCheckingIn(false);
                }, 3000);
            } else {
                setFlashMessage({ 
                    text: data.message || 'Check-in failed', 
                    type: 'error' 
                });
                setCheckingIn(false);
                setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
            }
        } catch (error) {
            setFlashMessage({ 
                text: 'Check-in error', 
                type: 'error' 
            });
            setCheckingIn(false);
            setTimeout(() => setFlashMessage({ text: '', type: '' }), 3000);
        }
    };

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

            <div className="max-w-md mx-auto">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="bg-gradient-to-b from-blue-600 to-blue-700 p-6 flex flex-col items-center gap-3">
                        <Camera size={40} className="text-white" />
                        <h1 className="text-2xl font-black text-white italic">Event Check-In</h1>
                        <p className="text-blue-100 text-sm">{eventId ? 'Enter registration ID' : 'Scan your ticket QR code'}</p>
                    </div>

                    {/* Content Area */}
                    <div className="p-6">
                        {showManualInput ? (
                            <>
                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                                    <p className="text-green-300 font-bold text-sm">✓ QR Code scanned successfully!</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-white font-bold text-sm block mb-2">Registration ID (from your ticket)</label>
                                        <input
                                            type="text"
                                            value={manualInput}
                                            onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                                            placeholder="e.g., 31805743 or AC433AF8"
                                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-zinc-500 font-mono"
                                            onKeyPress={(e) => e.key === 'Enter' && handleCheckIn()}
                                            autoFocus
                                        />
                                        <p className="text-zinc-400 text-xs mt-2">
                                            💡 You'll find this in your confirmation email or ticket confirmation
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleCheckIn}
                                        disabled={checkingIn || !manualInput}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 uppercase text-sm"
                                    >
                                        <CheckCircle2 size={18} /> {checkingIn ? 'Checking In...' : 'Check In Now'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {hasCamera ? (
                                    <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                        <canvas
                                            ref={canvasRef}
                                            style={{ display: 'none' }}
                                        />

                                        {/* Scanning overlay */}
                                        {scanning && (
                                            <>
                                                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg m-4 animate-pulse"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="relative w-32 h-32">
                                                        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg"></div>
                                                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 bg-blue-500 h-1 w-12 animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="aspect-square bg-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                                        <AlertCircle size={48} className="text-red-400 mb-4" />
                                        <p className="text-white font-bold mb-2">Camera Access Denied</p>
                                        <p className="text-zinc-400 text-sm">
                                            Please enable camera permissions in your browser settings.
                                        </p>
                                    </div>
                                )}

                                {/* Info */}
                                <div className="mt-6 bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">📱 Instructions</p>
                                    <ul className="text-zinc-300 text-sm space-y-1">
                                        <li>• Position the QR code in the camera frame</li>
                                        <li>• This will automatically take you to check-in</li>
                                        <li>• Then enter your Registration ID</li>
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
