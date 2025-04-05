import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import AddUpdateInventory from "./pages/inventory/AddUpdateInventory.jsx";
import FinancialDetails from "./pages/financial/FinancialDetails.jsx";
import ProfitLoss from "./pages/financial/ProfitLoss.jsx";
import ListContacts from "./pages/customers/ListContacts.jsx";
import GenerateInvoice from "./pages/customers/GenerateInvoice.jsx";
import AccountSettings from "./pages/settings/AccountSettings.jsx";
import UserManagement from "./pages/settings/UserManagement.jsx";
import SystemUtilities from "./pages/settings/SystemUtilities.jsx";
import CustomerPayables from "./pages/customers/CustomerPayables.jsx";
import CustomerInvoices from "./pages/customers/CustomerInvoices.jsx";
import Vendors from "./pages/vendors/Vendors.jsx";
import VendorInvoices from "./pages/vendors/VendorInvoices.jsx";
import GenerateVendorInvoice from "./pages/vendors/GenerateVendorInvoice.jsx";
import VendorPayables from "./pages/vendors/VendorPayables.jsx";
import ListBrokers from "./pages/brokers/ListBrokers.jsx";
import BrokerPayments from "./pages/brokers/BrokerPayments.jsx";
import ListCommissioners from "./pages/commissioners/ListCommissioners.jsx";
import AddCommissionSheet from "./pages/commissioners/AddCommissionSheet.jsx";
import ListCommissionSheets from "./pages/commissioners/ListCommissionSheets.jsx";
import SalesReport from './pages/financial/SalesReport.jsx';
import FakeInvoices from './pages/FakeInvoices.jsx';
import BalanceSheet from './pages/financial/BalanceSheet.jsx';
import "./index.css";

// Protected route component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

// Admin only route component
const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute requiredRole="admin">
      {children}
    </ProtectedRoute>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Inventory */}
        <Route path="inventory" element={<AddUpdateInventory />} />

        {/* Financial */}
        <Route path="financial">
          <Route index element={<FinancialDetails />} />
          <Route path="details" element={<FinancialDetails />} />
          <Route path="profit-loss" element={<ProfitLoss />} />
          <Route path="sales-report" element={<SalesReport />} />
          <Route path="balance-sheet" element={
            <AdminRoute>
              <BalanceSheet />
            </AdminRoute>
          } />
        </Route>

        {/* Customers */}
        <Route path="customers/list" element={<ListContacts />} />
        <Route path="customers/invoices" element={<CustomerInvoices />} />
        <Route path="customers/invoice" element={<GenerateInvoice />} />
        <Route path="customers/payables" element={<CustomerPayables />} />

        {/* Vendors */}
        <Route path="vendors">
          <Route path="list" element={<Vendors />} />
          <Route path="invoices" element={<VendorInvoices />} />
          <Route path="generate" element={<GenerateVendorInvoice />} />
          <Route path="payables" element={<VendorPayables />} />
        </Route>

        {/* Brokers */}
        <Route path="brokers/list" element={<ListBrokers />} />
        <Route path="brokers/payments" element={<BrokerPayments />} />

        {/* Commissioners */}
        <Route path="commissioners">
          <Route path="list" element={<ListCommissioners />} />
          <Route path="add-sheet" element={<AddCommissionSheet />} />
          <Route path="sheets" element={<ListCommissionSheets />} />
        </Route>

        {/* Settings */}
        <Route path="settings">
          <Route path="account" element={<AccountSettings />} />
          <Route path="users" element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          } />
          <Route path="utilities" element={
            <AdminRoute>
              <SystemUtilities />
            </AdminRoute>
          } />
        </Route>

        {/* Fake Invoices */}
        <Route path="fake-invoices" element={<FakeInvoices />} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}





