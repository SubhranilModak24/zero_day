/**
 * VouchPay — Firebase Client & Google Authentication
 * Connects to Firebase Auth & Firestore using configuration from environment variables (.env).
 */

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

// Config from .env or Vite environment variables
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = Boolean(
  FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId
);

let firebaseAuth: any = null;
let googleAuthProvider: any = null;

// Initialize Firebase dynamically if keys are available
async function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;
  if (!isFirebaseConfigured) return null;

  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getAuth, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
    firebaseAuth = getAuth(app);
    googleAuthProvider = new GoogleAuthProvider();
    return firebaseAuth;
  } catch (err) {
    console.warn("[VouchPay Firebase] Error loading Firebase client SDK:", err);
    return null;
  }
}

/**
 * Triggers Google Sign-In with a popup
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  const auth = await getFirebaseAuth();

  if (!auth || !googleAuthProvider) {
    throw new Error(
      "Firebase Auth is not initialized. Please verify your VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in .env."
    );
  }

  try {
    const { signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    const result = await signInWithPopup(auth, googleAuthProvider);
    const user = result.user;
    const profile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split("@")[0] || "User",
      email: user.email,
      photoURL: user.photoURL,
      isAnonymous: false,
    };
    localStorage.setItem("vouchpay_user", JSON.stringify(profile));
    return profile;
  } catch (err: any) {
    console.error("[VouchPay Firebase] Google Sign-In error:", err);
    throw err;
  }
}

/**
 * Signs the user out
 */
export async function signOutUser(): Promise<void> {
  const auth = await getFirebaseAuth();
  if (auth) {
    try {
      const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out error:", e);
    }
  }
  localStorage.removeItem("vouchpay_user");
}

/**
 * Subscribes to Auth State Changes
 */
export function subscribeToAuthState(callback: (user: UserProfile | null) => void) {
  // Purge any legacy demo user from localStorage
  const cached = localStorage.getItem("vouchpay_user");
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (
        !parsed.uid ||
        parsed.uid === "demo-ops-user-1" ||
        parsed.email?.includes("vouchpay.internal") ||
        parsed.isAnonymous
      ) {
        localStorage.removeItem("vouchpay_user");
        callback(null);
      } else {
        callback(parsed);
      }
    } catch {
      localStorage.removeItem("vouchpay_user");
      callback(null);
    }
  } else {
    callback(null);
  }

  getFirebaseAuth().then(async (auth) => {
    if (!auth) return;
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    onAuthStateChanged(auth, (firebaseUser: any) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          isAnonymous: false,
        };
        localStorage.setItem("vouchpay_user", JSON.stringify(profile));
        callback(profile);
      } else {
        localStorage.removeItem("vouchpay_user");
        callback(null);
      }
    });
  });
}
