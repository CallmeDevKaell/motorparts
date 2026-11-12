
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const money = (value) => `₱${Number(value || 0).toFixed(2)}`;

const OrderManagement = () => {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [customerType, setCustomerType] = useState('registered');
  const [selectedClient, setSelectedClient] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const [pendingOnlineOrders, setPendingOnlineOrders] = useState([]);
  const [selectedOnlineOrderId, setSelectedOnlineOrderId] = useState(null);
  const [loadingPendingOrders, setLoadingPendingOrders] = useState(false);

  const [walkInName, setWalkInName] = useState('');
  const [walkInContact, setWalkInContact] = useState('');

  const [cart, setCart] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  const [cashReceived, setCashReceived] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchClients();
  }, []);

  useEffect(() => {
    if (customerType === 'registered' && selectedClient) {
      fetchPendingOnlineOrders(selectedClient);
    } else {
      setPendingOnlineOrders([]);
      setSelectedOnlineOrderId(null);
    }
  }, [customerType, selectedClient]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client:client_id(full_name,email),
        employee:employee_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setOrders(data || []);
    } else {
      console.error('Error loading orders:', error);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .gt('stock_quantity', 0)
      .order('name');

    if (!error) {
      setProducts(data || []);
    } else {
      console.error('Error loading products:', error);
    }
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, contact_number, first_name, last_name')
      .eq('role', 'client')
      .eq('is_approved', true)
      .order('full_name');

    if (!error) {
      setClients(data || []);
    } else {
      console.error('Error loading clients:', error);
    }
  };

  const fetchPendingOnlineOrders = async (clientId) => {
    setLoadingPendingOrders(true);
    setSelectedOnlineOrderId(null);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          created_at,
          transaction_type,
          order_items(
            quantity,
            subtotal,
            product:product_id(name, image_url)
          )
        `)
        .eq('client_id', clientId)
        .eq('is_walk_in', false)
        .eq('status', 'pending')
        .eq('admin_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingOnlineOrders(data || []);
    } catch (error) {
      console.error('Error loading pending online orders:', error);
      setPendingOnlineOrders([]);
    } finally {
      setLoadingPendingOrders(false);
    }
  };

  const selectedOnlineOrder = useMemo(
    () =>
      pendingOnlineOrders.find(
        (order) => Number(order.id) === Number(selectedOnlineOrderId)
      ) || null,
    [pendingOnlineOrders, selectedOnlineOrderId]
  );

  const onlineTotal = Number(selectedOnlineOrder?.total_amount || 0);

  const walkInTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
    [cart]
  );

  const totalDue = Number((onlineTotal + walkInTotal).toFixed(2));

  const changeAmount = Math.max(
    0,
    Number(cashReceived || 0) - totalDue
  );

  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();

    if (!term) return clients;

    return clients.filter((client) =>
      [
        client.full_name,
        client.email,
        client.contact_number,
        client.first_name,
        client.last_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [clients, clientSearch]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) =>
      [product.name, product.category, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [products, productSearch]);

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();

    if (!term) return orders;

    return orders.filter((order) => {
      const customerName = order.is_walk_in
        ? order.walk_in_name
        : order.client?.full_name;

      return [
        order.id,
        customerName,
        order.client?.email,
        order.status,
        order.transaction_type,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [orders, orderSearch]);

  const resetModal = () => {
    setCustomerType('registered');
    setSelectedClient('');
    setClientSearch('');
    setPendingOnlineOrders([]);
    setSelectedOnlineOrderId(null);

    setWalkInName('');
    setWalkInContact('');

    setCart([]);
    setProductSearch('');
    setCashReceived('');
  };

  const openNewOrder = () => {
    resetModal();
    setShowModal(true);
  };

  const closeAllModals = () => {
    if (processingPayment) return;

    setShowPaymentModal(false);
    setShowModal(false);
  };

  const addToCart = (product) => {
    const existing = cart.find((item) => item.product_id === product.id);
    const currentQuantity = existing?.quantity || 0;

    if (currentQuantity >= product.stock_quantity) {
      alert(
        `Only ${product.stock_quantity} unit(s) of ${product.name} are available.`
      );
      return;
    }

    if (existing) {
      const quantity = existing.quantity + 1;

      setCart((current) =>
        current.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity,
                subtotal: Number(
                  quantity * Number(item.price_per_unit)
                ).toFixed(2),
              }
            : item
        )
      );
      return;
    }

    setCart((current) => [
      ...current,
      {
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url,
        price_per_unit: Number(product.price),
        quantity: 1,
        subtotal: Number(product.price),
      },
    ]);
  };

  const removeFromCart = (productId) => {
    setCart((current) =>
      current.filter((item) => item.product_id !== productId)
    );
  };

  const updateQuantity = (productId, nextQuantity) => {
    const quantity = Number(nextQuantity);

    if (!Number.isInteger(quantity) || quantity < 1) return;

    const product = products.find(
      (item) => Number(item.id) === Number(productId)
    );

    if (product && quantity > product.stock_quantity) {
      alert(
        `Only ${product.stock_quantity} unit(s) of ${product.name} are available.`
      );
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity,
              subtotal: Number(
                quantity * Number(item.price_per_unit)
              ).toFixed(2),
            }
          : item
      )
    );
  };

  const handleProceedToPayment = () => {
    if (customerType === 'registered' && !selectedClient) {
      alert('Please select a registered client.');
      return;
    }

    if (customerType === 'walkin' && !walkInName.trim()) {
      alert('Please enter the walk-in customer name.');
      return;
    }

    if (customerType === 'walkin' && !walkInContact.trim()) {
      alert('Please enter the walk-in customer contact number.');
      return;
    }

    if (customerType === 'registered' && !selectedOnlineOrderId && cart.length === 0) {
      alert(
        'Select a pending online order to include, or add at least one new walk-in product.'
      );
      return;
    }

    if (customerType === 'walkin' && cart.length === 0) {
      alert('Please add at least one walk-in product.');
      return;
    }

    if (totalDue <= 0) {
      alert('The total amount must be greater than zero.');
      return;
    }

    setCashReceived('');
    setShowPaymentModal(true);
  };

  const handleCompletePayment = async () => {
    const paid = Number(cashReceived);

    if (!Number.isFinite(paid) || paid < totalDue) {
      alert(`Insufficient cash. Total due is ${money(totalDue)}.`);
      return;
    }

    setProcessingPayment(true);

    try {
      const { data, error } = await supabase.rpc(
        'process_employee_checkout',
        {
          p_client_id:
            customerType === 'registered' ? selectedClient : null,
          p_walk_in_name:
            customerType === 'walkin' ? walkInName.trim() : null,
          p_walk_in_contact:
            customerType === 'walkin' ? walkInContact.trim() : null,
          p_online_order_id:
            customerType === 'registered'
              ? selectedOnlineOrderId
              : null,
          p_items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          p_amount_paid: paid,
        }
      );

      if (error) throw error;

      const mode = data?.mode;

      alert(
        mode === 'mixed'
          ? `✅ Checkout completed!\n\nOne receipt was generated for the online order and the added walk-in item(s).`
          : mode === 'online_only'
            ? `✅ Online order paid successfully.\n\nOne receipt was completed.`
            : `✅ Walk-in sale completed!\n\nReceipt recorded successfully.`
      );

      setShowPaymentModal(false);
      setShowModal(false);
      resetModal();

      await Promise.all([
        fetchOrders(),
        fetchProducts(),
        selectedClient
          ? fetchPendingOnlineOrders(selectedClient)
          : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Checkout error:', error);
      alert(
        `Error completing checkout:\n${error?.message || 'Unknown error'}`
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const selectedClientRecord = clients.find(
    (client) => client.id === selectedClient
  );

  const selectedClientName =
    selectedClientRecord?.full_name ||
    [selectedClientRecord?.first_name, selectedClientRecord?.last_name]
      .filter(Boolean)
      .join(' ') ||
    'Selected Client';

  const renderOrderType = (order) => {
    if (order.transaction_type === 'mixed') {
      return (
        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
          Mixed
        </span>
      );
    }

    if (order.transaction_type === 'walk_in' || order.is_walk_in) {
      return (
        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
          Walk-in
        </span>
      );
    }

    return (
      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
        Online
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
            Employee Sales
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            Order Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Process online orders, registered-client walk-ins, and new walk-in sales.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewOrder}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
        >
          + New Walk-in / Checkout
        </button>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {orders.length} transaction{orders.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-500">
              Search by order number, customer, status, or transaction type.
            </p>
          </div>

          <div className="flex w-full gap-2 md:max-w-xl">
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />

            {orderSearch && (
              <button
                type="button"
                onClick={() => setOrderSearch('')}
                className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[950px] w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Order #
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    #{order.id}
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">
                      {order.is_walk_in
                        ? order.walk_in_name || order.client?.full_name || 'Walk-in Customer'
                        : order.client?.full_name || 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.client?.email || order.walk_in_contact || 'No email'}
                    </p>
                  </td>

                  <td className="px-5 py-4">{renderOrderType(order)}</td>

                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {money(order.total_amount)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        order.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : order.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleString('en-PH')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No orders found.
          </div>
        )}
      </div>

      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/20 bg-slate-50 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
                    Checkout Flow
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    Walk-in / Existing Client Checkout
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm text-slate-500">
                    Choose the client, optionally include a pending online order, then add the new walk-in item(s).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAllModals}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
                <div className="grid gap-6 lg:grid-cols-[1.05fr_1.15fr]">
                  <div className="space-y-6">
                    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                          Step 1
                        </p>
                        <h4 className="mt-1 text-lg font-bold text-slate-950">
                          Customer
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerType('registered');
                            setWalkInName('');
                            setWalkInContact('');
                          }}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            customerType === 'registered'
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'text-slate-600 hover:bg-white/70'
                          }`}
                        >
                          👤 Existing Client
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCustomerType('walkin');
                            setSelectedClient('');
                            setClientSearch('');
                            setPendingOnlineOrders([]);
                            setSelectedOnlineOrderId(null);
                          }}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            customerType === 'walkin'
                              ? 'bg-white text-orange-700 shadow-sm'
                              : 'text-slate-600 hover:bg-white/70'
                          }`}
                        >
                          🚶 New Walk-in
                        </button>
                      </div>

                      {customerType === 'registered' ? (
                        <div className="mt-5">
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                              ⌕
                            </span>

                            <input
                              type="text"
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              placeholder="Search Michael, email, contact..."
                              className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                          </div>

                          <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                            {filteredClients.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                                No approved client found.
                              </div>
                            ) : (
                              filteredClients.map((client) => {
                                const isSelected = client.id === selectedClient;

                                return (
                                  <button
                                    key={client.id}
                                    type="button"
                                    onClick={() => setSelectedClient(client.id)}
                                    className={`w-full rounded-2xl border p-3 text-left transition ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-600">
                                        {client.full_name?.charAt(0)?.toUpperCase() || 'C'}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                          {client.full_name || 'Unnamed Client'}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                          {client.email || 'No email'}
                                        </p>
                                      </div>

                                      {isSelected && (
                                        <span className="text-lg text-blue-600">✓</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>

                          {selectedClient && (
                            <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                Selected Client
                              </p>
                              <div className="mt-1 flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold">
                                  {selectedClientName}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setSelectedClient('')}
                                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20"
                                >
                                  Change
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-5 space-y-4">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Customer Name *
                            </label>
                            <input
                              value={walkInName}
                              onChange={(e) => setWalkInName(e.target.value)}
                              placeholder="Enter customer name..."
                              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Contact Number *
                            </label>
                            <input
                              value={walkInContact}
                              onChange={(e) => setWalkInContact(e.target.value)}
                              placeholder="Enter contact number..."
                              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            />
                          </div>
                        </div>
                      )}
                    </section>

                    {customerType === 'registered' && selectedClient && (
                      <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                        <div className="mb-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                            Step 2
                          </p>
                          <h4 className="mt-1 text-lg font-bold text-amber-950">
                            Pending Online Orders
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-amber-800">
                            Select an unpaid online order only when the client will pay for it at this checkout.
                          </p>
                        </div>

                        {loadingPendingOrders ? (
                          <div className="rounded-2xl bg-white/70 p-6 text-center text-sm text-slate-500">
                            Loading pending online orders...
                          </div>
                        ) : pendingOnlineOrders.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-amber-300 bg-white/70 p-6 text-center">
                            <p className="text-sm font-semibold text-amber-900">
                              No pending online orders for {selectedClientName}.
                            </p>
                            <p className="mt-1 text-xs text-amber-700">
                              You can continue with a new walk-in product.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {pendingOnlineOrders.map((order) => {
                              const selected =
                                Number(selectedOnlineOrderId) === Number(order.id);

                              return (
                                <button
                                  key={order.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedOnlineOrderId(
                                      selected ? null : order.id
                                    )
                                  }
                                  className={`w-full rounded-2xl border bg-white p-4 text-left transition ${
                                    selected
                                      ? 'border-amber-500 ring-2 ring-amber-200'
                                      : 'border-amber-200 hover:border-amber-400'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-bold text-slate-900">
                                        Online Order #{order.id}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {new Date(order.created_at).toLocaleString('en-PH')}
                                      </p>
                                    </div>

                                    <div className="text-right">
                                      <p className="text-sm font-black text-amber-800">
                                        {money(order.total_amount)}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-amber-700">
                                        {selected ? '☑ Included' : '☐ Include'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {(order.order_items || []).map((item, index) => (
                                      <span
                                        key={index}
                                        className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                                      >
                                        {item.product?.name || 'Product'} × {item.quantity}
                                      </span>
                                    ))}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    )}

                    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                          {customerType === 'registered' ? 'Step 3' : 'Step 2'}
                        </p>
                        <h4 className="mt-1 text-lg font-bold text-slate-950">
                          Add Walk-in Product
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          These items will be recorded as <strong>WALK-IN</strong> items.
                        </p>
                      </div>

                      <div className="relative mb-4">
                        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                          ⌕
                        </span>
                        <input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search product or category..."
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>

                      <div className="grid max-h-72 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                        {filteredProducts.length === 0 ? (
                          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                            No products found.
                          </div>
                        ) : (
                          filteredProducts.map((product) => {
                            const inCart = cart.find(
                              (item) => item.product_id === product.id
                            );
                            const atLimit =
                              inCart?.quantity >= product.stock_quantity;

                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => addToCart(product)}
                                disabled={atLimit}
                                className={`group rounded-2xl border p-3 text-left transition ${
                                  atLimit
                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-md'
                                }`}
                              >
                                <div className="flex gap-3">
                                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                    {product.image_url ? (
                                      <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                        No img
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                                      {product.name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {product.category || 'General Parts'}
                                    </p>

                                    <div className="mt-2 flex items-center justify-between gap-2">
                                      <span className="text-sm font-bold text-emerald-600">
                                        {money(product.price)}
                                      </span>

                                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                        {inCart
                                          ? `${inCart.quantity}/${product.stock_quantity}`
                                          : `${product.stock_quantity} stock`}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </section>
                  </div>

                  <aside className="min-w-0">
                    <section className="sticky top-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="border-b border-slate-100 pb-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                          Final Review
                        </p>
                        <h4 className="mt-1 text-xl font-black text-slate-950">
                          Checkout Summary
                        </h4>
                      </div>

                      {selectedOnlineOrder && (
                        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                ONLINE
                              </p>
                              <p className="mt-1 text-sm font-bold text-blue-950">
                                Order #{selectedOnlineOrder.id}
                              </p>
                            </div>
                            <p className="text-sm font-black text-blue-900">
                              {money(onlineTotal)}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                            WALK-IN
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {money(walkInTotal)}
                          </p>
                        </div>

                        {cart.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                            <p className="text-sm text-slate-500">
                              No new walk-in item added.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {cart.map((item) => (
                              <div
                                key={item.product_id}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {item.product_name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {money(item.price_per_unit)} each
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeFromCart(item.product_id)}
                                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50"
                                  >
                                    Remove
                                  </button>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuantity(
                                          item.product_id,
                                          item.quantity - 1
                                        )
                                      }
                                      disabled={item.quantity <= 1}
                                      className="h-9 w-9 text-slate-600 disabled:opacity-30"
                                    >
                                      −
                                    </button>

                                    <span className="w-9 text-center text-sm font-semibold">
                                      {item.quantity}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuantity(
                                          item.product_id,
                                          item.quantity + 1
                                        )
                                      }
                                      className="h-9 w-9 text-slate-600"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <p className="text-sm font-bold text-slate-950">
                                    {money(item.subtotal)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-5 rounded-[22px] bg-slate-950 p-5 text-white">
                        <div className="flex items-center justify-between text-sm text-slate-300">
                          <span>Online</span>
                          <span>{money(onlineTotal)}</span>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                          <span>Walk-in</span>
                          <span>{money(walkInTotal)}</span>
                        </div>

                        <div className="my-4 border-t border-white/10" />

                        <div className="flex items-end justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-300">
                            TOTAL DUE
                          </span>
                          <span className="text-3xl font-black">
                            {money(totalDue)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowModal(false)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={handleProceedToPayment}
                          disabled={totalDue <= 0}
                          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Proceed to Payment
                        </button>
                      </div>
                    </section>
                  </aside>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showPaymentModal &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                  Final Checkout
                </p>

                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  Cash Payment
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  One cash payment will settle the selected order and all added walk-in items.
                </p>
              </div>

              <div className="space-y-5 p-6 sm:p-8">
                <div className="rounded-2xl bg-slate-950 p-5 text-white">
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Online</span>
                    <span>{money(onlineTotal)}</span>
                  </div>

                  <div className="mt-2 flex justify-between text-sm text-slate-300">
                    <span>Walk-in</span>
                    <span>{money(walkInTotal)}</span>
                  </div>

                  <div className="my-4 border-t border-white/10" />

                  <div className="flex items-end justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-300">
                      TOTAL DUE
                    </span>
                    <span className="text-3xl font-black">
                      {money(totalDue)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-blue-500/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-blue-300">
                        ONLINE
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {money(onlineTotal)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-orange-500/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-orange-300">
                        WALK-IN
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {money(walkInTotal)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Cash Received
                  </label>

                  <input
                    autoFocus
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Enter cash received..."
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-lg font-semibold outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-emerald-800">
                      CHANGE
                    </span>
                    <span className="text-3xl font-black text-emerald-700">
                      {money(changeAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    disabled={processingPayment}
                    className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleCompletePayment}
                    disabled={
                      processingPayment ||
                      !cashReceived ||
                      Number(cashReceived) < totalDue
                    }
                    className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingPayment
                      ? 'Completing Payment...'
                      : 'Complete Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default OrderManagement;

