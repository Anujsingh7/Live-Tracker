import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { updateLocation, getGroupLocations, deleteGroup } from '../utils/api';
import { getMemberId, getDisplayName } from '../utils/identity';
import Footer from './Footer';


// Fix for default marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Vibrant color palette for member markers
const MEMBER_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Turquoise
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
    '#F8B739', // Orange
    '#52C77D', // Green
    '#FF85A2', // Pink
    '#95E1D3', // Aqua
];

// Create custom marker icon with color and name
const createCustomMarker = (displayName, color, isCurrentUser = false) => {
    const markerSize = isCurrentUser ? 'large' : 'medium';
    const fontSize = isCurrentUser ? '13px' : '11px';
    const padding = isCurrentUser ? '8px 12px' : '6px 10px';
    const borderWidth = isCurrentUser ? '3px' : '2px';

    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                position: relative;
                transform: translate(-50%, -100%);
            ">
                <div style="
                    background: ${color};
                    border: ${borderWidth} solid white;
                    border-radius: 50%;
                    width: ${isCurrentUser ? '20px' : '16px'};
                    height: ${isCurrentUser ? '20px' : '16px'};
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 ${isCurrentUser ? '4px' : '2px'} ${color}40;
                    margin: 0 auto 4px auto;
                    animation: pulse 2s ease-in-out infinite;
                "></div>
                <div style="
                    background: ${color};
                    color: white;
                    padding: ${padding};
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: ${fontSize};
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    border: 2px solid white;
                    text-align: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                ">
                    ${displayName}${isCurrentUser ? ' 📍' : ''}
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                }
            </style>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    });
};

// Component to auto-fit map bounds with higher zoom for crowded areas
function AutoFitBounds({ locations }) {
    const map = useMap();

    useEffect(() => {
        if (locations.length > 0) {
            const bounds = L.latLngBounds(
                locations.map(loc => [loc.lat, loc.lng])
            );
            // Higher zoom levels for crowded area tracking (16-18)
            map.fitBounds(bounds, { padding: [80, 80], minZoom: 16, maxZoom: 18 });
        }
    }, [locations, map]);

    return null;
}

export default function GroupMap() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const memberId = getMemberId();
    const displayName = getDisplayName();

    const [locations, setLocations] = useState([]);
    const [myLocation, setMyLocation] = useState(null);
    const [refreshInterval, setRefreshInterval] = useState(30);
    const [rangeRadius, setRangeRadius] = useState(100); // Range circle radius in meters (default 100m)
    const [sharingEnabled, setSharingEnabled] = useState(true); // Location sharing toggle
    const [expiresAt, setExpiresAt] = useState(null); // Group expiry time
    const [permissionState, setPermissionState] = useState('pending'); // pending, granted, denied
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [groupInfo, setGroupInfo] = useState(null);
    const [showMemberList, setShowMemberList] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [geofenceAlerts, setGeofenceAlerts] = useState([]); // Track geofence alerts
    const [alertHistory, setAlertHistory] = useState(new Map()); // Track when alerts were sent
    const [notificationPermission, setNotificationPermission] = useState('default');


    const intervalRef = useRef(null);
    const watchIdRef = useRef(null);
    const mapRef = useRef(null);

    // Calculate distance between two points using Haversine formula (in meters)
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };

    // Helper function to format countdown timer
    const formatCountdown = (expiresAt) => {
        if (!expiresAt) return null;

        const now = currentTime;
        const expiry = new Date(expiresAt).getTime();
        const diff = expiry - now;

        if (diff <= 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    // Helper function to calculate relative time
    const getRelativeTime = (timestamp) => {
        const now = currentTime;
        const diff = Math.floor((now - new Date(timestamp).getTime()) / 1000); // difference in seconds

        if (diff < 5) return 'Just now';
        if (diff < 60) return `${diff} seconds ago`;
        if (diff < 120) return '1 minute ago';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 7200) return '1 hour ago';
        return `${Math.floor(diff / 3600)} hours ago`;
    };


    // Request geolocation permission and start watching position
    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setPermissionState('denied');
            setLoading(false);
            return;
        }

        // Watch position
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setMyLocation({ lat: latitude, lng: longitude });
                setPermissionState('granted');
                setLoading(false);

                // Send location to server only if sharing is enabled
                if (sharingEnabled) {
                    updateLocation(groupId, memberId, latitude, longitude, true).catch(err => {
                        console.error('Failed to update location:', err);
                    });
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                setPermissionState('denied');
                setLoading(false);

                if (err.code === err.PERMISSION_DENIED) {
                    setError('Location permission denied. Please enable location access to use this app.');
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    setError('Location information unavailable.');
                } else if (err.code === err.TIMEOUT) {
                    setError('Location request timed out.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [groupId, memberId, sharingEnabled]);

    // Update current time every second for relative time display
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);

            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    setNotificationPermission(permission);
                });
            }
        }
    }, []);

    // Cleanup all resources when component unmounts
    useEffect(() => {
        return () => {
            // Clear geolocation watch
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            // Clear location fetch interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);



    // Fetch group locations at intervals
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const { locations: groupLocations } = await getGroupLocations(groupId);
                setLocations(groupLocations);
            } catch (err) {
                console.error('Failed to fetch locations:', err);
                if (err.message.includes('not found')) {
                    setError('Group not found or expired. Redirecting...');
                    setTimeout(() => navigate('/'), 2000);
                }
            }
        };

        // Fetch immediately
        fetchLocations();

        // Set up interval
        intervalRef.current = setInterval(fetchLocations, refreshInterval * 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [groupId, refreshInterval, navigate]);

    // Fetch group info and set expiresAt
    useEffect(() => {
        const fetchGroupInfo = async () => {
            try {
                const { locations: groupLocations } = await getGroupLocations(groupId);
                // Get group info from join response (we'll store it in localStorage)
                const storedGroupInfo = localStorage.getItem(`group_${groupId}`);
                if (storedGroupInfo) {
                    const groupData = JSON.parse(storedGroupInfo);
                    setExpiresAt(groupData.expiresAt);
                }
            } catch (err) {
                console.error('Failed to fetch group info:', err);
            }
        };

        fetchGroupInfo();
    }, [groupId]);

    // Check for group expiry
    useEffect(() => {
        if (expiresAt) {
            const expiry = new Date(expiresAt).getTime();
            const now = currentTime;

            if (now >= expiry) {
                setError('This group has expired.');
                setTimeout(() => navigate('/'), 2000);
            }
        }
    }, [expiresAt, currentTime, navigate]);

    // Geofencing: Check if members are outside range
    useEffect(() => {
        if (!myLocation || locations.length === 0) return;

        const now = Date.now();
        const newAlerts = [];

        locations.forEach(location => {
            // Skip current user and paused members
            if (location.memberId === memberId || !location.sharingEnabled) return;

            const distance = calculateDistance(
                myLocation.lat,
                myLocation.lng,
                location.lat,
                location.lng
            );

            // Check if member is outside range
            if (distance > rangeRadius) {
                const lastAlertTime = alertHistory.get(location.memberId) || 0;
                const timeSinceLastAlert = now - lastAlertTime;

                // Only alert if it's been more than 2 minutes since last alert
                if (timeSinceLastAlert > 2 * 60 * 1000) {
                    newAlerts.push({
                        memberId: location.memberId,
                        displayName: location.displayName,
                        distance: Math.round(distance),
                        timestamp: now
                    });

                    // Update alert history
                    setAlertHistory(prev => {
                        const updated = new Map(prev);
                        updated.set(location.memberId, now);
                        return updated;
                    });

                    // Show browser notification
                    if (notificationPermission === 'granted') {
                        new Notification('⚠️ Geofence Alert', {
                            body: `${location.displayName} has left the tracking range! (${Math.round(distance)}m away)`,
                            icon: '/vite.svg',
                            tag: `geofence-${location.memberId}` // Prevents duplicate notifications
                        });
                    }
                }
            }
        });

        if (newAlerts.length > 0) {
            setGeofenceAlerts(prev => [...newAlerts, ...prev].slice(0, 5)); // Keep last 5 alerts
        }
    }, [locations, myLocation, rangeRadius, memberId, notificationPermission, alertHistory, calculateDistance]);

    const handleRefreshIntervalChange = (newInterval) => {
        setRefreshInterval(newInterval);
    };

    const copyGroupId = () => {
        navigator.clipboard.writeText(groupId);
        alert('Group ID copied to clipboard!');
    };

    const handleDeleteGroup = async () => {
        try {
            await deleteGroup(groupId);
            setShowDeleteModal(false);
            alert('Group deleted successfully!');
            navigate('/');
        } catch (err) {
            console.error('Failed to delete group:', err);
            alert('Failed to delete group. Please try again.');
        }
    };


    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="text-muted">Requesting location permission...</p>
                </div>
            </div>
        );
    }

    if (permissionState === 'denied') {
        return (
            <div className="page-container">
                <div className="glass-card" style={{ maxWidth: '500px' }}>
                    <div className="text-center">
                        <h2 style={{ marginBottom: 'var(--space-md)' }}>📍 Location Required</h2>
                        {error && (
                            <div className="alert alert-error mb-md">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}
                        <p className="text-muted mb-lg">
                            This app requires location access to share your position with your group.
                            Please enable location permissions in your browser settings and refresh the page.
                        </p>
                        <button className="btn btn-primary" onClick={() => window.location.reload()}>
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const defaultCenter = myLocation || { lat: 37.7749, lng: -122.4194 };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--glass-border)',
                padding: 'var(--space-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--space-sm)'
            }}>
                <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                    <h3 style={{ marginBottom: '0.25rem', fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                        Group: <span style={{
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>{groupId}</span>
                    </h3>
                    <p className="text-muted" style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', lineHeight: '1.4' }}>
                        {locations.length} member{locations.length !== 1 ? 's' : ''} active
                        {expiresAt && (
                            <span style={{ display: window.innerWidth < 480 ? 'block' : 'inline', marginLeft: window.innerWidth < 480 ? '0' : '0.5rem', marginTop: window.innerWidth < 480 ? '0.25rem' : '0' }}>
                                • Expires in: <span style={{
                                    color: formatCountdown(expiresAt) === 'Expired' ? '#ef4444' :
                                        (expiresAt && (new Date(expiresAt).getTime() - currentTime) < 5 * 60 * 1000) ? '#FFA500' : 'inherit',
                                    fontWeight: 600
                                }}>
                                    {formatCountdown(expiresAt)}
                                </span>
                            </span>
                        )}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        className={`btn ${sharingEnabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSharingEnabled(!sharingEnabled)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: sharingEnabled ? 'var(--gradient-primary)' : 'rgba(255, 165, 0, 0.2)',
                            border: sharingEnabled ? '1px solid var(--primary)' : '1px solid rgba(255, 165, 0, 0.3)',
                            color: sharingEnabled ? 'white' : '#FFA500'
                        }}
                    >
                        {sharingEnabled ? '📍 Sharing' : '⏸️ Paused'}
                    </button>

                    <button className="btn btn-secondary" onClick={copyGroupId} style={{ padding: '0.5rem 1rem' }}>
                        📋 Copy ID
                    </button>

                    <button
                        className="btn"
                        onClick={() => setShowDeleteModal(true)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444'
                        }}
                    >
                        🗑️ Delete
                    </button>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="text-muted" style={{ fontSize: '0.875rem', display: window.innerWidth < 480 ? 'none' : 'inline' }}>Refresh:</span>
                        {[10, 30, 60].map(interval => (
                            <button
                                key={interval}
                                className={`btn ${refreshInterval === interval ? 'btn-primary' : 'btn-secondary'} `}
                                onClick={() => handleRefreshIntervalChange(interval)}
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', minWidth: '50px' }}
                            >
                                {interval}s
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="text-muted" style={{ fontSize: '0.875rem', display: window.innerWidth < 480 ? 'none' : 'inline' }}>Range:</span>
                        {[100, 200, 300].map(radius => (
                            <button
                                key={radius}
                                className={`btn ${rangeRadius === radius ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setRangeRadius(radius)}
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', minWidth: '50px' }}
                            >
                                {radius}m
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Map */}
            <div style={{ flex: 1, position: 'relative' }}>
                {error && (
                    <div style={{ position: 'absolute', top: 'var(--space-md)', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, maxWidth: '90%' }}>
                        <div className="alert alert-error">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Geofence Alerts */}
                {geofenceAlerts.length > 0 && (
                    <div style={{ position: 'absolute', top: error ? '80px' : 'var(--space-md)', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, maxWidth: '90%', width: '400px' }}>
                        {geofenceAlerts.map((alert, index) => (
                            <div
                                key={`${alert.memberId}-${alert.timestamp}`}
                                className="alert"
                                style={{
                                    background: 'rgba(255, 165, 0, 0.95)',
                                    border: '1px solid rgba(255, 165, 0, 0.3)',
                                    marginBottom: index < geofenceAlerts.length - 1 ? '0.5rem' : 0,
                                    animation: 'slideDown 0.3s ease-out'
                                }}
                            >
                                <span>⚠️</span>
                                <span style={{ flex: 1 }}>
                                    <strong>{alert.displayName}</strong> left the range! ({alert.distance}m away)
                                </span>
                                <button
                                    onClick={() => setGeofenceAlerts(prev => prev.filter((_, i) => i !== index))}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        padding: '0 0.5rem'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Member List Sidebar */}
                <div style={{
                    position: 'absolute',
                    top: 'var(--space-md)',
                    right: showMemberList ? 'var(--space-md)' : '-320px',
                    width: '280px',
                    maxHeight: 'calc(100% - 2 * var(--space-md))',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-md)',
                    zIndex: 1000,
                    transition: 'right var(--transition-normal)',
                    boxShadow: 'var(--glass-shadow)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--space-md)',
                        paddingBottom: 'var(--space-sm)',
                        borderBottom: '1px solid var(--glass-border)'
                    }}>
                        <h4 style={{ margin: 0, fontSize: '1.125rem' }}>👥 Members</h4>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowMemberList(false)}
                            style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.875rem',
                                minWidth: 'auto'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{
                        overflowY: 'auto',
                        flex: 1,
                        marginRight: '-0.5rem',
                        paddingRight: '0.5rem'
                    }}>
                        {locations.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                                No members yet
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                {locations.map((location) => (
                                    <div
                                        key={location.memberId}
                                        style={{
                                            padding: 'var(--space-sm)',
                                            background: location.memberId === memberId
                                                ? 'rgba(138, 80, 255, 0.15)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                            border: `1px solid ${location.memberId === memberId
                                                ? 'rgba(138, 80, 255, 0.3)'
                                                : 'var(--glass-border)'
                                                } `,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-sm)',
                                            transition: 'all var(--transition-fast)'
                                        }}
                                    >
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: location.sharingEnabled ? 'var(--success)' : '#FFA500',
                                            boxShadow: location.sharingEnabled ? '0 0 8px var(--success)' : '0 0 8px #FFA500',
                                            flexShrink: 0
                                        }}></div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: 600,
                                                fontSize: '0.9375rem',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                opacity: location.sharingEnabled ? 1 : 0.6
                                            }}>
                                                {location.displayName}
                                                {location.memberId === memberId && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--primary)',
                                                        marginLeft: '0.25rem',
                                                        fontWeight: 500
                                                    }}>
                                                        (You)
                                                    </span>
                                                )}
                                                {!location.sharingEnabled && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: '#FFA500',
                                                        marginLeft: '0.25rem',
                                                        fontWeight: 500
                                                    }}>
                                                        (Paused)
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--text-muted)',
                                                marginTop: '0.125rem'
                                            }}>
                                                {location.sharingEnabled ? getRelativeTime(location.updatedAt) : 'Location sharing paused'}
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Member List Toggle Button */}
                {
                    !showMemberList && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowMemberList(true)}
                            style={{
                                position: 'absolute',
                                top: 'var(--space-md)',
                                right: 'var(--space-md)',
                                zIndex: 999,
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            <span>👥</span>
                            <span>Members ({locations.length})</span>
                        </button>
                    )
                }

                {
                    locations.length === 0 ? (
                        <div className="loading-container">
                            <p className="text-muted">Waiting for group members to share their location...</p>
                        </div>
                    ) : (
                        <MapContainer
                            center={[defaultCenter.lat, defaultCenter.lng]}
                            zoom={17}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Range Circle centered on current user */}
                            {myLocation && (
                                <Circle
                                    center={[myLocation.lat, myLocation.lng]}
                                    radius={rangeRadius}
                                    pathOptions={{
                                        color: '#8A50FF',
                                        fillColor: '#8A50FF',
                                        fillOpacity: 0.1,
                                        weight: 2,
                                        dashArray: '10, 10'
                                    }}
                                />
                            )}

                            {locations.map((location, index) => {
                                // Only show members who are sharing their location
                                if (!location.sharingEnabled) {
                                    return null;
                                }

                                // Assign consistent color based on member index
                                const color = MEMBER_COLORS[index % MEMBER_COLORS.length];
                                const isCurrentUser = location.memberId === memberId;

                                return (
                                    <Marker
                                        key={location.memberId}
                                        position={[location.lat, location.lng]}
                                        icon={createCustomMarker(location.displayName, color, isCurrentUser)}
                                    >
                                        <Popup>
                                            <div style={{ padding: '0.5rem' }}>
                                                <strong>{location.displayName}</strong>
                                                {location.memberId === memberId && <span> (You)</span>}
                                                <br />
                                                <small className="text-muted">
                                                    Updated: {new Date(location.updatedAt).toLocaleTimeString()}
                                                </small>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            <AutoFitBounds locations={locations} />
                        </MapContainer>
                    )
                }
            </div >

            {/* Delete Confirmation Modal */}
            {
                showDeleteModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: 'var(--space-md)'
                    }}>
                        <div className="glass-card" style={{
                            maxWidth: '400px',
                            width: '100%',
                            animation: 'slideUp 0.3s ease-out'
                        }}>
                            <h3 style={{ marginBottom: 'var(--space-md)', color: '#ef4444' }}>
                                🗑️ Delete Group?
                            </h3>
                            <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                                Are you sure you want to delete this group? This action cannot be undone.
                                All members will be removed and the group will be permanently deleted.
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowDeleteModal(false)}
                                    style={{ padding: '0.75rem 1.5rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    onClick={handleDeleteGroup}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: 'white'
                                    }}
                                >
                                    Delete Group
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

