import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const ClientManagement = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id_number: '',
    email: '',
    last_name: '',
    first_name: '',
    middle_name: '',
    contact_number: '',
    address: '',
    birthdate: '',
    gender: 'Male',
    emergency_contact: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false });
    
    if (!error) setClients(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const fullName = `${formData.last_name}, ${formData.first_name}${formData.middle_name ? ' ' + formData.middle_name : ''}`;

    try {
      // Validate ID Number (8-digit numeric)
      if (!/^\d{8}$/.test(formData.id_number)) {
        alert('ID Number must be exactly 8 digits');
        setLoading(false);
        return;
      }

      // Check if ID Number already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id_number')
        .eq('id_number', formData.id_number)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        alert('ID Number already exists. Please use a different ID Number.');
        setLoading(false);
        return;
      }

      // 1. Create auth user with a temporary password that admin can set later
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: 'TempPassword123!'
      });

      if (authError) throw authError;

      // 2. Create user in public.users
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          id_number: formData.id_number,
          username: formData.email.split('@')[0],
          email: formData.email,
          last_name: formData.last_name,
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          full_name: fullName,
          contact_number: formData.contact_number,
          address: formData.address,
          birthdate: formData.birthdate,
          gender: formData.gender,
          emergency_contact: formData.emergency_contact,
          role: 'client',
          is_approved: false
        }]);

      if (userError) throw userError;

      // 3. Create approval request
      const { error: approvalError } = await supabase
        .from('approval_requests')
        .insert([{
          request_type: 'client_reg',
          requested_by: user.id,
          target_id: authData.user.id,
          status: 'pending'
        }]);

      if (approvalError) throw approvalError;

      alert('Client account created! Waiting for admin approval.');
      setShowModal(false);
      resetForm();
      fetchClients();
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      id_number: '',
      email: '',
      last_name: '',
      first_name: '',
      middle_name: '',
      contact_number: '',
      address: '',
      birthdate: '',
      gender: 'Male',
      emergency_contact: ''
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Client Management</h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          + Create Client
        </button>
      </div>

      {/* Client List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID #</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contact</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{client.id_number || 'N/A'}</td>
                <td className="px-4 py-3">
                  {client.last_name}, {client.first_name} {client.middle_name}
                </td>
                <td className="px-4 py-3">{client.email}</td>
                <td className="px-4 py-3">{client.contact_number || 'N/A'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    client.is_approved 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {client.is_approved ? '✅ Approved' : '⏳ Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No clients yet. Create your first client!
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#eff6ff,#ffffff_55%,#e0f2fe)] px-6 py-5 md:px-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">Employee Panel</p>
                  <h3 className="text-2xl font-bold text-slate-900">Create Client Account</h3>
                  <p className="text-sm text-slate-500">Capture client details clearly before sending the approval request.</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                  Pending admin approval
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="space-y-8">
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">Account Credentials</h4>
                      <p className="text-sm text-slate-500">Create the login details the client will use later.</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Step 1</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">ID Number</label>
                      <input
                        type="text"
                        required
                        value={formData.id_number}
                        onChange={(e) => setFormData({...formData, id_number: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="12345678"
                        maxLength="8"
                      />
                      <p className="mt-1 text-xs text-slate-500">Exactly 8 digits only.</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="client@example.com"
                      />
                    </div>

                    <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      The client will be created with a temporary password and can log in after the admin sets a real password.
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">Personal Details</h4>
                      <p className="text-sm text-slate-500">Collect the client identity details accurately.</p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">Step 2</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Last Name</label>
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Dela Cruz"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">First Name</label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Juan"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Middle Name</label>
                      <input
                        type="text"
                        value={formData.middle_name}
                        onChange={(e) => setFormData({...formData, middle_name: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Middle Name"
                       
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Birthdate</label>
                      <input
                        type="date"
                        required
                        value={formData.birthdate}
                        onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        required
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">Contact Information</h4>
                      <p className="text-sm text-slate-500">Add phone, address, and emergency details.</p>
                    </div>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">Step 3</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Contact Number</label>
                      <input
                        type="text"
                        required
                        value={formData.contact_number}
                        onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="09123456789"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Emergency Contact</label>
                      <input
                        type="text"
                        value={formData.emergency_contact}
                        onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Juan Dela Cruz - 09123456789"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Address</label>
                      <textarea
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        rows="3"
                        placeholder="123 Street, Barangay, City, Province"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">Check the details before sending this client for approval.</p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-2xl border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-2xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Client'}
                  </button>
                </div>
              </div>
            </form>
            </div>
          </div>
          ,
          document.body
        )
      )}
    </div>
  );
};

export default ClientManagement;