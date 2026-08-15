const { Client, Databases, Users, Storage, Query, ID, Permission, Role, AppwriteException } = require('node-appwrite');
const env = require('./env');

let clientInstance = null;
let databasesInstance = null;
let usersInstance = null;
let storageInstance = null;

function initAppwrite() {
  if (clientInstance) {
    return { client: clientInstance, databases: databasesInstance, users: usersInstance, storage: storageInstance };
  }
  if (!env.APPWRITE_CONFIGURED) return null;

  try {
    clientInstance = new Client()
      .setEndpoint(env.APPWRITE_ENDPOINT)
      .setProject(env.APPWRITE_PROJECT_ID)
      .setKey(env.APPWRITE_API_KEY);

    databasesInstance = new Databases(clientInstance);
    usersInstance = new Users(clientInstance);
    storageInstance = new Storage(clientInstance);

    console.log('[appwrite] Server SDK initialized for project:', env.APPWRITE_PROJECT_ID);
    return { client: clientInstance, databases: databasesInstance, users: usersInstance, storage: storageInstance };
  } catch (err) {
    console.error('[appwrite] Failed to initialize Appwrite SDK:', err.message);
    return null;
  }
}

const appwriteInstances = initAppwrite();

function isAppwriteReady() {
  return Boolean(env.APPWRITE_CONFIGURED && appwriteInstances?.databases);
}

module.exports = {
  client: appwriteInstances?.client || null,
  databases: appwriteInstances?.databases || null,
  users: appwriteInstances?.users || null,
  storage: appwriteInstances?.storage || null,
  Query,
  ID,
  Permission,
  Role,
  AppwriteException,
  isAppwriteReady,
  databaseId: env.APPWRITE_DATABASE_ID,
  storageBucketId: env.APPWRITE_STORAGE_BUCKET_ID,
};
