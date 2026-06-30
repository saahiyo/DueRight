import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAyZVZgd0hcCmkGPP0O5h_fHrf1rTsdwp8",
  authDomain: "dueright.firebaseapp.com",
  projectId: "dueright",
  storageBucket: "dueright.firebasestorage.app",
  messagingSenderId: "721415917114",
  appId: "1:721415917114:web:f26d6d0e0d8d5f59fa6f03",
  measurementId: "G-PM51R8XDZH"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

export const isFirebaseAuthEnabled = () => {
  return true
}
