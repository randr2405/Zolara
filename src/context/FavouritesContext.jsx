import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext.jsx'

const FavouritesContext = createContext({
  ids: new Set(),
  order: [],
  ready: false,
  toggle: async () => false,
})

export function FavouritesProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!uid) {
      setItems([])
      setReady(true)
      return undefined
    }
    setReady(false)
    return onSnapshot(
      collection(db, 'users', uid, 'favourites'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, at: d.data().createdAt?.toMillis?.() || Date.now() }))
        list.sort((a, b) => b.at - a.at)
        setItems(list)
        setReady(true)
      },
      (err) => {
        console.error(err)
        setItems([])
        setReady(true)
      }
    )
  }, [uid])

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items])
  const order = useMemo(() => items.map((i) => i.id), [items])

  const toggle = useCallback(
    async (listingId) => {
      if (!uid) return false
      const ref = doc(db, 'users', uid, 'favourites', listingId)
      try {
        if (ids.has(listingId)) await deleteDoc(ref)
        else await setDoc(ref, { listingId, createdAt: serverTimestamp() })
        return true
      } catch (err) {
        console.error(err)
        return false
      }
    },
    [uid, ids]
  )

  const value = useMemo(() => ({ ids, order, ready, toggle }), [ids, order, ready, toggle])

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
}

export function useFavourites() {
  return useContext(FavouritesContext)
}