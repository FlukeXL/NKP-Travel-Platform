const { InputFile } = require('node-appwrite/file');
const appwrite = require('../config/appwrite');
const env = require('../config/env');
const fs = require('fs');

async function uploadToAppwriteStorage(filePath, filename) {
  if (!appwrite.storage) throw new Error('Appwrite storage is not initialized');
  
  const result = await appwrite.storage.createFile(
    env.APPWRITE_STORAGE_BUCKET_ID,
    appwrite.ID.unique(),
    InputFile.fromPath(filePath, filename),
    [appwrite.Permission.read(appwrite.Role.any())]
  );
  
  // Return the public view URL
  return `${env.APPWRITE_ENDPOINT}/storage/buckets/${env.APPWRITE_STORAGE_BUCKET_ID}/files/${result.$id}/view?project=${env.APPWRITE_PROJECT_ID}`;
}

async function deleteFromAppwriteStorage(fileUrl) {
  if (!fileUrl || !appwrite.storage) return;
  const match = fileUrl.match(/\/files\/([a-zA-Z0-9_-]+)\/view/);
  if (match && match[1]) {
    try {
      await appwrite.storage.deleteFile(env.APPWRITE_STORAGE_BUCKET_ID, match[1]);
    } catch (e) {
      console.warn("Failed to delete from Appwrite storage:", e.message);
    }
  }
}

module.exports = { uploadToAppwriteStorage, deleteFromAppwriteStorage };
