import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import FAQ from './pages/FAQ';
import Questions from './pages/Questions';
import AdminDashboard from './pages/AdminDashboard';
import AiSupport from './pages/AiSupport';
import DashboardLayout from './components/DashboardLayout';
import './App.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/faqs" element={
            <PrivateRoute>
              <DashboardLayout>
                <FAQ />
              </DashboardLayout>
            </PrivateRoute>
          } />
          <Route path="/questions" element={
            <PrivateRoute>
              <DashboardLayout>
                <Questions />
              </DashboardLayout>
            </PrivateRoute>
          } />
          <Route path="/ai-support" element={
            <PrivateRoute>
              <DashboardLayout>
                <AiSupport />
              </DashboardLayout>
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute>
              <DashboardLayout>
                {/* Dynamically check role from local storage storage updates */}
                {JSON.parse(localStorage.getItem('user') || '{}').role === 'admin' ? (
                  <AdminDashboard />
                ) : (
                  <Navigate to="/faqs" />
                )}
              </DashboardLayout>
            </PrivateRoute>
          } />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;