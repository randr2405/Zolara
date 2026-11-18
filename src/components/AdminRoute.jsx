import { Navigate } from 'react-router-dom'
import useIsAdmin from '../lib/useIsAdmin.js'

export default function AdminRoute({ children }) {
  const isAdmin = useIsAdmin()
  if (isAdmin === null) return <p className="p-6 text-center">Loading…</p>
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}