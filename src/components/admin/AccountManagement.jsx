import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabase';

const isSyntheticEmail = (email = '') => email.endsWith('@motorparts.local');

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(12);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join('');
};

const AccountManagement = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    id_number: '',
    last_name: '',
    first_name: '',
    middle_name: '',
    suffix: '',
    contact_number: '',
    address: '',
    birthdate: '',
    gender: 'Male',
    emergency_contact: '',
    role: 'client'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setUsers(data || []);
    } else {
      console.error('Error fetching users:', error);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setShowPassword(false);
    setConfirmPassword('');
    setFormError('');
    setFormSuccess('');
    setFormData({
      username: '',
      email: '',
      password: '',
      id_number: '',
      last_name: '',
      first_name: '',
      middle_name: '',
      suffix: '',
      contact_number: '',
      address: '',
      birthdate: '',
      gender: 'Male',
      emergency_contact: '',
      role: 'client'
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (selectedUser) => {
    setEditingUser(selectedUser);
    setShowPassword(false);
    setConfirmPassword('');
    setFormError('');
    setFormSuccess('');
    setFormData({
      username: selectedUser.username || '',
      email: isSyntheticEmail(selectedUser.email) ? '' : (selectedUser.email || ''),
      password: '',
      id_number: selectedUser.id_number || '',
      last_name: selectedUser.last_name || '',
      first_name: selectedUser.first_name || '',
      middle_name: selectedUser.middle_name || '',
      suffix: selectedUser.suffix || '',
      contact_number: selectedUser.contact_number || '',
      address: selectedUser.address || '',
      birthdate: selectedUser.birthdate || '',
      gender: selectedUser.gender || 'Male',
      emergency_contact: selectedUser.emergency_contact || '',
      role: selectedUser.role || 'client'
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setFormData((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleGeneratePassword = () => {
    const password = generateRandomPassword();
    setFormData((current) => ({ ...current, password }));
    setConfirmPassword(password);
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    setFormSuccess('');

    const username = formData.username.trim().toLowerCase();
    const email = formData.email.trim();
    const password = formData.password;
    const isEdit = Boolean(editingUser);

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      setFormError('Username must be 3-30 characters and use only letters, numbers, dot, underscore, or hyphen.');
      setLoading(false);
      return;
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setFormError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const isClient = formData.role === 'client';

    if (!isEdit && !isClient && password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (password && password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (!/^\d{8}$/.test(formData.id_number) && isEdit) {
      setFormError('Invalid ID Number. Existing IDs are generated automatically by the system.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-update-account', {
        body: {
          userId: editingUser?.id,
          username,
          email,
          password,
          last_name: formData.last_name.trim(),
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name.trim(),
          suffix: formData.suffix.trim(),
          contact_number: formData.contact_number.trim(),
          address: formData.address.trim(),
          birthdate: formData.birthdate,
          gender: formData.gender,
          emergency_contact: formData.emergency_contact.trim(),
          role: formData.role
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.mode === 'created') {
        setFormSuccess(`✅ Account created successfully! Auto-generated ID: ${data.idNumber}`);
      } else {
        setFormSuccess('✅ Account updated successfully!');
      }

      await fetchUsers();

      const clientAccountId = data?.userId || editingUser?.id;
      const shouldSendClientSetupEmail =
        formData.role === 'client' &&
        Boolean(clientAccountId) &&
        (!editingUser || editingUser.email !== email);

      if (shouldSendClientSetupEmail) {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke(
          'send-password-setup-email',
          { body: { userId: clientAccountId, approve: false } }
        );

        if (emailError) {
          setFormError(`Account saved, but the password setup email could not be sent: ${emailError.message}`);
          return;
        }

        if (!emailResult?.emailSent) {
          setFormError(
            `Account saved, but the password setup email could not be sent: ${
              emailResult?.emailError || 'Please check the email service configuration.'
            }`
          );
          return;
        }

        setFormSuccess((current) => `${current}\n✉️ Password setup email sent to the client.`);
      }

      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 900);
    } catch (error) {
      console.error('Account save error:', error);
      setFormError(error.message || 'Failed to save account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user account?')) return;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting user: ' + error.message);
      return;
    }

    await fetchUsers();
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [
      u.id_number,
      u.last_name,
      u.first_name,
      u.middle_name,
      u.suffix,
      u.username,
      u.email,
      u.role,
      u.full_name
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">👥 Account Management</h2>
          <p className="text-sm text-gray-500 mt-1">Edit the complete account in one place, including email and password.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
        >
          + Create New Account
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="mb-2 block text-sm font-semibold text-slate-700">Search Account</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
          placeholder="Search by name, username, email, ID number, or role..."
        />
      </div>

      <div className="mb-3 text-sm text-slate-500">Showing {filteredUsers.length} of {users.length} account{users.length === 1 ? '' : 's'}</div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID #</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Username</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{u.id_number || 'N/A'}</td>
                <td className="px-4 py-3">{u.last_name}, {u.first_name} {u.middle_name}{u.suffix ? ` ${u.suffix}` : ''}</td>
                <td className="px-4 py-3 font-mono text-sm">{u.username}</td>
                <td className="px-4 py-3">
                  {isSyntheticEmail(u.email) ? <span className="text-amber-600">Not set</span> : u.email}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'employee' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-sm ${u.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {u.is_approved ? '✅ Approved' : '⏳ Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="text-slate-700 hover:text-slate-900"
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={() => handleEdit(u)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✏️ Edit
                  </button>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">No accounts match your search.</div>
        )}
      </div>

      {selectedUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-600">Account Details</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{selectedUser.full_name || 'User Account'}</h3>
                </div>
                <button onClick={() => setSelectedUser(null)} className="rounded-full px-3 py-2 text-slate-500 hover:bg-slate-200">✕</button>
              </div>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {[
                ['ID Number', selectedUser.id_number || 'N/A'],
                ['Username', selectedUser.username || 'N/A'],
                ['Email', isSyntheticEmail(selectedUser.email) ? 'Not set' : (selectedUser.email || 'N/A')],
                ['Role', selectedUser.role || 'N/A'],
                ['Last Name', selectedUser.last_name || 'N/A'],
                ['First Name', selectedUser.first_name || 'N/A'],
                ['Middle Name', selectedUser.middle_name || 'N/A'],
                ['Suffix', selectedUser.suffix || 'N/A'],
                ['Birthdate', selectedUser.birthdate || 'N/A'],
                ['Gender', selectedUser.gender || 'N/A'],
                ['Contact Number', selectedUser.contact_number || 'N/A'],
                ['Emergency Contact', selectedUser.emergency_contact || 'N/A'],
                ['Approval Status', selectedUser.is_approved ? 'Approved' : 'Pending'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className="mt-1 break-words font-medium text-slate-800">{value}</p>
                </div>
              ))}
              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Address</p>
                <p className="mt-1 whitespace-pre-wrap font-medium text-slate-800">{selectedUser.address || 'N/A'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button onClick={() => { handleEdit(selectedUser); setSelectedUser(null); }} className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">✏️ Edit Account</button>
              <button onClick={() => setSelectedUser(null)} className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#faf5ff,#ffffff_55%,#f5f3ff)] px-6 py-5 md:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-600">Admin Panel</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{editingUser ? 'Edit Account' : 'Create New Account'}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {editingUser
                  ? 'Update username, email, password, and profile information from one form.'
                  : 'Create an employee or client account with an automatically generated ID number.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              {formSuccess && <div className="mb-5 rounded-xl bg-green-50 p-3 text-sm text-green-700 whitespace-pre-line">{formSuccess}</div>}
              {formError && <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</div>}

              <div className="grid gap-6 md:grid-cols-2">
                <section className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-slate-900">Account Credentials</h4>
                  <p className="text-sm text-slate-500 mb-4">The username is used for login. A real email can be added here.</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Username *</label>
                      <input
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                        placeholder="juan.delacruz"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                        placeholder="juan@example.com"
                        required
                      />
                    </div>

                    {formData.role === 'client' ? (
                      <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm font-semibold text-blue-800">Client password setup</p>
                        <p className="mt-1 text-sm text-blue-700">The client will set their own password from the email password-setup link after approval. No password is entered here.</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Password {editingUser ? '(leave blank to keep)' : '*'}</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full rounded-2xl border border-slate-300 px-4 py-3 pr-11 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                                placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
                                required={!editingUser}
                                minLength="6"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                              >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleGeneratePassword}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <RefreshCw className="h-4 w-4" /> Generate
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Confirm Password {editingUser ? '' : '*'}</label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                            placeholder="Confirm password"
                            required={!editingUser || Boolean(formData.password)}
                            minLength="6"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Role *</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-slate-100"
                        disabled={editingUser?.role === 'admin'}
                      >
                        <option value="client">Client</option>
                        <option value="employee">Employee</option>
                        {editingUser?.role === 'admin' && <option value="admin">Admin</option>}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">ID Number</label>
                      <input
                        value={formData.id_number}
                        readOnly
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-slate-600"
                        placeholder="Generated automatically"
                      />
                      <p className="mt-1 text-xs text-slate-500">Auto-generated by the database.</p>
                    </div>
                  </div>
                </section>

                <section className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-slate-900">Personal Information</h4>
                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <input name="last_name" value={formData.last_name} onChange={handleChange} required placeholder="Last Name" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
                    <input name="first_name" value={formData.first_name} onChange={handleChange} required placeholder="First Name" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
                    <input name="middle_name" value={formData.middle_name} onChange={handleChange} maxLength="100" placeholder="Middle Name" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
                    <input name="suffix" value={formData.suffix} onChange={handleChange} placeholder="Suffix (Jr., Sr., III)" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
                    <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
                    <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input name="contact_number" value={formData.contact_number} onChange={handleChange} required placeholder="Contact Number" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
                    <input name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} placeholder="Emergency Contact" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
                    <textarea name="address" value={formData.address} onChange={handleChange} required rows="2" placeholder="Address" className="md:col-span-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
                  </div>
                </section>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingUser ? 'Save Account Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AccountManagement;
