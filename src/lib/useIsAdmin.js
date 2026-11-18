import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from '../context/AuthContext.jsx'

// Returns null while checking, then true or false.
export default function useIsAdmin() {
  const { user } = useAuth()
  const uid = user?.uid
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    if (!uid) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    getDoc(doc(db, 'admins', uid))
      .then((s) => !cancelled && setIsAdmin(s.exists()))
      .catch(() => !cancelled && setIsAdmin(false))
    return () => { cancelled = true }
  }, [uid])

  return isAdmin
}