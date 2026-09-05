import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const buildBaseUsername = (firstName) => {
  const clean = String(firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return 'user';
  if (clean.length === 1) return `${clean}01`;
  if (clean.length === 2) return `${clean}1`;
  return clean.slice(0, 30);
};

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
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

  const usernamePreview = useMemo(
    () => buildBaseUsername(formData.first_name),
    [formData.first_name]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || isRegistered) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw new Error('Please enter a valid email address.');
      }

      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        throw new Error('First Name and Last Name are required.');
      }

      if (formData.middle_name.length > 100) {
        throw new Error('Middle Name must not exceed 100 characters.');
      }

      // Public registration is handled by a server-side Edge Function.
      // This prevents Supabase's default "Confirm your email address" message
      // and allows the app to send our branded pending-approval email instead.
      const { data, error: registrationError } = await supabase.functions.invoke(
        'public-register',
        {
          body: {
            email,
            last_name: formData.last_name.trim(),
            first_name: formData.first_name.trim(),
            middle_name: formData.middle_name.trim(),
            suffix: formData.suffix.trim(),
            contact_number: formData.contact_number.trim(),
            address: formData.address.trim(),
            birthdate: formData.birthdate,
            gender: formData.gender,
            emergency_contact: formData.emergency_contact.trim(),
            website: '', // honeypot field
          },
        }
      );

      if (registrationError) throw registrationError;
      if (!data?.success) {
        throw new Error(data?.error || 'Registration failed. Please try again.');
      }

      setIsRegistered(true);

      setSuccess(`✅ Registration submitted successfully!

👤 Username: ${data.username}
🆔 ID Number: ${data.idNumber}
📧 Email: ${email}
⏳ Status: Pending admin approval

Please wait while the administrator reviews your registration.
Once approved, you will receive an email with a secure link to set your own password.

You will be redirected to the login page in 8 seconds...`);

      setFormData({
        email: '',
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

      setTimeout(() => navigate('/login'), 8000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(`❌ Registration failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_45%,_#e2e8f0)] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur md:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            🏍️
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Motor Parts
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Create Client Account</h1>
          <p className="mt-2 text-sm text-slate-500">
            Register your details and wait for admin approval. We'll email you only after your account is approved.
          </p>
        </div>

        {success && (
          <div className="mb-5 whitespace-pre-line rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isRegistered ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section>
              <h2 className="text-lg font-bold text-slate-900">Account Information</h2>
              <p className="mb-4 text-sm text-slate-500">
                Use your real email. You will create your own password after approval.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="juan.delacruz@gmail.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-2 rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                    Automatic Username
                  </p>
                  <p className="mt-1 text-sm text-blue-800">
                    {formData.first_name
                      ? `Your username will be: ${usernamePreview}`
                      : 'Your username will be generated automatically from your first name.'}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input name="last_name" value={formData.last_name} onChange={handleChange} required placeholder="Last Name" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
                <input name="first_name" value={formData.first_name} onChange={handleChange} required placeholder="First Name" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
                <input name="middle_name" value={formData.middle_name} onChange={handleChange} maxLength="100" placeholder="Middle Name" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
                <input name="suffix" value={formData.suffix} onChange={handleChange} placeholder="Suffix (Jr., Sr., III)" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
                <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Contact Information</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input name="contact_number" value={formData.contact_number} onChange={handleChange} required placeholder="09123456789" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
                <input name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} placeholder="Emergency Contact - 09123456789" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
                <textarea name="address" value={formData.address} onChange={handleChange} required rows="3" placeholder="Complete Address" className="md:col-span-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" disabled={loading} />
              </div>
            </section>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <strong>What happens next?</strong>
              <div className="mt-2">1. Submit your registration.</div>
              <div>2. Receive an email confirming that your account is pending approval.</div>
              <div>3. Admin reviews your registration.</div>
              <div>4. After approval, receive a secure password-setup email.</div>
              <div>5. Set your password and sign in.</div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting Registration...' : 'Register'}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center text-blue-800">
            Registration submitted. Please wait for admin approval. You will receive an email after approval.
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
