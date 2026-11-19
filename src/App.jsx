import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import BookingForm from './components/BookingForm.jsx'
import OrderForm from './components/OrderForm.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Account from './pages/Account.jsx'
import Shop from './pages/Shop.jsx'
import ListingDetail from './pages/ListingDetail.jsx'
import SellerDashboard from './pages/SellerDashboard.jsx'
import ListingForm from './pages/ListingForm.jsx'
import SupplierRules from './pages/SupplierRules.jsx'
import Admin from './pages/Admin.jsx'
import MyBookings from './pages/MyBookings.jsx'
import SellerBookings from './pages/SellerBookings.jsx'
import MyOrders from './pages/MyOrders.jsx'
import SellerOrders from './pages/SellerOrders.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Terms from './pages/Terms.jsx'
import Privacy from './pages/Privacy.jsx'
import NotFound from './pages/NotFound.jsx'
import SellerPayments from './pages/SellerPayments.jsx'
import AdminReports from './pages/AdminReports.jsx'

export default function App() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/listing/:id/book" element={<ProtectedRoute><BookingForm /></ProtectedRoute>} />
            <Route path="/listing/:id/buy" element={<ProtectedRoute><OrderForm /></ProtectedRoute>} />
            <Route path="/supplier-rules" element={<SupplierRules />} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/seller" element={<ProtectedRoute role="seller"><SellerDashboard /></ProtectedRoute>} />
            <Route path="/seller/bookings" element={<ProtectedRoute role="seller"><SellerBookings /></ProtectedRoute>} />
            <Route path="/seller/payments" element={<ProtectedRoute role="seller"><SellerPayments /></ProtectedRoute>} />
            <Route path="/seller/orders" element={<ProtectedRoute role="seller"><SellerOrders /></ProtectedRoute>} />
            <Route path="/seller/listings/new" element={<ProtectedRoute role="seller"><ListingForm /></ProtectedRoute>} />
            <Route path="/seller/listings/:id/edit" element={<ProtectedRoute role="seller"><ListingForm /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><Admin /></AdminRoute></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute><AdminRoute><AdminReports /></AdminRoute></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </AuthProvider>
  )
}