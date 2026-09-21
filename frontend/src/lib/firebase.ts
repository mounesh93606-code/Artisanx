import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "otp-artisan.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "otp-artisan",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "otp-artisan.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "438067864455",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:438067864455:android:4da1424dafb791ec932922"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

/**
 * Initializes Firebase Authentication and connects to the Auth Emulator (port 9099)
 * Equivalent to Flutter:
 *   await Firebase.initializeApp();
 *   await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
 */
export async function initializeFirebase() {
  const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  if (!useEmulator) {
    console.log('Firebase initialized in Production/Cloud mode (Live SMS OTP enabled)');
    return;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      // On Android native emulator, 10.0.2.2 maps to the computer's localhost
      await FirebaseAuthentication.useEmulator({
        host: '10.0.2.2',
        port: 9099
      });
      console.log('Firebase Auth (Native) connected to emulator on 10.0.2.2:9099');
    } else {
      // In Web browser
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('Firebase Auth (Web) connected to emulator on localhost:9099');
    }
  } catch (error) {
    console.warn('Firebase emulator setup note:', error);
  }
}

export interface VerifyPhoneOptions {
  phoneNumber: string;
  verificationCompleted?: (result: any) => void;
  verificationFailed?: (error: { message: string; code?: string }) => void;
  codeSent?: (verificationId: string, resendToken?: number) => void;
  codeAutoRetrievalTimeout?: (verificationId: string) => void;
}

let webConfirmationResult: any = null;

/**
 * Verifies a phone number and triggers the SMS verification code flow.
 * Exact equivalent of Flutter:
 *   await FirebaseAuth.instance.verifyPhoneNumber(
 *     phoneNumber: '+91...',
 *     verificationCompleted: (PhoneAuthCredential credential) {},
 *     verificationFailed: (FirebaseAuthException e) {},
 *     codeSent: (String verificationId, int? resendToken) {},
 *     codeAutoRetrievalTimeout: (String verificationId) {},
 *   );
 */
export async function verifyPhoneNumber({
  phoneNumber,
  verificationCompleted,
  verificationFailed,
  codeSent,
  codeAutoRetrievalTimeout,
}: VerifyPhoneOptions): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // 1. Register Native Android / iOS event listeners
    if (verificationCompleted) {
      await FirebaseAuthentication.addListener('phoneVerificationCompleted', (event) => {
        console.log('Firebase Native phoneVerificationCompleted:', event);
        verificationCompleted(event);
      });
    }

    if (verificationFailed) {
      await FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
        console.error('Firebase Native phoneVerificationFailed:', event);
        verificationFailed({ message: event.message });
      });
    }

    if (codeSent || codeAutoRetrievalTimeout) {
      await FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
        console.log('Firebase Native phoneCodeSent verificationId:', event.verificationId);
        codeSent?.(event.verificationId);

        if (codeAutoRetrievalTimeout) {
          // Auto retrieval timeout callback after 60s
          setTimeout(() => {
            codeAutoRetrievalTimeout(event.verificationId);
          }, 60000);
        }
      });
    }

    // 2. Trigger native SMS phone verification
    try {
      await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber });
    } catch (err: any) {
      verificationFailed?.({ message: err?.message || 'Phone verification failed' });
    }
  } else {
    // Web browser fallback using Firebase JS SDK
    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      let recaptchaVerifier = (window as any).recaptchaVerifier;
      if (!recaptchaVerifier) {
        let container = document.getElementById('recaptcha-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'recaptcha-container';
          document.body.appendChild(container);
        }
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
        (window as any).recaptchaVerifier = recaptchaVerifier;
      }

      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      webConfirmationResult = confirmation;
      codeSent?.(confirmation.verificationId);
    } catch (err: any) {
      verificationFailed?.({ message: err?.message || 'Failed to send SMS verification', code: err?.code });
    }
  }
}

/**
 * Confirms the 6-digit OTP code entered by the user.
 */
export async function confirmVerificationCode(verificationId: string, verificationCode: string) {
  if (Capacitor.isNativePlatform()) {
    return await FirebaseAuthentication.confirmVerificationCode({
      verificationId,
      verificationCode,
    });
  } else {
    if (webConfirmationResult) {
      return await webConfirmationResult.confirm(verificationCode);
    }
    throw new Error('No active verification session. Please request a new code.');
  }
}
