import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const app = initializeApp({
    apiKey: "AIzaSyDKZC1VjvuRyTBnqwWK3lGclE8oalu-Nmw",
    authDomain: "thilenius-home.firebaseapp.com",
    projectId: "thilenius-home",
    storageBucket: "thilenius-home.appspot.com",
    messagingSenderId: "97684854947",
    appId: "1:97684854947:web:92ad073656f34f4b81c716"

    // apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    // authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    // projectId: process.env.REACT_APP_PROJECT_ID,
    // storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    // messagingSenderId: process.env.REACT_APP_MESSAGE_SENDER_ID,
    // appId: process.env.REACT_APP_APP_ID,
    // measurementId: process.env.REACT_APP_FIREBASE_API_KEY
})

export const auth = getAuth(app);
export const db = getFirestore(app);
// export default app