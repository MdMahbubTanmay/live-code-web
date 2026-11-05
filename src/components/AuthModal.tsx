// src/components/AuthModal.tsx
import React, { useState } from 'react';
import { registerUser, loginUser } from '../services/roomServices';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string) => void;
};

export const AuthModal = ({ isOpen, onClose, onLoginSuccess }: Props) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        if (!username || !email || !password) {
          setError('Please fill all fields.');
          return;
        }
        await registerUser(username.trim(), email.trim(), password);
        alert('Registration Successful! Logging in...');
        onLoginSuccess(username.trim());
        onClose();
      } else {
        if (!username || !password) {
          setError('Please fill all fields.');
          return;
        }
        await loginUser(username.trim(), password);
        onLoginSuccess(username.trim());
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1e1e2e', color: '#cdd6f4',
        padding: '24px', borderRadius: '10px', width: '320px',
        border: '1px solid #45475a', boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ marginTop: 0, color: '#89b4fa' }}>
          {isRegister ? 'Register Account' : 'Mentor Login'}
        </h3>
        
        {error && <div style={{ color: '#f38ba8', fontSize: '0.85rem', marginBottom: '10px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text" placeholder="Username"
            value={username} onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #45475a', background: '#313244', color: '#fff' }}
          />

          {isRegister && (
            <input
              type="email" placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #45475a', background: '#313244', color: '#fff' }}
            />
          )}

          <input
            type="password" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #45475a', background: '#313244', color: '#fff' }}
          />

          <button type="submit" style={{
            padding: '10px', background: '#89b4fa', color: '#11111b',
            fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer'
          }}>
            {isRegister ? 'Register & Join Room' : 'Login to My Room'}
          </button>
        </form>

        <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '0.85rem' }}>
          {isRegister ? (
            <span>Already registered? <b style={{ cursor: 'pointer', color: '#89b4fa' }} onClick={() => setIsRegister(false)}>Login</b></span>
          ) : (
            <span>Need an account? <b style={{ cursor: 'pointer', color: '#89b4fa' }} onClick={() => setIsRegister(true)}>Register</b></span>
          )}
        </div>

        <button onClick={onClose} style={{
          marginTop: '15px', width: '100%', padding: '6px', background: 'transparent',
          color: '#a6adc8', border: '1px solid #45475a', borderRadius: '4px', cursor: 'pointer'
        }}>
          Close
        </button>
      </div>
    </div>
  );
};