import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { ModalsContext } from '../contexts/ModalsContext';
import { ItemsContext } from '../contexts/ItemsContext';
import { ModalTypes } from '../utils/modalTypes';
import { formatTime } from '../utils/formatString';

const Countdown = () => {
  const { items } = useContext(ItemsContext);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (items.length === 0) {
      setLabel('');
      return;
    }
    const { startTime, endTime } = items[0];
    let rafId;
    const tick = () => {
      const now = Date.now();
      if (startTime && now < startTime.getTime()) {
        setLabel(`Starts in ${formatTime(startTime - now)}`);
        rafId = requestAnimationFrame(tick);
      } else if (now < endTime.getTime()) {
        setLabel(`Ends in ${formatTime(endTime - now)}`);
        rafId = requestAnimationFrame(tick);
      } else {
        setLabel('Auction ended');
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [items]);

  if (!label) return null;
  return (
    <div className='navbar-brand mb-0 text-nowrap position-absolute start-50 translate-middle-x'>
      {label}
    </div>
  );
};

const Navbar = ({ admin }) => {
  const { openModal, signedInUser } = useContext(ModalsContext);
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [authButtonText, setAuthButtonText] = useState('Sign up');
  const [adminButtonText, setAdminButtonText] = useState('Admin');
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.displayName != null) {
        setUser(`Hi ${user.displayName}`);
        setAuthButtonText('Sign out');
      }
    });

    // Clean up the onAuthStateChanged listener when the component unmounts
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (signedInUser) {
      setUser(`Hi ${signedInUser}`);
      setAuthButtonText('Sign out');
    }
  }, [signedInUser]);

  const handleAdmin = () => {
    if (location.pathname.includes('admin')) {
      navigate(import.meta.env.BASE_URL);
      setAdminButtonText('Admin');
    } else {
      navigate(import.meta.env.BASE_URL + 'admin');
      setAdminButtonText('Home');
    }
  };

  const handleAuth = () => {
    if (user) {
      setUser('');
      setAuthButtonText('Sign up');
    } else {
      openModal(ModalTypes.SIGN_UP);
    }
  };

  return (
    <nav className='navbar navbar-dark bg-primary sticky-top'>
      <div className='container-fluid position-relative'>
        <div className='navbar-brand mb-0 h1 me-auto'>
          Memphis Central CC Silent Auction
        </div>
        <Countdown />
        <div className='row row-cols-auto'>
          <div className='navbar-brand'>{user}</div>
          {admin && (
            <button onClick={handleAdmin} className='btn btn-secondary me-2'>
              {adminButtonText}
            </button>
          )}
          <button onClick={handleAuth} className='btn btn-secondary me-2'>
            {authButtonText}
          </button>
        </div>
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  admin: PropTypes.bool,
};

export default Navbar;
