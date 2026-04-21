import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ModalsContext } from '../contexts/ModalsContext';
import { ItemsContext } from '../contexts/ItemsContext';
import { ModalTypes } from '../utils/modalTypes';
import { formatTime } from '../utils/formatString';

const Countdown = ({ scrolled }) => {
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
    <>
      <div className='navbar-brand mb-0 text-nowrap d-none d-md-block position-absolute start-50 translate-middle-x'>
        {label}
      </div>
      {scrolled ? (
        <div className='navbar-brand mb-0 text-nowrap d-md-none'>
          {label}
        </div>
      ) : (
        <div className='navbar-brand mb-0 text-nowrap text-center w-100 order-last d-md-none mt-2'>
          {label}
        </div>
      )}
    </>
  );
};

Countdown.propTypes = {
  scrolled: PropTypes.bool,
};

const Navbar = ({ admin }) => {
  const { openModal, signedInUser, setSignedInUser } = useContext(ModalsContext);
  const { items } = useContext(ItemsContext);
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [authButtonText, setAuthButtonText] = useState('Sign up');
  const [adminButtonText, setAdminButtonText] = useState('Admin');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const donationItem = items.find((item) => item.type === 'donation');
  const donationOpen = donationItem
    && Date.now() >= (donationItem.startTime ? donationItem.startTime.getTime() : 0)
    && Date.now() < donationItem.endTime.getTime();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.displayName != null) {
        setUser(`Hi ${user.displayName}`);
        setAuthButtonText('Sign out');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (signedInUser) {
      setUser(`Hi ${signedInUser}`);
      setAuthButtonText('Sign out');
    }
  }, [signedInUser]);

  const handleAdmin = () => {
    setMenuOpen(false);
    if (location.pathname.includes('admin')) {
      navigate(import.meta.env.BASE_URL);
      setAdminButtonText('Admin');
    } else {
      navigate(import.meta.env.BASE_URL + 'admin');
      setAdminButtonText('Home');
    }
  };

  const handleAuth = async () => {
    setMenuOpen(false);
    if (user) {
      setUser('');
      setAuthButtonText('Sign up');
      setSignedInUser(null);
      await signOut(auth);
    } else {
      openModal(ModalTypes.SIGN_UP);
    }
  };

  const handleInfo = () => {
    setMenuOpen(false);
    openModal(ModalTypes.WELCOME);
  };

  const handleDonate = () => {
    setMenuOpen(false);
    if (donationItem) openModal(ModalTypes.DONATION, donationItem);
  };

  return (
    <nav className='navbar navbar-dark bg-primary sticky-top'>
      <div className='container-fluid position-relative'>
        <div className='navbar-brand mb-0 h1 d-none d-md-block'>
          Memphis Central CC Silent Auction
        </div>

        {!scrolled && (
          <div className='navbar-brand mb-0 h1 d-md-none'>
            CC Silent Auction
          </div>
        )}

        <Countdown scrolled={scrolled} />

        <div className='d-none d-md-flex align-items-center flex-wrap justify-content-end gap-2 ms-auto'>
          {user && (
            <div className='navbar-brand mb-0 me-0 text-truncate' style={{ maxWidth: '40vw' }}>
              {user}
            </div>
          )}
          {admin && (
            <button onClick={handleAdmin} className='btn btn-secondary'>
              {adminButtonText}
            </button>
          )}
          {donationOpen && (
            <button onClick={handleDonate} className='btn btn-success'>
              Donate
            </button>
          )}
          <button
            onClick={handleInfo}
            className='btn btn-secondary'
            title='Auction info'
            aria-label='Auction info'
          >
            Info
          </button>
          <button onClick={handleAuth} className='btn btn-secondary'>
            {authButtonText}
          </button>
        </div>

        <button
          className='navbar-toggler d-md-none ms-auto border-0 shadow-none'
          type='button'
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label='Toggle menu'
        >
          <span className='navbar-toggler-icon'></span>
        </button>

        {menuOpen && (
          <div className='d-md-none w-100 mt-3 pt-3 border-top border-light-subtle' style={{ order: 100 }}>
            <div className='navbar-brand mb-2 d-block'>Memphis Central CC</div>
            {user && <div className='text-light mb-3'>{user}</div>}
            <div className='d-grid gap-2'>
              {admin && (
                <button onClick={handleAdmin} className='btn btn-secondary'>
                  {adminButtonText}
                </button>
              )}
              {donationOpen && (
                <button onClick={handleDonate} className='btn btn-success'>
                  Donate
                </button>
              )}
              <button onClick={handleInfo} className='btn btn-secondary'>
                Info
              </button>
              <button onClick={handleAuth} className='btn btn-secondary'>
                {authButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  admin: PropTypes.bool,
};

export default Navbar;
