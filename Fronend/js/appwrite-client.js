const MNX_APPWRITE_CONFIG = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1',
  projectId: '6a7679a6001365351d69',
};

let mnxAppwriteClient = null;
let mnxAppwriteAccount = null;

function mnxInitAppwrite() {
  if (mnxAppwriteClient) return mnxAppwriteClient;
  if (typeof Appwrite === 'undefined') {
    console.error('[appwrite-client.js] Appwrite Web SDK not loaded');
    return null;
  }
  
  mnxAppwriteClient = new Appwrite.Client()
    .setEndpoint(MNX_APPWRITE_CONFIG.endpoint)
    .setProject(MNX_APPWRITE_CONFIG.projectId);
    
  mnxAppwriteAccount = new Appwrite.Account(mnxAppwriteClient);
  return mnxAppwriteClient;
}

async function mnxSignInWithGoogle() {
  mnxInitAppwrite();
  if (!mnxAppwriteAccount) throw new Error('ไม่สามารถเชื่อมต่อ Appwrite ได้');

  const currentUrl = window.location.href;
  try {
    mnxAppwriteAccount.createOAuth2Session(
      'google',
      currentUrl,
      currentUrl
    );
  } catch (err) {
    throw new Error('เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ' + err.message);
  }
}

async function mnxCheckOAuthSession() {
  mnxInitAppwrite();
  if (!mnxAppwriteAccount) return null;
  
  try {
    const session = await mnxAppwriteAccount.getSession('current');
    if (session && session.provider === 'google') {
      const user = await mnxAppwriteAccount.get();
      return {
        idToken: session.$id,
        name: user.name,
        email: user.email,
        avatar: '/Fronend/assets/images/avatar-placeholder.png'
      };
    }
  } catch (err) {
    return null;
  }
  return null;
}

async function mnxAppwriteSignOut() {
  mnxInitAppwrite();
  try {
    if (mnxAppwriteAccount) {
      await mnxAppwriteAccount.deleteSession('current');
    }
  } catch(e) {
  }
}

// Map to the existing MNX_FIREBASE object name to minimize refactoring in other files
window.MNX_FIREBASE = {
  signInWithGoogle: mnxSignInWithGoogle,
  signOut: mnxAppwriteSignOut,
  checkOAuthSession: mnxCheckOAuthSession
};
