import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import motorPartsLogo from '../assets/motorparts.png';
import '../styles/Register.css';

const InputIcon = ({ type }) => {
  const paths = {
    user: (
      <>
        <circle cx="12" cy="8" r="3.3" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </>
    ),
    mail: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    phone: (
      <>
        <path d="M6.4 3.8 9 3.2l1.5 4-1.7 1.5a13.5 13.5 0 0 0 6.5 6.5l1.5-1.7 4 1.5-.6 2.6a2.4 2.4 0 0 1-2.7 1.8C10.3 18.5 5.5 13.7 4.6 6.5a2.4 2.4 0 0 1 1.8-2.7Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M7 3v4M17 3v4M3.5 9.5h17" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
  };

  return (
    <svg
      width="17"
      height="17"
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

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    last_name: '',
    first_name: '',
    middle_name: '',
    suffix: '',
    contact_number: '',
    address: '',
    birthdate: '',
    gender: 'Male',
    emergency_contact: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || isRegistered) {
      setError('Registration already in progress or completed.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    const username = formData.username.trim().toLowerCase();

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      setError(
        'Username must be 3-30 characters and use only letters, numbers, dot, underscore, or hyphen.'
      );
      setLoading(false);
      return;
    }

    if (formData.middle_name && formData.middle_name.length > 100) {
      setError('Middle Name must not exceed 100 characters.');
      setLoading(false);
      return;
    }

    const fullName = `${formData.last_name}, ${formData.first_name}${
      formData.middle_name ? ` ${formData.middle_name}` : ''
    }${formData.suffix ? ` ${formData.suffix}` : ''}`;

    try {
      const { data: existingUsername, error: usernameCheckError } =
        await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .maybeSingle();

      if (usernameCheckError) throw usernameCheckError;

      if (existingUsername) {
        setError(
          '❌ Username already registered. Please choose another username.'
        );
        setLoading(false);
        return;
      }

      const authEmail = `${username}@motorparts.local`;
      const temporaryPassword = `${crypto.randomUUID()}A1!`;

      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: authEmail,
          password: temporaryPassword,
          options: {
            data: {
              signup_source: 'public_register',
              username,
              last_name: formData.last_name.trim(),
              first_name: formData.first_name.trim(),
              middle_name: formData.middle_name.trim(),
              suffix: formData.suffix.trim(),
              contact_number: formData.contact_number.trim(),
              address: formData.address.trim(),
              birthdate: formData.birthdate,
              gender: formData.gender,
              emergency_contact: formData.emergency_contact.trim(),
              full_name: fullName,
            },
          },
        });

      if (authError) {
        console.error('Auth error:', authError);

        if (/rate limit/i.test(authError.message)) {
          setError(
            '⏳ Too many attempts. Please wait a while and try again.'
          );
          setLoading(false);
          return;
        }

        if (/already registered|already exists/i.test(authError.message)) {
          setError(
            '❌ Username already registered. Please choose another username.'
          );
          setLoading(false);
          return;
        }

        throw authError;
      }

      if (!authData?.user) {
        throw new Error('Registration failed. Please try again.');
      }

      setIsRegistered(true);
      setSuccess(`✅ Registration submitted successfully!

👤 Username: ${username}
🆔 Your ID Number will be generated automatically by the system.
⏳ Your account is now waiting for admin approval.
📧 After approval, the admin will add your email address.
🔑 The admin will also set or generate your login password.

You will be redirected to the login page in 8 seconds...`);

      setFormData({
        username: '',
        last_name: '',
        first_name: '',
        middle_name: '',
        suffix: '',
        contact_number: '',
        address: '',
        birthdate: '',
        gender: 'Male',
        emergency_contact: '',
      });

      setTimeout(() => {
        navigate('/login');
      }, 8000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        '❌ Registration failed: ' + (err.message || 'Unknown error')
      );
    } finally {
      setLoading(false);
    }
  };

  const field = (icon, label, name, options = {}) => (
    <div className={`register-field ${options.className || ''}`}>
      <label htmlFor={name} className="register-label">
        {label}{options.required ? ' *' : ''}
      </label>
      <div className="register-input-shell">
        {icon && (
          <span className="register-input-icon">
            <InputIcon type={icon} />
          </span>
        )}
        <input
          id={name}
          type={options.type || 'text'}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          className="register-input"
          placeholder={options.placeholder}
          minLength={options.minLength}
          maxLength={options.maxLength}
          required={options.required}
          disabled={loading || isRegistered}
        />
      </div>
      {options.help && <p className="register-help">{options.help}</p>}
    </div>
  );

  return (
    <div className="register-page">
      <div className="register-glow register-glow-orange" />
      <div className="register-glow register-glow-lime" />

      <div className="register-shell">
        <header className="register-topbar">
          <Link to="/" className="register-brand" aria-label="Motor Parts home">
            <span className="register-logo-frame">
              <img src={motorPartsLogo} alt="Motor Parts" />
            </span>
          </Link>

          <Link to="/" className="register-home-link">
            ← Home
          </Link>
        </header>

        <main className="register-layout">
          <section className="register-intro">
            <div className="register-intro-glow register-intro-glow-a" />
            <div className="register-intro-glow register-intro-glow-b" />

            <div className="register-intro-content">
              <div className="register-badge">
                <span />
                Client registration
              </div>

              <p className="register-kicker">Motor Parts Marketplace</p>

              <h1>
                Create your account.
                <span>Get ready to ride.</span>
              </h1>

              <p className="register-lead">
                Register your details once and wait for account approval.
                Your login access is activated after the approval process.
              </p>

              <div className="register-steps">
                <div className="register-step active">
                  <span>01</span>
                  <div>
                    <strong>Submit your details</strong>
                    <p>Complete the client registration form.</p>
                  </div>
                </div>

                <div className="register-step">
                  <span>02</span>
                  <div>
                    <strong>Admin review</strong>
                    <p>Your registration is checked by the administrator.</p>
                  </div>
                </div>

                <div className="register-step">
                  <span>03</span>
                  <div>
                    <strong>Activate your account</strong>
                    <p>Receive approval, set your password, then sign in.</p>
                  </div>
                </div>
              </div>

              <div className="register-note">
                <div className="register-note-icon">
                  ✓
                </div>
                <div>
                  <strong>Why register?</strong>
                  <p>
                    Keep your orders and receipts connected to your customer
                    account for easier tracking.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="register-card">
            <div className="register-card-header">
              <div>
                <p className="register-form-kicker">Create client account</p>
                <h2>Personal details</h2>
                <p>
                  Fill in your information carefully. Fields marked with *
                  are required.
                </p>
              </div>

              <div className="register-form-status">
                <span className="status-dot" />
                Requires approval
              </div>
            </div>

            {success && (
              <div className="register-message register-message-success">
                <div className="message-title">Registration received</div>
                <div className="message-body">{success}</div>
              </div>
            )}

            {error && (
              <div className="register-message register-message-error">
                {error}
              </div>
            )}

            {!isRegistered ? (
              <form onSubmit={handleSubmit} className="register-form">
                <div className="register-section-title">
                  <span>01</span>
                  Account
                </div>

                {field('user', 'Username', 'username', {
                  required: true,
                  minLength: 3,
                  maxLength: 30,
                  placeholder: 'juan.delacruz',
                  help: 'Use 3–30 letters, numbers, dots, underscores, or hyphens.',
                })}

                <div className="register-section-title register-section-spaced">
                  <span>02</span>
                  Personal information
                </div>

                <div className="register-grid register-grid-two">
                  {field(null, 'Last Name', 'last_name', {
                    required: true,
                    placeholder: 'Dela Cruz',
                  })}
                  {field(null, 'First Name', 'first_name', {
                    required: true,
                    placeholder: 'Juan',
                  })}
                  {field(null, 'Middle Name', 'middle_name', {
                    maxLength: 100,
                    placeholder: 'Middle name',
                  })}
                  {field(null, 'Suffix', 'suffix', {
                    placeholder: 'Jr., Sr., III',
                  })}
                  {field('calendar', 'Birthdate', 'birthdate', {
                    type: 'date',
                    required: true,
                  })}

                  <div className="register-field">
                    <label htmlFor="gender" className="register-label">
                      Gender *
                    </label>
                    <div className="register-input-shell">
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="register-input register-select"
                        required
                        disabled={loading || isRegistered}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="register-section-title register-section-spaced">
                  <span>03</span>
                  Contact information
                </div>

                <div className="register-grid register-grid-two">
                  {field('phone', 'Contact Number', 'contact_number', {
                    required: true,
                    placeholder: '09123456789',
                  })}
                  <div className="register-field">
                    <label htmlFor="emergency_contact" className="register-label">
                      Emergency Contact
                    </label>
                    <div className="register-input-shell">
                      <span className="register-input-icon">
                        <InputIcon type="phone" />
                      </span>
                      <input
                        id="emergency_contact"
                        type="text"
                        name="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={handleChange}
                        className="register-input"
                        placeholder="Name - 09123456789"
                        disabled={loading || isRegistered}
                      />
                    </div>
                  </div>
                </div>

                <div className="register-field register-field-full">
                  <label htmlFor="address" className="register-label">
                    Complete Address *
                  </label>
                  <div className="register-input-shell register-textarea-shell">
                    <span className="register-input-icon register-textarea-icon">
                      <InputIcon type="pin" />
                    </span>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="register-input register-textarea"
                      rows="3"
                      placeholder="Street, Barangay, Municipality/City, Province"
                      required
                      disabled={loading || isRegistered}
                    />
                  </div>
                </div>

                <div className="register-process-card">
                  <div className="register-process-icon">i</div>
                  <div>
                    <strong>What happens next?</strong>
                    <ol>
                      <li>Submit your registration.</li>
                      <li>Your account enters the approval queue.</li>
                      <li>After approval, your account can be activated for sign in.</li>
                    </ol>
                  </div>
                </div>

                <button
                  type="submit"
                  className="register-submit"
                  disabled={loading || isRegistered}
                >
                  {loading ? 'Submitting registration...' : 'Submit Registration'}
                  {!loading && <span>→</span>}
                </button>
              </form>
            ) : (
              <div className="register-complete">
                <div className="register-complete-icon">✓</div>
                <h3>Registration submitted</h3>
                <p>
                  Your account is now waiting for admin approval. You will be
                  redirected to the sign-in page shortly.
                </p>
                <Link to="/login" className="register-complete-link">
                  Go to Sign In →
                </Link>
              </div>
            )}

            <div className="register-footer">
              <span>Already have an account?</span>
              <Link to="/login">Sign in here</Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Register;
