// API client for backend communication

const API_BASE_URL = 'http://localhost:3000/api';

async function handleResponse(response) {
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

export async function createGroup(name, refreshInterval = 30, expiryDuration = null) {
    const response = await fetch(`${API_BASE_URL}/groups`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, refreshInterval, expiryDuration }),
    });

    return handleResponse(response);
}

export async function joinGroup(groupId, memberId, displayName) {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId, displayName }),
    });

    return handleResponse(response);
}

export async function updateLocation(groupId, memberId, lat, lng, sharingEnabled = true) {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/locations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId, lat, lng, sharingEnabled }),
    });

    return handleResponse(response);
}

export async function getGroupLocations(groupId) {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/locations`);

    return handleResponse(response);
}

export async function deleteGroup(groupId) {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: 'DELETE',
    });

    return handleResponse(response);
}
