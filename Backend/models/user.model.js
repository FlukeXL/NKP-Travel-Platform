const { getDatabases, isAppwriteReady, databaseId, COLLECTIONS, Query } = require('../config/database');
const env = require('../config/env');
const devStore = require('../utils/devStore');
const { sanitizeAppwriteId } = require('../utils/sanitizeId');

const DEV_COL = 'auth_users';

function sanitizeId(id) {
  return sanitizeAppwriteId(id, 'usr');
}

// Only allow proper URL strings as avatars — reject oversized base64 data URIs
function sanitizeAvatarUrl(avatar) {
  if (!avatar || typeof avatar !== 'string') return '';
  if (avatar.startsWith('data:')) return ''; // strip base64 — use file upload instead
  return avatar;
}

function formatUser(doc) {
  if (!doc) return null;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;
  
  let profile = rest.profile;
  if (!profile) {
    profile = {
      birthdate: rest.birthdate || null,
      interests: Array.isArray(rest.interests) ? rest.interests : [],
      envPref: rest.envPref || 'both',
      pacePref: rest.pacePref || 'both',
    };
  } else if (typeof profile === 'string') {
    try {
      profile = JSON.parse(profile);
    } catch {
      profile = { birthdate: null, interests: [], envPref: 'both', pacePref: 'both' };
    }
  }

  let aiProfile = rest.aiProfile;
  if (typeof aiProfile === 'string' && (aiProfile.startsWith('{') || aiProfile.startsWith('['))) {
    try {
      aiProfile = JSON.parse(aiProfile);
    } catch {
    }
  }

  return {
    uid: rest.uid || $id,
    name: rest.name || '',
    email: rest.email || '',
    avatar: sanitizeAvatarUrl(rest.avatar) || null,
    provider: rest.provider || 'email',
    role: rest.role || 'user',
    joinedAt: rest.joinedAt || $createdAt || new Date().toISOString(),
    profile,
    aiProfile: aiProfile || null,
  };

}

async function createUser(uid, data) {
  const isBootstrapAdmin = env.ADMIN_EMAILS.includes((data.email || '').toLowerCase());
  const now = new Date().toISOString();
  const profile = data.profile || {};

  const payload = {
    uid: String(uid),
    name: String(data.name || ''),
    email: String(data.email || ''),
    avatar: String(data.avatar || ''),
    provider: String(data.provider || 'email'),
    role: isBootstrapAdmin ? 'admin' : (data.role || 'user'),
    joinedAt: now,
    birthdate: String(profile.birthdate || ''),
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    envPref: String(profile.envPref || 'both'),
    pacePref: String(profile.pacePref || 'both'),
    aiProfile: data.aiProfile ? (typeof data.aiProfile === 'object' ? JSON.stringify(data.aiProfile) : String(data.aiProfile)) : '',
  };

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().createDocument(databaseId, COLLECTIONS.USERS, sanitizeId(uid), payload);
      return formatUser(doc);
    } catch (err) {
      if (err.code === 409) {
        const doc = await getDatabases().updateDocument(databaseId, COLLECTIONS.USERS, sanitizeId(uid), payload);
        return formatUser(doc);
      }
      console.warn('[user.model] Appwrite createUser failed, using devStore:', err.message);
    }
  }

  const record = {
    ...payload,
    profile: {
      birthdate: profile.birthdate || null,
      interests: Array.isArray(profile.interests) ? profile.interests : [],
      envPref: profile.envPref || 'both',
      pacePref: profile.pacePref || 'both',
    },
    aiProfile: data.aiProfile || null,
  };
  devStore.set(DEV_COL, String(uid), record);
  return record;
}

async function getUserById(uid) {
  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().getDocument(databaseId, COLLECTIONS.USERS, sanitizeId(uid));
      return formatUser(doc);
    } catch (err) {
      if (err.code === 404) {
        try {
          const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.USERS, [
            Query.equal('uid', String(uid)),
            Query.limit(1),
          ]);
          if (res.documents.length > 0) return formatUser(res.documents[0]);
        } catch {
        }
        return null;
      }
      console.warn('[user.model] Appwrite getUserById failed:', err.message);
    }
  }

  const user = devStore.get(DEV_COL, String(uid));
  return user ? formatUser(user) : null;
}

async function updateUser(uid, patch) {
  const cleanPatch = {};
  if (patch.name !== undefined) cleanPatch.name = String(patch.name);
  if (patch.avatar !== undefined) cleanPatch.avatar = sanitizeAvatarUrl(patch.avatar);
  if (patch.role !== undefined) cleanPatch.role = String(patch.role);
  if (patch.profile) {
    if (patch.profile.birthdate !== undefined) cleanPatch.birthdate = String(patch.profile.birthdate || '');
    if (patch.profile.interests !== undefined) cleanPatch.interests = Array.isArray(patch.profile.interests) ? patch.profile.interests : [];
    if (patch.profile.envPref !== undefined) cleanPatch.envPref = String(patch.profile.envPref);
    if (patch.profile.pacePref !== undefined) cleanPatch.pacePref = String(patch.profile.pacePref);
  }
  if (patch.aiProfile !== undefined) {
    cleanPatch.aiProfile = typeof patch.aiProfile === 'object' ? JSON.stringify(patch.aiProfile) : String(patch.aiProfile || '');
  }

  if (isAppwriteReady()) {
    try {
      const doc = await getDatabases().updateDocument(databaseId, COLLECTIONS.USERS, sanitizeId(uid), cleanPatch);
      return formatUser(doc);
    } catch (err) {
      console.warn('[user.model] Appwrite updateUser failed:', err.message);
    }
  }

  const current = devStore.get(DEV_COL, String(uid)) || { uid: String(uid) };
  const updated = {
    ...current,
    ...cleanPatch,
    profile: {
      ...(current.profile || {}),
      ...(patch.profile || {}),
    },
  };
  devStore.set(DEV_COL, String(uid), updated);
  return formatUser(updated);
}

async function deleteUser(uid) {
  if (isAppwriteReady()) {
    try {
      await getDatabases().deleteDocument(databaseId, COLLECTIONS.USERS, sanitizeId(uid));
      return;
    } catch (err) {
      if (err.code !== 404) console.warn('[user.model] Appwrite deleteUser failed:', err.message);
    }
  }

  devStore.delete(DEV_COL, String(uid));
}

async function getAllUsers() {
  if (isAppwriteReady()) {
    try {
      const res = await getDatabases().listDocuments(databaseId, COLLECTIONS.USERS, [
        Query.limit(100),
        Query.orderDesc('joinedAt'),
      ]);
      return res.documents.map(formatUser);
    } catch (err) {
      console.warn('[user.model] Appwrite getAllUsers failed:', err.message);
    }
  }

  const list = devStore.list(DEV_COL);
  return list.map(formatUser).sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0));
}

module.exports = { createUser, getUserById, updateUser, deleteUser, getAllUsers, isFirebaseReady: isAppwriteReady };
