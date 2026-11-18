import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { getSocket, onConnectionChange } from '../lib/socket.js';
import AlertToasts from './AlertToasts.jsx';

const NAV = {
  public: [
    { to: '/', label: 'Explore & Book' },
    { to: '/admin/network', label: 'Live Network' },
  ],
  commuter: [
    { to: '/', label: 'Explore & Book' },
    { to: '/saved', label: 'My Bookings & Saved' },
  ],
  driver: [
    { to: '/driver', label: 'Driver Cockpit' },
    { to: '/', label: 'Explore & Book' },
    { to: '/saved', label: 'My Saved' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/network', label: 'Live Map' },
    { to: '/admin/routes', label: 'Routes' },
    { to: '/admin/stops', label: 'Stops' },
    { to: '/admin/people', label: 'Users' },
    { to: '/admin/issues', label: 'Issues' },
    { to: '/admin/fleet', label: 'Fleet Health' },
    { to: '/driver', label: 'Driver View' },
  ],
};

function Icon({ name, className = 'size-5' }) {
  const paths = {
    bus: (
      <>
        <path strokeLinecap="round" d="M5 16V7.5C5 5.57 8.13 4 12 4s7 1.57 7 3.5V16" />
        <path strokeLinecap="round" d="M5 10h14M7 16v2m10-2v2M7.5 19h1m7 0h1" />
        <circle cx="8" cy="14" r="1" />
        <circle cx="16" cy="14" r="1" />
      </>
    ),
    ticket: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path strokeLinecap="round" d="m16 16 4.5 4.5" />
      </>
    ),
    map: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4 6 6-2 8 3 2-1v12l-6 2-8-3-2 1V6Z" />
        <path d="M10 4v14m8-11v14" />
      </>
    ),
    menu: <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path strokeLinecap="round" d="M5.5 20c.8-3.4 3-5.2 6.5-5.2s5.7 1.8 6.5 5.2" />
      </>
    ),
    star: (
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    ),
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function ConnectionDot() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    getSocket();
    return onConnectionChange(setConnected);
  }, []);

  return (
    <span
      className={`bb-connection ${connected ? 'connected' : ''}`}
      title={connected ? 'Connected to live push server' : 'Polling for updates'}
    >
      <span />
      {connected ? 'Live Sync' : 'Polling'}
    </span>
  );
}

export function Layout() {
  const { user, signOut, isAdmin, isDriver } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const links = isAdmin ? NAV.admin : isDriver ? NAV.driver : user ? NAV.commuter : NAV.public;

  return (
    <div className="bb-app-shell flex flex-col min-h-screen">
      <AlertToasts />

      {/* ── HEADER ── */}
      <header className="bb-header sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="bb-header-inner flex items-center justify-between py-3 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          {/* Logo */}
          <Link to="/" className="bb-logo flex items-center gap-2.5 text-slate-900 no-underline" aria-label="BusBuddy Home">
            <span className="bb-logo-mark size-10 rounded-2xl bg-gradient-to-tr from-brand-800 to-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-700/25">
              <Icon name="bus" className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none text-slate-900">
                Bus<span className="text-brand-700">Buddy</span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-amber-600">Transit OS</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="bb-desktop-nav hidden md:flex items-center gap-1 mx-6 flex-1" aria-label="Primary navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/' || link.to === '/admin' || link.to === '/driver'}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-800 font-extrabold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Header Action Right */}
          <div className="bb-header-actions flex items-center gap-3">
            <ConnectionDot />

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full py-1 px-3 shadow-2xs">
                  <span className="size-7 rounded-full bg-brand-700 text-white font-bold text-xs flex items-center justify-center">
                    {(user.name || 'U').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-tight max-w-[100px] truncate">{user.name}</span>
                    <span className="text-[10px] font-bold text-brand-700 capitalize leading-tight">{user.role}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="size-8 rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-slate-500 hover:text-red-700 flex items-center justify-center transition cursor-pointer text-xs font-bold"
                  onClick={() => {
                    signOut();
                    navigate('/');
                  }}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                to="/signin"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-700 hover:bg-brand-600 text-white font-bold px-4 py-2 text-xs sm:text-sm shadow-md shadow-brand-700/20 transition active:scale-95 no-underline"
              >
                <Icon name="user" className="size-4" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="md:hidden size-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile menu"
            >
              <Icon name="menu" className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE DRAWER ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <button
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity cursor-default border-0"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-slide-left">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="size-8 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold text-sm">
                    BB
                  </span>
                  <span className="font-black text-lg text-slate-900">BusBuddy</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
                >
                  ×
                </button>
              </div>

              {user && (
                <div className="my-4 p-3 rounded-2xl bg-brand-50 border border-brand-100 flex items-center gap-3">
                  <span className="size-10 rounded-full bg-brand-700 text-white font-bold grid place-items-center">
                    {(user.name || 'U').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-sm text-slate-900 truncate">{user.name}</strong>
                    <span className="text-[11px] font-bold text-brand-700 uppercase">{user.role}</span>
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-1 py-4">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/' || link.to === '/admin' || link.to === '/driver'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `px-4 py-3 rounded-2xl text-sm font-bold transition flex items-center justify-between ${
                        isActive ? 'bg-brand-700 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    <span>{link.label}</span>
                    <Icon name="search" className="size-3.5 opacity-50" />
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                    navigate('/');
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  <span>Sign out</span>
                </button>
              ) : (
                <Link
                  to="/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-2xl bg-brand-700 text-white text-center font-bold text-sm block shadow-md"
                >
                  Sign in / Register
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 pb-20 md:pb-12">
        <Outlet />
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500 hidden md:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-bold text-slate-700">BusBuddy · Smart Transit OS</span>
          <span>Zero-hardware live bus tracking, advance seat reservations & demand analytics</span>
          <span className="text-slate-400 font-mono text-[11px]">v2.4 Production Edition</span>
        </div>
      </footer>

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around"
        aria-label="Mobile Bottom Navigation"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold ${
              isActive ? 'text-brand-700' : 'text-slate-500'
            }`
          }
        >
          <Icon name="bus" className="size-5" />
          <span>Explore</span>
        </NavLink>

        <NavLink
          to="/saved"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold ${
              isActive ? 'text-brand-700' : 'text-slate-500'
            }`
          }
        >
          <Icon name="ticket" className="size-5" />
          <span>Bookings</span>
        </NavLink>

        <NavLink
          to={isAdmin ? '/admin/network' : isDriver ? '/driver' : '/admin/network'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold ${
              isActive ? 'text-brand-700' : 'text-slate-500'
            }`
          }
        >
          <Icon name="map" className="size-5" />
          <span>{isDriver ? 'Cockpit' : 'Live Map'}</span>
        </NavLink>

        {user ? (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold text-slate-500"
          >
            <Icon name="user" className="size-5" />
            <span>Account</span>
          </button>
        ) : (
          <NavLink
            to="/signin"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold ${
                isActive ? 'text-brand-700' : 'text-slate-500'
              }`
            }
          >
            <Icon name="user" className="size-5" />
            <span>Sign In</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}

export default Layout;
