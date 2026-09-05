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
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price_per_unit }
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
    if (newQuantity < 1) return;
    setCart(cart.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price_per_unit }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Create New Order</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select Client *</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Available Products</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="border rounded-lg p-2 text-left hover:bg-blue-50 transition"
                  >
                    <div className="text-sm font-medium">{product.name}</div>
                    <div className="text-xs text-gray-500">₱{product.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Cart</h4>
              {cart.length === 0 ? (
                <div className="text-gray-500 text-sm">No items in cart</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm">Product</th>
                        <th className="px-3 py-2 text-left text-sm">Price</th>
                        <th className="px-3 py-2 text-left text-sm">Qty</th>
                        <th className="px-3 py-2 text-left text-sm">Subtotal</th>
                        <th className="px-3 py-2 text-left text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => (
                        <tr key={item.product_id}>
                          <td className="px-3 py-2">{item.product_name}</td>
                          <td className="px-3 py-2">₱{item.price_per_unit.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value))}
                              className="w-16 border rounded px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">₱{item.subtotal.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeFromCart(item.product_id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="font-bold">
                      <tr>
                        <td colSpan="3" className="px-3 py-2 text-right">Total:</td>
                        <td className="px-3 py-2">₱{calculateTotal().toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={loading || cart.length === 0 || !selectedClient}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Create Order & Generate Receipt'}
              </button>
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