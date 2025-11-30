import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGroup, joinGroup } from '../utils/api';
import { getMemberId, setDisplayName } from '../utils/identity';
import Footer from './Footer';

export default function Landing() {
    const navigate = useNavigate();
    const [mode, setMode] = useState(null); // 'create' or 'join'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form fields
    const [groupName, setGroupName] = useState('');
    const [groupId, setGroupId] = useState('');
    const [displayName, setDisplayNameInput] = useState('');
    const [expiryDuration, setExpiryDuration] = useState(null); // null = never expires

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setError('');

        if (!displayName.trim()) {
            setError('Please enter your display name');
            return;
        }

        setLoading(true);

        try {
            const memberId = getMemberId();
            setDisplayName(displayName.trim());

            // Create group
            const { group } = await createGroup(groupName.trim() || undefined, 30, expiryDuration);

            // Store group info in localStorage
            localStorage.setItem(`group_${group.id}`, JSON.stringify(group));

            // Join the group as creator
            await joinGroup(group.id, memberId, displayName.trim());

            // Navigate to group map
            navigate(`/group/${group.id}`);
        } catch (err) {
            setError(err.message || 'Failed to create group');
            setLoading(false);
        }
    };

    const handleJoinGroup = async (e) => {
        e.preventDefault();
        setError('');

        if (!groupId.trim()) {
            setError('Please enter a group ID');
            return;
        }

        if (!displayName.trim()) {
            setError('Please enter your display name');
            return;
        }

        setLoading(true);

        try {
            const memberId = getMemberId();
            setDisplayName(displayName.trim());

            // Join the group
            const { group } = await joinGroup(groupId.trim().toUpperCase(), memberId, displayName.trim());

            // Store group info in localStorage
            localStorage.setItem(`group_${groupId.trim().toUpperCase()}`, JSON.stringify(group));

            // Navigate to group map
            navigate(`/group/${groupId.trim().toUpperCase()}`);
        } catch (err) {
            setError(err.message || 'Failed to join group');
            setLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%' }}>
                <div className="text-center mb-lg">
                    <h1 style={{
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: 'var(--space-sm)'
                    }}>
                        📍 Live Location Tracker
                    </h1>
                    <p className="text-muted">
                        Stay connected with your group in crowded places
                    </p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {!mode ? (
                    <div className="flex flex-col gap-md">
                        <button
                            className="btn btn-primary"
                            onClick={() => setMode('create')}
                        >
                            <span>✨</span>
                            <span>Create New Group</span>
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setMode('join')}
                        >
                            <span>🔗</span>
                            <span>Join Existing Group</span>
                        </button>
                    </div>
                ) : mode === 'create' ? (
                    <form onSubmit={handleCreateGroup}>
                        <div className="input-group">
                            <label className="input-label">Group Name (Optional)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Festival Squad"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Your Display Name *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., John"
                                value={displayName}
                                onChange={(e) => setDisplayNameInput(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Group Expiry</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {[
                                    { label: '2h', value: 2 },
                                    { label: '4h', value: 4 },
                                    { label: '8h', value: 8 },
                                    { label: '24h', value: 24 },
                                    { label: 'Never', value: null }
                                ].map(option => (
                                    <button
                                        key={option.label}
                                        type="button"
                                        className={`btn ${expiryDuration === option.value ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setExpiryDuration(option.value)}
                                        disabled={loading}
                                        style={{ flex: 1, minWidth: '60px', padding: '0.5rem' }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                                {expiryDuration ? `Group will auto-delete after ${expiryDuration} hours` : 'Group will not expire'}
                            </small>
                        </div>

                        <div className="flex gap-sm">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setMode(null)}
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ flex: 2 }}
                            >
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span>
                                        <span>Create Group</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleJoinGroup}>
                        <div className="input-group">
                            <label className="input-label">Group ID *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., ABC123"
                                value={groupId}
                                onChange={(e) => setGroupId(e.target.value.toUpperCase())}
                                disabled={loading}
                                required
                                style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Your Display Name *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Sarah"
                                value={displayName}
                                onChange={(e) => setDisplayNameInput(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>

                        <div className="flex gap-sm">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setMode(null)}
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ flex: 2 }}
                            >
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                        <span>Joining...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🔗</span>
                                        <span>Join Group</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            <Footer />
        </div>
    );
}
