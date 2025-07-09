import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: "your-project-id.appspot.com", // <-- replace with your actual bucket
  });
}

export const adminStorage = getStorage();