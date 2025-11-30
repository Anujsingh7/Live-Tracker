// Simple identity management using localStorage

const MEMBER_ID_KEY = 'location_tracker_member_id';
const DISPLAY_NAME_KEY = 'location_tracker_display_name';

export function generateMemberId() {
    return `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getMemberId() {
    let memberId = localStorage.getItem(MEMBER_ID_KEY);

    if (!memberId) {
        memberId = generateMemberId();
        localStorage.setItem(MEMBER_ID_KEY, memberId);
    }

    return memberId;
}

export function getDisplayName() {
    return localStorage.getItem(DISPLAY_NAME_KEY) || '';
}

export function setDisplayName(name) {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
}

export function clearIdentity() {
    localStorage.removeItem(MEMBER_ID_KEY);
    localStorage.removeItem(DISPLAY_NAME_KEY);
}
