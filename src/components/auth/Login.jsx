import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import motorPartsLogo from '../../assets/motorparts.png';
import '../../styles/Login.css';

const FieldIcon = ({ type }) => {
  const paths = {
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 19 6v5c0 4.9-3 8.4-7 10-4-1.6-7-5.1-7-10V6l7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
};

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const detectRecoverySession = async () => {
      const params = new URLSearchParams(window.location.search);
      const hasSetupMode = params.get('mode') === 'set-password';

      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = Boolean(sessionData?.session);

      if (hasSetupMode || hasSession) {
        if (hasSetupMode) setIsRecoveryMode(true);
      }
    };

    detectRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setError('');
        setRecoveryMessage('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let loginEmail = identifier.trim();

      if (!loginEmail.includes('@')) {
        const { data: userRow, error: lookupError } = await supabase
          .from('users')
          .select('email')
          .eq('username', loginEmail.toLowerCase())
          .maybeSingle();

        if (lookupError || !userRow?.email) {
          throw new Error('Invalid username or password.');
        }

        loginEmail = userRow.email;
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

      if (signInError) throw new Error(signInError.message);

      if (!data?.user) {
        throw new Error(
          'No user data received. Please check your credentials.'
        );
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, is_approved')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        throw new Error(
          'User account not found in system. Please contact admin.'
        );
      }

      if (!userData.is_approved) {
        await supabase.auth.signOut();
        throw new Error(
          'Your account is pending approval. Please wait for admin confirmation.'
        );
      }

      switch (userData.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'employee':
          navigate('/employee/dashboard');
          break;
        case 'client':
          navigate('/client/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setRecoveryMessage('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setRecoveryMessage(
        'Your password has been set successfully. Redirecting to sign in...'
      );

      await supabase.auth.signOut();

      setTimeout(() => {
        setIsRecoveryMode(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setRecoveryMessage('');
        window.history.replaceState({}, '', '/login');
        navigate('/login');
      }, 1200);
    } catch (err) {
      console.error('Password setup error:', err);
      setError(
        err.message ||
          'Unable to set your password. Please request a new setup link.'
      );
    } finally {
      setLoading(false);
    }
  };

  const signInFeatures = [
    {
      title: 'Admin',
      text: 'Approvals, reports, and account management.',
      badge: '01',
    },
    {
      title: 'Employee',
      text: 'Products, orders, and customer handling.',
      badge: '02',
    },
    {
      title: 'Client',
      text: 'Browse parts, place orders, and view receipts.',
      badge: '03',
    },
  ];

  return (
    <div className="login-page">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />

      <div className="login-shell">
        <header className="login-topbar">
          <Link to="/" className="login-brand" aria-label="Motor Parts home">
            <span className="login-brand-logo">
              <img
                src={motorPartsLogo}
                alt="Motor Parts"
              />
            </span>
          </Link>

          <Link to="/" className="login-home-link">
            ← Home
          </Link>
        </header>

        <main className="login-main">
          <section className="login-showcase">
            <div className="showcase-glow showcase-glow-orange" />
            <div className="showcase-glow showcase-glow-lime" />

            <div className="showcase-content">
              <div className="showcase-top">
                <span className="showcase-pill">
                  <span className="status-dot" />
                  Secure account access
                </span>

                <span className="showcase-shield">
                  <FieldIcon type="shield" />
                </span>
              </div>

              <div className="showcase-copy">
                <p className="showcase-kicker">Motor Parts Management System</p>

                <h1>
                  Welcome back.
                  <span>Your workspace is ready.</span>
                </h1>

                <p className="showcase-description">
                  Sign in securely and continue managing motorcycle parts,
                  customers, orders, inventory, and receipts from one place.
                </p>
              </div>

              <div className="role-grid">
                {signInFeatures.map((feature) => (
                  <div className="role-card" key={feature.title}>
                    <div className="role-card-top">
                      <span>{feature.badge}</span>
                      <span className="role-dot" />
                    </div>
                    <strong>{feature.title}</strong>
                    <p>{feature.text}</p>
                  </div>
                ))}
              </div>

              <div className="account-flow">
                <div className="flow-icon">✓</div>
                <div>
                  <p className="flow-label">Account flow</p>
                  <p className="flow-text">
                    Register → Admin Approval → Approval Email → Set Password
                    → Sign In
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="login-card">
            <div className="login-card-inner">
              {!isRecoveryMode ? (
                <>
                  <div className="form-heading">
                    <p className="form-kicker">Welcome back</p>
                    <h2>Sign in</h2>
                    <p>
                      Enter your username or email and password to access your
                      account.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="login-form">
                    <div className="field-group">
                      <label htmlFor="identifier">Username or Email</label>

                      <div className="input-shell">
                        <span className="input-icon">
                          <FieldIcon type="user" />
                        </span>

                        <input
                          id="identifier"
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="Enter username or email"
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <div className="field-label-row">
                        <label htmlFor="password">Password</label>
                        <span>Secure sign-in</span>
                      </div>

                      <div className="input-shell">
                        <span className="input-icon">
                          <FieldIcon type="lock" />
                        </span>

                        <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="login-alert login-alert-error">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="login-submit"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </form>

                  <div className="form-footer">
                    <Link to="/">← Back to Home</Link>

                    <p>
                      Don&apos;t have an account?{' '}
                      <Link to="/register">Register here</Link>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="recovery-icon">
                    <FieldIcon type="lock" />
                  </div>

                  <div className="form-heading recovery-heading">
                    <p className="form-kicker">Account approved</p>
                    <h2>Set your password</h2>
                    <p>
                      Create your password to finish activating your account.
                    </p>
                  </div>

                  <form onSubmit={handleSetPassword} className="login-form">
                    <div className="field-group">
                      <label htmlFor="new-password">New Password</label>

                      <div className="input-shell">
                        <span className="input-icon">
                          <FieldIcon type="lock" />
                        </span>

                        <input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          minLength="8"
                          autoComplete="new-password"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <label htmlFor="confirm-password">
                        Confirm Password
                      </label>

                      <div className="input-shell">
                        <span className="input-icon">
                          <FieldIcon type="lock" />
                        </span>

                        <input
                          id="confirm-password"
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) =>
                            setConfirmNewPassword(e.target.value)
                          }
                          placeholder="Re-enter your password"
                          minLength="8"
                          autoComplete="new-password"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="login-alert login-alert-error">
                        {error}
                      </div>
                    )}

                    {recoveryMessage && (
                      <div className="login-alert login-alert-success">
                        {recoveryMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="login-submit login-submit-orange"
                    >
                      {loading ? 'Saving Password...' : 'Set Password'}
                    </button>
                  </form>

                  <div className="form-footer form-footer-single">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryMode(false);
                        setError('');
                        setRecoveryMessage('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                      }}
                      className="back-button"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Login;
