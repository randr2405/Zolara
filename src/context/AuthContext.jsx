import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signOut, updateProfile,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
} from 'firebase/auth'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (!u) {
        setProfile(null)
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setProfile(snap.exists() ? snap.data() : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
  }, [user])

  async function signup({ name, email, password, role }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName: name,
      email,
      role, // 'buyer' or 'seller'
      createdAt: serverTimestamp(),
    })
  }

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}