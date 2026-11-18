import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Account from './pages/Account.jsx'
import Shop from './pages/Shop.jsx'
import ListingDetail from './pages/ListingDetail.jsx'
import SellerDashboard from './pages/SellerDashboard.jsx'
import ListingForm from './pages/ListingForm.jsx'
import SupplierRules from './pages/SupplierRules.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/supplier-rules" element={<SupplierRules />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/seller" element={<ProtectedRoute role="seller"><SellerDashboard /></ProtectedRoute>} />
        <Route path="/seller/listings/new" element={<ProtectedRoute role="seller"><ListingForm /></ProtectedRoute>} />
        <Route path="/seller/listings/:id/edit" element={<ProtectedRoute role="seller"><ListingForm /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}