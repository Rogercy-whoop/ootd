export async function getAdminStorage() {
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getStorage } = await import("firebase-admin/storage");

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: "ootd-final-b0024.firebasestorage.app", // <-- replace with your actual bucket
    });
  }

  return getStorage();
}