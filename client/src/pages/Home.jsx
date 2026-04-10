import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Star, MapPin, Calendar, Clock, Ticket, Users, Image as ImageIcon, Plus, Map } from 'lucide-react';

export default function Home() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [myEvents, setMyEvents] = useState([]);


    // Split events into top 10 (Carousel) mathematically scored by Top Average Rating
    // Requirement: Only upcoming events that have at least one rating
    const topEvents = useMemo(() => {
        const now = new Date();
        return [...events]
            .filter(event => {
                const isUpcoming = new Date(event.date) >= now;
                const hasRating = (event.average_rating || 0) > 0;
                return isUpcoming && hasRating;
            })
            .sort((a, b) => {
                if (b.average_rating !== a.average_rating) {
                    return b.average_rating - a.average_rating; // Highest rating first
                }
                return (b.review_count || 0) - (a.review_count || 0); // Tie breaker: most reviews
            })
            .slice(0, 10); // Take Top 10 Highest Rated
    }, [events]);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/get-session`, { withCredentials: true });
                if (res.data.session) {
                    setUser(res.data.user);
                }
            } catch (error) {
                console.error('Session check failed', error);
            }
        };

        const fetchEvents = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/events`);
                if (res.data.success) {
                    // Only show published events
                    setEvents(res.data.events.filter(e => e.status === 'Published'));
                }
            } catch (error) {
                console.error("Failed to fetch events", error);
            } finally {
                setLoading(false);
            }
        };

        checkSession();
        fetchEvents();
    }, []);

    // Fetch organizer's created events if user is Admin
    useEffect(() => {
        if (!user || user.roleName !== 'Admin') return;
        const fetchMyEvents = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/my-created-events`, { withCredentials: true });
                if (res.data.success) setMyEvents(res.data.events);
            } catch (error) {
                console.error('Failed to fetch my events', error);
            }
        };
        fetchMyEvents();
    }, [user]);

    // Carousel auto-slide for logged-in users
    useEffect(() => {
        if (!user || events.length === 0) return;
        
        const topEventsCount = topEvents.length;
        if (topEventsCount <= 1) return;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % topEventsCount);
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(timer);
    }, [user, topEvents.length]);

    const filteredEvents = events.filter(e => 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Split events into upcoming and ended
    const { upcomingEvents, endedEvents } = useMemo(() => {
        const now = new Date();
        const upcoming = [];
        const ended = [];
        filteredEvents.forEach(event => {
            if (new Date(event.date) < now) {
                ended.push(event);
            } else {
                upcoming.push(event);
            }
        });
        return { upcomingEvents: upcoming, endedEvents: ended };
    }, [filteredEvents]);

    const handleAddToCalendar = (event) => {
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

    // --- RENDER FOR GUESTS (Original Layout) ---
    if (!user) {
        return (
            <div className="w-full">
                {/* Hero Section */}
                <div className="bg-zinc-900 border-b border-zinc-800 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 opacity-50"></div>
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                            Discover Your Next <span className="text-zinc-400">Unforgettable</span> Event
                        </h1>
                        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
                            From tech conferences to local music festivals, EventHub is your ultimate destination 
                            to find, book, and experience something new.
                        </p>
                        
                        <div className="bg-zinc-800 p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row max-w-2xl mx-auto transition-all hover:ring-2 hover:ring-zinc-700">
                            <input 
                                type="text"
                                placeholder="Search by event name or location..." 
                                className="flex-1 px-5 py-4 text-base bg-transparent border-none focus:ring-0 text-white placeholder-zinc-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button className="bg-white text-zinc-950 font-bold px-8 py-3 rounded-xl m-1 hover:bg-zinc-200 transition-colors shadow-lg">
                                Find Events
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-white">Upcoming Events</h2>
                            <p className="text-zinc-400 mt-2">Explore what's happening near you.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {[1, 2, 3, 4].map(n => (
                                <div key={n} className="bg-zinc-900 rounded-2xl h-80 animate-pulse border border-zinc-800"></div>
                            ))}
                        </div>
                    ) : upcomingEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {upcomingEvents.map(event => (
                                <Link to={`/event/${event.id}`} key={event.id} className="group flex flex-col bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 overflow-hidden hover:shadow-2xl hover:border-zinc-700 transition-all">
                                    <div className="h-48 w-full bg-zinc-800 overflow-hidden relative">
                                        <img 
                                            src={event.image_url ? 
                                                (event.image_url.startsWith('http') ? event.image_url : `${import.meta.env.VITE_API_URL}/uploads/${event.image_url}`) : 
                                                'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'} 
                                            alt={event.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                                        />
                                        <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-zinc-100 shadow-sm border border-zinc-800">
                                            {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                        {parseInt(event.ticket_tier_count) > 0 && parseInt(event.total_available_tickets) === 0 && (
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                                                <span className="bg-red-600 text-white font-black text-sm px-4 py-2 rounded-lg rotate-[-12deg] shadow-2xl border-2 border-red-500 tracking-tighter uppercase">FULLY BOOKED</span>
                                            </div>
                                        )}
                                        {parseInt(event.ticket_tier_count) === 0 && (
                                            <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-tighter z-10 border border-green-400">
                                                FREE
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold text-white mb-2 truncate group-hover:text-zinc-300 transition-colors">{event.title}</h3>
                                        <div className="flex items-center gap-3 text-sm text-zinc-400 mb-4">
                                            <span className="flex items-center gap-1.5 text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded text-xs border border-yellow-400/20">
                                                <Star size={12} className="fill-yellow-400" /> {event.average_rating > 0 ? `${parseFloat(event.average_rating).toFixed(1)} (${event.review_count})` : 'No ratings yet'}
                                            </span>
                                            <span className="truncate flex items-center gap-1">
                                                <MapPin size={12} /> {event.location}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-400 line-clamp-2 flex-1 mb-6">
                                            {event.description}
                                        </p>
                                        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                                            <span className="font-semibold text-zinc-300">
                                                {event.capacity} total seats
                                            </span>
                                            <span className="text-white font-medium text-sm bg-zinc-800 group-hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                                                View Details →
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
                            <div className="flex justify-center mb-4">
                                <Map size={48} className="text-zinc-700" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">No upcoming events</h3>
                            <p className="text-zinc-500">We couldn't find any upcoming events matching your criteria.</p>
                        </div>
                    )}
                </div>

                {/* Event Ended Section - Guest */}
                {!loading && endedEvents.length > 0 && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-white">Event Ended</h2>
                                <p className="text-zinc-400 mt-2">These events have already taken place.</p>
                            </div>
                            <span className="text-sm text-zinc-500 font-medium">{endedEvents.length} event{endedEvents.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {endedEvents.map(event => (
                                <Link to={`/event/${event.id}`} key={`ended-${event.id}`} className="group flex flex-col bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800/50 overflow-hidden hover:shadow-xl hover:border-zinc-700 transition-all opacity-60 hover:opacity-90">
                                    <div className="h-48 w-full bg-zinc-800 overflow-hidden relative">
                                        <img 
                                            src={event.image_url ? 
                                                (event.image_url.startsWith('http') ? event.image_url : `${import.meta.env.VITE_API_URL}/uploads/${event.image_url}`) : 
                                                'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'} 
                                            alt={event.title}
                                            className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500"
                                        />
                                        <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-zinc-400 shadow-sm border border-zinc-800">
                                            {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="absolute top-4 right-4 bg-zinc-950/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-zinc-500 border border-zinc-800">
                                            Ended
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold text-zinc-300 mb-2 truncate group-hover:text-white transition-colors">{event.title}</h3>
                                        <div className="flex items-center text-sm text-zinc-500 mb-4">
                                            <span className="flex items-center gap-1">
                                                <MapPin size={12} /> {event.location}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-500 line-clamp-2 flex-1 mb-6">
                                            {event.description}
                                        </p>
                                        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                                            <span className="font-semibold text-zinc-500">
                                                {event.capacity} total seats
                                            </span>
                                            <span className="text-zinc-400 font-medium text-sm bg-zinc-800/50 px-3 py-1.5 rounded-lg">
                                                View Details →
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }    // --- RENDER FOR LOGGED-IN USERS (AniWatch Style) ---
    
    const trendingEvents = []; 
    const activeEvent = topEvents[currentSlide] || topEvents[0] || {};

    return (
        <div className="w-full bg-[#0f1115] min-h-screen text-zinc-200">
            {/* Top Events Carousel (AniWatch Hero Style) */}
            {loading ? (
                <div className="w-full h-[500px] bg-zinc-900 animate-pulse"></div>
            ) : topEvents.length > 0 ? (
                <div className="relative w-full h-[500px] lg:h-[600px] overflow-hidden bg-black group">
                    {/* Background Image with Fade */}
                    <div className="absolute inset-0 z-0">
                        <img 
                            src={activeEvent.image_url ? 
                                (activeEvent.image_url.startsWith('http') ? activeEvent.image_url : `${import.meta.env.VITE_API_URL}/uploads/${activeEvent.image_url}`) : 
                                'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'} 
                            alt={activeEvent.title}
                            className={`w-full h-full object-cover transition-opacity duration-1000 ${loading ? 'opacity-0' : 'opacity-60 xl:opacity-100 xl:object-right xl:w-3/4 xl:ml-auto'}`}
                        />
                        {/* Gradient overlays to blend the image into the dark background */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/80 to-transparent xl:bg-gradient-to-r xl:from-[#0f1115] xl:via-[#0f1115]/90 xl:to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f1115] to-transparent z-10"></div>
                    </div>

                    {/* Hero Content */}
                    <div className="relative z-20 w-full max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end xl:justify-center pb-16 xl:pb-0">
                        <div className="max-w-2xl space-y-4 animate-fadeIn">
                            {/* Rank Badge */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-[#ffdd95] text-black font-extrabold px-2 py-0.5 rounded text-sm uppercase tracking-wider">
                                    #{currentSlide + 1} Spotlight
                                </span>
                            </div>
                            
                            {/* Title */}
                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-lg line-clamp-2">
                                {activeEvent.title}
                            </h1>
                            
                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-3 text-sm font-medium mt-4">
                                <div className="flex items-center gap-1.5 text-yellow-400 font-bold bg-yellow-400/10 px-2.5 py-1 rounded border border-yellow-400/20">
                                    <Star size={14} className="fill-yellow-400" /> {activeEvent.average_rating > 0 ? `${parseFloat(activeEvent.average_rating).toFixed(1)} (${activeEvent.review_count} reviews)` : 'No ratings yet'}
                                </div>
                                <span className="text-zinc-600">•</span>
                                <div className="flex items-center gap-1.5 text-zinc-300 py-1">
                                    <MapPin size={14} className="text-[#ffdd95]" /> {activeEvent.location}
                                </div>
                                <span className="text-zinc-600">•</span>
                                <div className="flex items-center gap-1.5 text-zinc-300 py-1">
                                    <Calendar size={14} className="text-[#ffdd95]" /> {new Date(activeEvent.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded text-white flex items-center gap-2">
                                    <Users size={12} className="text-zinc-400" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] uppercase tracking-wider text-zinc-400 leading-none">Total Seats</span>
                                        <span className="leading-tight">{activeEvent.capacity}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Description */}
                            <p className="text-zinc-400 text-sm md:text-base line-clamp-3 md:line-clamp-4 max-w-xl leading-relaxed mt-4 drop-shadow-md">
                                {activeEvent.description || "No description provided."}
                            </p>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-4 mt-8 pt-4">
                                <Link 
                                    to={`/event/${activeEvent.id}`} 
                                    className="bg-[#ffdd95] hover:bg-[#ffc65c] text-black font-bold px-8 py-3.5 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                >
                                    <Ticket size={20} />
                                    View Event
                                </Link>
                                <button 
                                    onClick={() => handleAddToCalendar(activeEvent)}
                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold px-6 py-3.5 rounded-full flex items-center gap-2 transition-colors border border-white/10"
                                >
                                    <Calendar size={18} />
                                    Add to Calendar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Custom Nav Controls (Right Side) */}
                    <div className="absolute right-4 md:right-8 bottom-8 z-30 flex items-center gap-2">
                        {topEvents.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-8 bg-[#ffdd95]' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                    {/* Next/Prev Chevrons */}
                    <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 z-30 flex-col gap-2">
                        <button 
                            onClick={() => setCurrentSlide(prev => (prev === 0 ? topEvents.length - 1 : prev - 1))}
                            className="p-3 rounded-full bg-black/40 hover:bg-[#ffdd95] text-white hover:text-black backdrop-blur-sm border border-white/10 transition-all group"
                        >
                            <svg className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button 
                            onClick={() => setCurrentSlide(prev => (prev + 1) % topEvents.length)}
                            className="p-3 rounded-full bg-black/40 hover:bg-[#ffdd95] text-white hover:text-black backdrop-blur-sm border border-white/10 transition-all group"
                        >
                            <svg className="w-6 h-6 transform group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                </div>
            ) : null}

            {/* My Created Events - Organizer Only */}
            {user?.roleName === 'Admin' && myEvents.length > 0 && (() => {
                const now = new Date();
                const myUpcoming = myEvents.filter(e => new Date(e.date) >= now);
                const myEnded = myEvents.filter(e => new Date(e.date) < now);
                return (
                    <>
                        {/* Upcoming Created Events */}
                        {myUpcoming.length > 0 && (
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-[#ffdd95] text-black font-extrabold px-2 py-0.5 rounded text-xs uppercase tracking-wider">Organizer</span>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">My Created Events</h2>
                                    </div>
                                    <div className="h-0.5 flex-1 bg-gradient-to-r from-[#ffdd95]/30 to-transparent"></div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                    {myUpcoming.map((event) => (
                                        <Link 
                                            to={`/event/${event.id}`} 
                                            key={`my-${event.id}`} 
                                            className="group relative flex flex-col gap-3"
                                        >
                                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-[#ffdd95]/20">
                                                <img 
                                                    src={event.image_url ? 
                                                        (event.image_url.startsWith('http') ? event.image_url : `${import.meta.env.VITE_API_URL}/uploads/${event.image_url}`) : 
                                                        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'} 
                                                    alt={event.title}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"></div>
                                                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-sm z-10 border border-white/10">
                                                    {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </div>
                                                <div className="absolute top-2 right-2 bg-[#ffdd95]/90 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm z-10 uppercase tracking-wider">
                                                    Your Event
                                                </div>
                                                {parseInt(event.ticket_tier_count) > 0 && parseInt(event.total_available_tickets) === 0 && (
                                                    <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                                                        <span className="bg-red-600 text-white font-black text-[10px] px-2 py-1 rounded rotate-[-10deg] shadow-lg border border-red-500">FULLY BOOKED</span>
                                                    </div>
                                                )}
                                                {parseInt(event.ticket_tier_count) === 0 && (
                                                    <div className="absolute top-2 right-12 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm z-10 shadow-md">
                                                        FREE
                                                    </div>
                                                )}
                                                <div className={`absolute bottom-2 left-2 text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm z-10 ${
                                                    event.status === 'Published' ? 'bg-green-500/90 text-white' : 'bg-zinc-600/90 text-zinc-200'
                                                }`}>
                                                    {event.status}
                                                </div>
                                                <div className="absolute bottom-2 right-2 bg-[#ffdd95] text-black text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm z-10">
                                                    {event.capacity} SEATS
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-0"></div>
                                            </div>
                                            <div>
                                                <h3 className="text-[15px] font-bold text-white line-clamp-2 leading-tight group-hover:text-[#ffdd95] transition-colors">
                                                    {event.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1.5">
                                                    <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                                        <Star size={10} className="fill-yellow-500" /> {event.average_rating > 0 ? `${parseFloat(event.average_rating).toFixed(1)} (${event.review_count})` : 'No ratings yet'}
                                                    </span>
                                                    <span className="text-zinc-600">•</span>
                                                    <span className="truncate flex items-center gap-1">
                                                        <MapPin size={10} /> {event.location}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ended Created Events */}
                        {myEnded.length > 0 && (
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-zinc-700 text-zinc-300 font-extrabold px-2 py-0.5 rounded text-xs uppercase tracking-wider">Organizer</span>
                                        <Clock size={20} className="text-zinc-600" />
                                        <h2 className="text-2xl font-bold text-zinc-400 tracking-tight">My Ended Events</h2>
                                    </div>
                                    <div className="h-0.5 flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
                                    <span className="text-xs text-zinc-600 font-medium">{myEnded.length} event{myEnded.length !== 1 ? 's' : ''}</span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                    {myEnded.map((event) => (
                                        <Link 
                                            to={`/event/${event.id}`} 
                                            key={`my-ended-${event.id}`} 
                                            className="group relative flex flex-col gap-3 opacity-50 hover:opacity-80 transition-opacity"
                                        >
                                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-zinc-700/30">
                                                <img 
                                                    src={event.image_url ? 
                                                        (event.image_url.startsWith('http') ? event.image_url : `${import.meta.env.VITE_API_URL}/uploads/${event.image_url}`) : 
                                                        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'} 
                                                    alt={event.title}
                                                    className="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"></div>
                                                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-sm z-10 border border-white/10">
                                                    {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </div>
                                                <div className="absolute top-2 right-2 bg-zinc-950/90 backdrop-blur-sm text-zinc-500 text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm z-10 border border-zinc-800">
                                                    ENDED
                                                </div>
                                                <div className="absolute bottom-2 right-2 bg-zinc-700 text-zinc-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm z-10">
                                                    {event.capacity} SEATS
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-0"></div>
                                            </div>
                                            <div>
                                                <h3 className="text-[15px] font-bold text-zinc-400 line-clamp-2 leading-tight group-hover:text-zinc-200 transition-colors">
                                                    {event.title}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 mt-1.5">
                                                    <span className="truncate flex items-center gap-1">
                                                        <MapPin size={10} /> {event.location}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                );
            })()}

            {/* All Events Section (Upcoming Only) */}
            <div className="bg-[#15171e] w-full py-16 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-8">
                        <h2 className="text-2xl font-bold text-white tracking-tight">All Events</h2>
                        <div className="h-0.5 flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <div key={n} className="aspect-[3/4] bg-zinc-800 rounded-xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : upcomingEvents.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {upcomingEvents.map((event) => (
                                <Link 
                                    to={`/event/${event.id}`} 
                                    key={`all-${event.id}`} 
                                    className="group relative flex flex-col gap-3"
                                >
                                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800">
                                        <img 
                                            src={event.image_url ? 
                                                (event.image_url.startsWith('http') ? event.image_url : `${import.meta.env.VITE_API_URL}/uploads/${event.image_url}`) : 
                                                'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'} 
                                            alt={event.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"></div>
                                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-sm z-10 border border-white/10">
                                            {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                        {parseInt(event.ticket_tier_count) > 0 && parseInt(event.total_available_tickets) === 0 && (
                                            <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                                                <span className="bg-red-600 text-white font-black text-[10px] px-2 py-1 rounded rotate-[-10deg] shadow-lg border border-red-500">FULLY BOOKED</span>
                                            </div>
                                        )}
                                        {parseInt(event.ticket_tier_count) === 0 && (
                                            <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm z-10 shadow-md">
                                                FREE
                                            </div>
                                        )}
                                        <div className="absolute bottom-2 right-2 bg-[#ffdd95] text-black text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm z-10">
                                            {event.capacity} SEATS
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-0"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-bold text-white line-clamp-2 leading-tight group-hover:text-[#ffdd95] transition-colors">
                                            {event.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1.5">
                                            <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                                                <Star size={10} className="fill-yellow-500" /> {event.average_rating > 0 ? `${parseFloat(event.average_rating).toFixed(1)} (${event.review_count})` : 'No ratings yet'}
                                            </span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="truncate flex items-center gap-1">
                                                <MapPin size={10} /> {event.location}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-zinc-500 py-12 text-sm text-center">
                            No upcoming events found.
                        </div>
                    )}
                </div>
            </div>

            {/* Event Ended Section - Logged In */}
            {!loading && endedEvents.length > 0 && (
                <div className="bg-[#12141a] w-full py-16 border-t border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="flex items-center gap-2">
                                <Clock size={20} className="text-zinc-600" />
                                <h2 className="text-2xl font-bold text-zinc-400 tracking-tight">Event Ended</h2>
                            </div>
                            <div className="h-0.5 flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
                            <span className="text-xs text-zinc-600 font-medium">{endedEvents.length} event{endedEvents.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {endedEvents.map((event) => (
                                <Link 
                                    to={`/event/${event.id}`} 
                                    key={`ended-${event.id}`} 
                                    className="group relative flex flex-col gap-3 opacity-50 hover:opacity-80 transition-opacity"
                                >
                                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800">
                                        <img 
                                            src={event.image_url ? 
                                                (event.image_url.startsWith('http') ? event.image_url : `${import.meta.env.VITE_API_URL}/uploads/${event.image_url}`) : 
                                                'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80'} 
                                            alt={event.title}
                                            className="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"></div>
                                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-sm z-10 border border-white/10">
                                            {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="absolute top-2 right-2 bg-zinc-950/90 backdrop-blur-sm text-zinc-500 text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm z-10 border border-zinc-800">
                                            ENDED
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-0"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-bold text-zinc-400 line-clamp-2 leading-tight group-hover:text-zinc-200 transition-colors">
                                            {event.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1.5">
                                            <span className="flex items-center gap-1 text-yellow-500/70 font-bold bg-yellow-400/5 px-1.5 py-0.5 rounded border border-yellow-500/10">
                                                <Star size={10} className="fill-yellow-500/70" /> {event.average_rating > 0 ? `${parseFloat(event.average_rating).toFixed(1)} (${event.review_count})` : 'No ratings yet'}
                                            </span>
                                            <span className="text-zinc-700">•</span>
                                            <span className="truncate flex items-center gap-1">
                                                <MapPin size={10} /> {event.location}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}