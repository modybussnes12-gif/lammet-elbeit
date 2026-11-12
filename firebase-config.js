// إعدادات تطبيق الويب من Firebase Console. هذه القيم معرفات عميل وليست مفاتيح Service Account.
export const firebaseConfig = {
  apiKey: "AIzaSyAhSSbq8fZYN6dTZ5FP_NYFMc-uYjuUSxo",
  authDomain: "noor-el-hekaya.firebaseapp.com",
  projectId: "noor-el-hekaya",
  storageBucket: "noor-el-hekaya.firebasestorage.app",
  messagingSenderId: "812946866792",
  appId: "1:812946866792:web:cb165b4073c12b3be1b1dd",
  measurementId: "G-HXYRY6SC8K"
};

export function isFirebaseConfigured() {
  const vals = [firebaseConfig.apiKey, firebaseConfig.authDomain, firebaseConfig.projectId,
    firebaseConfig.storageBucket, firebaseConfig.messagingSenderId, firebaseConfig.appId];
  return vals.every(v => typeof v === "string" && v.trim() && !/PASTE_|YOUR_PROJECT_ID|YOUR_API_KEY|CHANGE_ME/i.test(v));
}

