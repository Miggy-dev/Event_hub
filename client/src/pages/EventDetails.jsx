import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Star, MapPin, Calendar, Clock, Users, Image, AlertCircle, CheckCircle2, Lock, Eye, Search } from 'lucide-react';

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
    const [userRegistration, setUserRegistration] = useState(null);
    const [userRating, setUserRating] = useState(null);
    const [userComment, setUserComment] = useState('');
    const [reviews, setReviews] = useState([]);
    const [submittingRating, setSubmittingRating] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImg, setLightboxImg] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/events/${id}`, { withCredentials: true });
                if (res.data.success) {
                    setEvent(res.data.event);
                    setTickets(res.data.tickets || []);
                    if (res.data.tickets?.length > 0) {
                        setSelectedTicket(res.data.tickets[0].id);
                    }
                    if (res.data.userRegistration) {
                        setUserRegistration(res.data.userRegistration);
                    } else {
                        setUserRegistration(null);
                    }
                    
                    if (res.data.userRating !== null) {
                        setUserRating(res.data.userRating);
                    }
                    if (res.data.userComment) {
                        setUserComment(res.data.userComment);
                    }
                    if (res.data.reviews) {
                        setReviews(res.data.reviews);
                    }
                    setIsAdmin(res.data.isAdmin || false);
                    setUserName(res.data.userName || '');
                }
            } catch (err) {
                setError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        if (/Mobile|Android|iP(hone|od|ad)/i.test(ua)) return 'Mobile Device';
        if (/Windows/i.test(ua)) return 'Windows Desktop';
        if (/Mac/i.test(ua)) return 'Mac Desktop';
        if (/Linux/i.test(ua)) return 'Linux Desktop';
        return 'Unknown Device';
    };

    const handleRegister = async () => {
        if (tickets.length > 0 && !selectedTicket) {
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
                quantity: parseInt(quantity),
                device_info: getDeviceInfo()
            }, { withCredentials: true });

            if (res.data.success) {
                setSuccess('Registration successful! Redirecting to your dashboard in 3 seconds...');
                setTimeout(() => navigate('/dashboard'), 3000);
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


    const handleRateEvent = async (ratingValue) => {
        if (submittingRating) return;
        setSubmittingRating(true);
        setError('');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/events/${id}/rate`, { 
                rating: ratingValue, 
                comment: userComment 
            }, { withCredentials: true });
            
            if (res.data.success) {
                setUserRating(ratingValue);
                setSuccess('Thank you for your review!');
                // Refetch details to get updated average and community list
                const details = await axios.get(`${import.meta.env.VITE_API_URL}/events/${id}`, { withCredentials: true });
                if (details.data.success) {
                    setEvent(details.data.event);
                    setReviews(details.data.reviews);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit rating.');
        } finally {
            setSubmittingRating(false);
        }
    };

    const handleAddToCalendar = () => {
        if (!event) return;
        const startDate = new Date(event.date);
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

        const formatDate = (date) => {
            return date.toISOString().replace(/-|:|\.\d+/g, '');
        };

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `DTSTART:${formatDate(startDate)}`,
            `DTEND:${formatDate(endDate)}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description || ''}`,
            `LOCATION:${event.location}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="text-center py-20 text-zinc-500">Loading experience...</div>;
    if (!event) return <div className="text-center py-20 text-red-400">Event not found.</div>;

    const eventDate = new Date(event.date);
    let additionalImages = [];
    try {
        additionalImages = typeof event.additional_images === 'string' 
            ? JSON.parse(event.additional_images) 
            : event.additional_images || [];
    } catch {
        additionalImages = [];
    }

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
                                <Image size={48} className="opacity-20" />
                            </div>
                        )}
                        <div className="absolute top-6 left-6 bg-zinc-900/90 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold text-zinc-100 shadow-sm flex items-center gap-2 border border-zinc-700">
                            <Calendar size={16} className="text-[#ffdd95]" /> 
                            {eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>

                    <div className="p-8 lg:p-12">
                        <h1 className="text-4xl font-extrabold text-white mb-2">{event.title}</h1>
                        <div className="flex items-center gap-2 mb-6 cursor-default">
                            <span className="text-yellow-400 text-xl font-bold flex items-center gap-1.5">
                                <Star size={20} className="fill-yellow-400" /> {event.average_rating > 0 ? parseFloat(event.average_rating).toFixed(1) : 'No ratings yet'}
                            </span>
                            {event.review_count > 0 && <span className="text-zinc-500 text-sm font-medium">({event.review_count} reviews)</span>}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-6 mb-10 text-zinc-400">
                            <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
                                <MapPin size={16} className="text-zinc-500" /> 
                                <span className="font-medium">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
                                <Clock size={16} className="text-zinc-500" /> 
                                <span className="font-medium">
                                    {eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
                                <Users size={16} className="text-zinc-500" /> 
                                <span className="font-medium">{event.capacity} Capacity</span>
                            </div>
                        </div>

                        <div className="prose prose-invert prose-zinc max-w-none">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white mb-0">About this Event</h3>
                                <button 
                                    onClick={handleAddToCalendar}
                                    className="flex items-center gap-2 text-xs font-bold text-[#ffdd95] hover:text-white transition-colors bg-[#ffdd95]/10 px-3 py-1.5 rounded-lg border border-[#ffdd95]/20 hover:bg-[#ffdd95]/20"
                                >
                                    <Calendar size={14} /> Add to Calendar
                                </button>
                            </div>
                            <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                {event.description || 'No description provided.'}
                            </p>
                        </div>
                        
                        {additionalImages.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-zinc-800">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Image size={24} className="text-[#ffdd95]" /> Gallery Highlights
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {additionalImages.map((img, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => { setLightboxImg(img); setLightboxOpen(true); }}
                                            className="relative rounded-2xl overflow-hidden shadow-xl border border-zinc-800 bg-zinc-900 group aspect-video cursor-pointer"
                                        >
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center pointer-events-none">
                                                <span className="bg-zinc-900/80 text-white p-2 rounded-full backdrop-blur-sm shadow-md">
                                                    <Search size={20} />
                                                </span>
                                            </div>
                                            <img 
                                                src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL}/uploads/${img}`} 
                                                alt={`Gallery ${idx + 1}`} 
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Unified Ratings & Reviews Section - "Play Store" Style */}
                        <div className="mt-16 pt-12 border-t border-zinc-800">
                            <h3 className="text-2xl font-bold text-white mb-8">Ratings & reviews</h3>
                            
                            {/* Review Summary Header */}
                            <div className="flex flex-col sm:flex-row items-center gap-8 mb-12 bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800/50">
                                <div className="text-center sm:pr-8 sm:border-r sm:border-zinc-800">
                                    <div className="text-6xl font-black text-white mb-2">{event.average_rating > 0 ? parseFloat(event.average_rating).toFixed(1) : '0.0'}</div>
                                    <div className="flex text-yellow-500 text-sm justify-center mb-1 gap-0.5">
                                        {[1,2,3,4,5].map(s => (
                                            <Star key={s} size={14} className={event.average_rating >= s ? 'fill-yellow-500' : 'text-zinc-800'} />
                                        ))}
                                    </div>
                                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{event.review_count} REVIEWS</div>
                                </div>
                                <div className="flex-1 w-full space-y-2">
                                    {[5,4,3,2,1].map(num => (
                                        <div key={num} className="flex items-center gap-3">
                                            <span className="text-zinc-500 text-[10px] font-bold w-2">{num}</span>
                                            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-yellow-500/80 rounded-full" 
                                                    style={{ width: `${event.review_count > 0 ? (reviews.filter(r => r.rating === num).length / reviews.length * 100) : 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* "Rate this event" - Expandable Form */}
                            <div className="mb-12">
                                {(!userRegistration) ? (
                                    <div className="bg-zinc-800/20 border border-zinc-800 rounded-2xl p-6 text-center">
                                        <p className="text-zinc-400 text-sm">Only attendees can rate this event. Register now to share your experience later!</p>
                                    </div>
                                ) : !isEditing && !userRating ? (
                                    <div className="flex flex-col items-center py-4">
                                        <p className="text-white font-bold mb-2">Rate this event</p>
                                        <p className="text-zinc-500 text-xs mb-4">Tell others what you think</p>
                                        <div className="flex gap-4 mt-2">
                                            {[1,2,3,4,5].map(star => (
                                                <button 
                                                    key={star}
                                                    onClick={() => { setUserRating(star); setIsEditing(true); }}
                                                    className="text-zinc-700 hover:text-yellow-400 hover:scale-110 transition-all"
                                                >
                                                    <Star size={36} fill="currentColor" strokeWidth={2} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (isEditing || userRating) ? (
                                    <div className="bg-zinc-800/20 border border-zinc-700/50 rounded-2xl p-6 mb-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-white border border-zinc-600">
                                                {userName?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{userName || 'You'}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Posting publicly</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 mb-6">
                                            {[1,2,3,4,5].map(star => (
                                                <button 
                                                    key={star}
                                                    onClick={() => setUserRating(star)}
                                                    className={`transition-all ${userRating >= star ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]' : 'text-zinc-700 hover:text-zinc-600'}`}
                                                >
                                                    <Star size={32} fill={userRating >= star ? 'currentColor' : 'none'} strokeWidth={2} />
                                                </button>
                                            ))}
                                        </div>

                                        <textarea 
                                            value={userComment}
                                            onChange={(e) => setUserComment(e.target.value)}
                                            placeholder="Describe your experience (optional)"
                                            className="w-full bg-transparent border-b border-zinc-700 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400 transition-colors resize-none mb-6"
                                        />

                                        <div className="flex justify-end gap-3">
                                            <button 
                                                onClick={() => { setIsEditing(false); if(!userRating) setUserComment(''); }}
                                                className="px-4 py-2 text-sm font-bold text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={() => { handleRateEvent(userRating); setIsEditing(false); }}
                                                disabled={submittingRating || !userRating}
                                                className="px-6 py-2 text-sm font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 disabled:opacity-50 transition-all shadow-lg"
                                            >
                                                {submittingRating ? 'Posting...' : 'Post'}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {/* Community Reviews List */}
                            <div className="space-y-10">
                                {/* Your Review - Shown at top if exists */}
                                {userRating && !isEditing && (
                                    <div className="bg-zinc-800/10 border border-zinc-800/50 rounded-2xl p-6 relative group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center font-black text-xs">
                                                    YOU
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">Your Review</p>
                                                    <div className="flex text-yellow-500 gap-0.5 mt-1">
                                                        {[1,2,3,4,5].map(s => (
                                                            <Star key={s} size={10} className={userRating >= s ? 'fill-yellow-500' : 'text-zinc-800'} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                className="text-xs font-bold text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <p className="text-zinc-300 text-sm italic">"{userComment || 'No written feedback provided.'}"</p>
                                    </div>
                                )}

                                {/* Other Reviews */}
                                {reviews.filter(r => r.user_name !== userName).length > 0 ? (
                                    <div className="space-y-10">
                                        {reviews.filter(r => r.user_name !== userName).map((rev, idx) => (
                                            <div key={idx} className="animate-fadeIn">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center font-bold text-zinc-500 border border-zinc-700 text-xs">
                                                        {rev.user_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{rev.user_name}</p>
                                                        <div className="flex text-yellow-500 gap-1 mt-1">
                                                            {[1,2,3,4,5].map(s => (
                                                                <Star key={s} size={8} className={rev.rating >= s ? 'fill-yellow-500 opacity-100' : 'opacity-20'} />
                                                            ))}
                                                            <span className="ml-2 text-zinc-500 font-medium uppercase tracking-tighter">
                                                                {new Date(rev.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-zinc-400 text-sm leading-relaxed pl-11">
                                                    {rev.comment || 'No written feedback provided.'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : !userRating && (
                                    <div className="text-center py-10 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800 text-zinc-600 italic text-sm">
                                        No community reviews yet. Be the first to share your experience!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Checkout / Ticketing Side */}
                <div className="lg:w-1/3 bg-zinc-800 border-l border-zinc-700 p-8 lg:p-10 flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-8">Secure Your Spot</h3>
                    
                    {error && (
                        <div className="mb-6 bg-red-950/30 border border-red-900/50 text-red-400 px-4 py-4 rounded-2xl text-sm font-bold flex items-center gap-2 animate-fadeIn">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 bg-green-950/30 border border-green-900/50 text-green-400 px-4 py-4 rounded-2xl text-sm font-bold flex items-center gap-2 animate-fadeIn shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                            <CheckCircle2 size={18} /> {success}
                        </div>
                    )}

                    {userRegistration ? (
                        <div className="flex flex-col h-full justify-between">
                            <div className="bg-green-950/20 border border-green-900/30 rounded-2xl p-6 text-center shadow-lg">
                                <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h4 className="text-xl font-bold text-white mb-2">You're going!</h4>
                                <p className="text-zinc-400 text-sm mb-6">
                                    You have {userRegistration.quantity} ticket{userRegistration.quantity > 1 ? 's' : ''} for this event. 
                                </p>
                                <button 
                                    onClick={() => navigate('/dashboard')}
                                    className="w-full bg-zinc-800 text-white font-bold py-3.5 rounded-xl hover:bg-zinc-700 border border-zinc-700 transition-colors mb-2"
                                >
                                    View in Dashboard
                                </button>
                                <button 
                                    onClick={handleAddToCalendar}
                                    className="w-full bg-[#ffdd95]/10 text-[#ffdd95] font-bold py-3.5 rounded-xl hover:bg-[#ffdd95]/20 border border-[#ffdd95]/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Calendar size={18} /> Add to Calendar
                                </button>
                                <p className="text-[10px] text-zinc-500 mt-4">
                                    To manage or cancel your registration, please visit your tickets page.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
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
                                                        <span>₱{parseFloat(ticket.price).toFixed(2)}</span>
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
                                            <span>₱{(parseFloat(tickets.find(t => t.id === selectedTicket)?.price || 0) * quantity).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-medium text-zinc-400 mb-4 pb-4 border-b border-zinc-700">
                                            <span>Platform Fee</span>
                                            <span>₱2.50</span>
                                        </div>
                                        <div className="flex justify-between items-center font-bold text-lg text-white">
                                            <span>Total</span>
                                            <span>₱{((parseFloat(tickets.find(t => t.id === selectedTicket)?.price || 0) * quantity) + 2.50).toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={handleRegister}
                                    disabled={registering || (tickets.length > 0 && !selectedTicket) || new Date(event.date) < new Date()}
                                    className="w-full bg-white text-zinc-950 font-bold text-lg py-5 rounded-xl hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:shadow-none transition-all mt-8 shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {registering ? 'Processing...' : new Date(event.date) < new Date() ? 'Event Ended' : tickets.length > 0 ? 'Checkout & Register' : 'Register for Free'}
                                </button>
                            </div>

                            <p className="text-center text-xs text-zinc-500 mt-4 font-medium flex items-center justify-center gap-2">
                                <Lock size={12} className="text-zinc-600" /> Secure 1-click checkout
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Lightbox Modal */}
            {lightboxOpen && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setLightboxOpen(false)}
                >
                    <button className="absolute top-6 right-8 text-white/50 hover:text-white text-4xl font-light">&times;</button>
                    <img 
                        src={lightboxImg.startsWith('http') ? lightboxImg : `${import.meta.env.VITE_API_URL}/uploads/${lightboxImg}`} 
                        alt="Enlarged gallery view" 
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.6)] cursor-default border border-zinc-800"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
