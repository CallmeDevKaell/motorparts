import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const OrderManagement = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [formData, setFormData] = useState({
    client_id: '',
    items: [],
    total_amount: 0
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchClients();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, client:client_id(full_name, email), employee:employee_id(full_name)')
      .order('created_at', { ascending: false });
    
    if (!error) setOrders(data || []);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .gt('stock_quantity', 0);
    
    if (!error) setProducts(data || []);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'client')
      .eq('is_approved', true);
    
    if (!error) setClients(data || []);
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    const currentQuantity = existing?.quantity || 0;

    if (currentQuantity >= product.stock_quantity) {
      alert(`Only ${product.stock_quantity} unit(s) of ${product.name} are available.`);
      return;
    }

    if (existing) {
      const nextQuantity = existing.quantity + 1;
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: nextQuantity, subtotal: nextQuantity * item.price_per_unit }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        price_per_unit: product.price,
        quantity: 1,
        subtotal: product.price
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (!Number.isFinite(newQuantity) || newQuantity < 1) return;
    const product = products.find((item) => item.id === productId);
    if (product && newQuantity > product.stock_quantity) {
      alert(`Only ${product.stock_quantity} unit(s) of ${product.name} are available.`);
      return;
    }
    setCart(cart.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price_per_unit }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const filteredClients = clients.filter((client) => {
    const term = clientSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      client.full_name?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term)
    );
  });

  const filteredProducts = products.filter((product) => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      product.name?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
  });

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }
    if (cart.length === 0) {
      alert('Please add items to the order');
      return;
    }

    setLoading(true);
    const total = calculateTotal();

    try {
      // 1. Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          client_id: selectedClient,
          employee_id: user.id,
          total_amount: total,
          status: 'pending',
          admin_approved: false
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Update product stock
      for (const item of cart) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const newStock = product.stock_quantity - item.quantity;
          await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', item.product_id);
        }
      }

      // 4. Create receipt
      const receiptNumber = `RCP-${Date.now()}`;
      const { error: receiptError } = await supabase
        .from('receipts')
        .insert([{
          order_id: orderData.id,
          receipt_number: receiptNumber,
          generated_by: user.id,
          is_approved: false,
          sent_to_client: false
        }]);

      if (receiptError) throw receiptError;

      // 5. Create approval request for receipt
      const { error: approvalError } = await supabase
        .from('approval_requests')
        .insert([{
          request_type: 'receipt',
          requested_by: user.id,
          target_id: orderData.id,
          status: 'pending'
        }]);

      if (approvalError) throw approvalError;

      alert('Order created! Receipt sent to admin for approval.');
      setShowModal(false);
      setCart([]);
      setSelectedClient('');
      fetchOrders();
    } catch (error) {
      alert('Error creating order: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <button
          onClick={() => {
            setCart([]);
            setSelectedClient('');
            setClientSearch('');
            setProductSearch('');
            setShowModal(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          + New Order
        </button>
      </div>

      {/* Orders List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Order #</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Client</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Total</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Admin Approval</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">#{order.id}</td>
                <td className="px-4 py-3">{order.client?.full_name || 'N/A'}</td>
                <td className="px-4 py-3 font-medium">₱{order.total_amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-sm ${
                    order.admin_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.admin_approved ? '✅ Approved' : '⏳ Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No orders yet. Create your first order!
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showModal && (
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-slate-50 shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Sales Flow</p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Create New Order</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose a client, add available parts, then generate the receipt.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
                {/* Left: Client + Products */}
                <div className="min-w-0 space-y-6">
                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">1. Client</p>
                        <h4 className="mt-1 text-lg font-bold text-slate-950">Select Client</h4>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Approved clients</span>
                    </div>

                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">⌕</span>
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search client name or email..."
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
                      {filteredClients.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          No approved client found.
                        </div>
                      ) : (
                        filteredClients.map((client) => {
                          const isSelected = selectedClient === client.id;
                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => setSelectedClient(client.id)}
                              className={`w-full rounded-2xl border p-3 text-left transition ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {client.full_name?.charAt(0)?.toUpperCase() || 'C'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-900">{client.full_name || 'Unnamed Client'}</p>
                                  <p className="truncate text-xs text-slate-500">{client.email}</p>
                                </div>
                                {isSelected && <span className="text-lg text-blue-600">✓</span>}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {selectedClient && (
                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Selected client</p>
                          <p className="truncate text-sm font-semibold">
                            {clients.find((client) => client.id === selectedClient)?.full_name || 'Client'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedClient('')}
                          className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/20"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </section>

                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">2. Products</p>
                        <h4 className="mt-1 text-lg font-bold text-slate-950">Available Stock</h4>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {products.length} available
                      </span>
                    </div>

                    <div className="relative mb-4">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">⌕</span>
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products or categories..."
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div className="grid max-h-72 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                      {filteredProducts.length === 0 ? (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          No products found.
                        </div>
                      ) : (
                        filteredProducts.map((product) => {
                          const inCart = cart.find((item) => item.product_id === product.id);
                          const atLimit = inCart?.quantity >= product.stock_quantity;
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => addToCart(product)}
                              disabled={atLimit}
                              className={`group rounded-2xl border p-3 text-left transition ${
                                atLimit
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md'
                              }`}
                            >
                              <div className="flex gap-3">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                  {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-slate-400">No img</div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p>
                                  <p className="mt-1 text-xs text-slate-500">{product.category || 'General Parts'}</p>
                                  <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="text-sm font-bold text-emerald-600">₱{Number(product.price).toFixed(2)}</span>
                                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                      atLimit ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {inCart ? `${inCart.quantity}/${product.stock_quantity}` : `${product.stock_quantity} stock`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">Click a product to add one unit to the cart.</p>
                  </section>
                </div>

                {/* Right: Cart */}
                <aside className="min-w-0">
                  <section className="sticky top-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">3. Review</p>
                        <h4 className="mt-1 text-lg font-bold text-slate-950">Order Cart</h4>
                      </div>
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
                    </div>

                    {cart.length === 0 ? (
                      <div className="my-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🛒</div>
                        <p className="text-sm font-semibold text-slate-700">Your cart is empty</p>
                        <p className="mt-1 text-xs text-slate-500">Select a product from the left to add it here.</p>
                      </div>
                    ) : (
                      <div className="my-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                        {cart.map((item) => (
                          <div key={item.product_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.product_name}</p>
                                <p className="mt-1 text-xs text-slate-500">₱{Number(item.price_per_unit).toFixed(2)} each</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product_id)}
                                className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="h-9 w-9 text-slate-600 disabled:opacity-30"
                                >
                                  −
                                </button>
                                <span className="w-8 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                  className="h-9 w-9 text-slate-600"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-sm font-bold text-slate-950">₱{Number(item.subtotal).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-2xl bg-slate-950 p-4 text-white">
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span>Items</span>
                        <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} unit(s)</span>
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <span className="text-sm font-medium text-slate-300">Order Total</span>
                        <span className="text-2xl font-black">₱{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitOrder}
                        disabled={loading || cart.length === 0 || !selectedClient}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {loading ? 'Processing...' : 'Create Order & Generate Receipt'}
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
};

export default OrderManagement;