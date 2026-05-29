import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import FAQ from './pages/FAQ';
import Questions from './pages/Questions';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import './App.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  return (
    <Router>
      <div className="app">
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/faqs" element={
              <PrivateRoute>
                <FAQ />
              </PrivateRoute>
            } />
            <Route path="/questions" element={
              <PrivateRoute>
                <Questions />
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute>
                {isAdmin ? <AdminDashboard /> : <Navigate to="/faqs" />}
              </PrivateRoute>
            } />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;