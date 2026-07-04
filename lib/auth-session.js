import { auth, db } from './firebase-store.js';
import { getSessionTokenFromRequest } from './auth-utils.js';

export async function getAuthenticatedSession(request, options) {
  const sessionCookie = getSessionTokenFromRequest(request);
  if (!sessionCookie) {
    return {
      configured: true,
      authenticated: false,
      shouldClearCookie: false,
    };
  }

  try {
    // Verify the session cookie, checking for revocation
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    // Fetch user profile from Firestore
    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();
    let user;
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      user = {
        id: decodedClaims.uid,
        email: decodedClaims.email,
        display_name: userData.displayName || decodedClaims.email.split('@')[0],
        status: 'active',
      };
    } else {
      user = {
        id: decodedClaims.uid,
        email: decodedClaims.email,
        display_name: decodedClaims.email.split('@')[0],
        status: 'active',
      };
    }

    return {
      configured: true,
      authenticated: true,
      user,
      decodedClaims,
      shouldClearCookie: false,
    };
  } catch (error) {
    console.warn('Session verification failed:', error.message);
    return {
      configured: true,
      authenticated: false,
      shouldClearCookie: true,
    };
  }
}












