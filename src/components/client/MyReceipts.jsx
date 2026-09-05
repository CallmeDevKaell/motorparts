import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

const MyReceipts = ({ clientId }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    if (clientId) {
      fetchReceipts();
    }
  }, [clientId]);

  const fetchReceipts = async () => {
    setLoading(true);

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_date,
          total_amount,
          status,
          admin_approved,
          created_at,
          order_items(
            product:product_id(name, price),
            quantity,
            price_per_unit,
            subtotal
          )
        `)
        .eq('client_id', clientId)
        .eq('admin_approved', true)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const orderIds = (ordersData || []).map((order) => order.id);

      if (orderIds.length === 0) {
        setReceipts([]);
        return;
      }

      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select(`
          id,
          receipt_number,
          is_approved,
          sent_to_client,
          generated_at,
          approved_at,
          order_id
        `)
        .in('order_id', orderIds)
        .eq('is_approved', true)
        .eq('sent_to_client', true);

      if (receiptsError) throw receiptsError;

      const receiptMap = new Map(
        (receiptsData || []).map((receipt) => [receipt.order_id, receipt])
      );

      const receiptOrders = (ordersData || [])
        .filter((order) => receiptMap.has(order.id))
        .map((order) => ({
          ...order,
          receipt: receiptMap.get(order.id)
        }));

      setReceipts(receiptOrders);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const viewReceiptDetails = (orderId) => {
    setSelectedReceipt(selectedReceipt?.id === orderId ? null : receipts.find(r => r.id === orderId));
  };

  if (loading) {
    return <div className="text-center py-8">Loading your receipts...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🧾 My Receipts</h2>
      
      {receipts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-4">📭</p>
          <p>You don't have any receipts yet.</p>
          <p className="text-sm mt-2">Visit our store to make a purchase!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {receipts.map((order) => (
            <div key={order.id} className="border rounded-lg overflow-hidden">
              {/* Receipt Header - Click to expand */}
              <div 
                className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                onClick={() => viewReceiptDetails(order.id)}
              >
                <div>
                  <p className="font-semibold">
                    Receipt #{order.receipt?.receipt_number || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.order_date).toLocaleDateString('en-PH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-green-600">
                    ₱{order.total_amount?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-sm">
                    {selectedReceipt?.id === order.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Receipt Details - Expanded */}
              {selectedReceipt?.id === order.id && (
                <div className="p-4 border-t">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Product</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Qty</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Price</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {order.order_items?.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2">{item.product?.name || 'Unknown'}</td>
                            <td className="px-4 py-2">{item.quantity}</td>
                            <td className="px-4 py-2">₱{item.price_per_unit?.toFixed(2) || '0.00'}</td>
                            <td className="px-4 py-2 font-medium">₱{item.subtotal?.toFixed(2) || '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold">
                        <tr>
                          <td colSpan="3" className="px-4 py-2 text-right">Total:</td>
                          <td className="px-4 py-2 text-green-600">
                            ₱{order.total_amount?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="mt-4 text-sm text-gray-500 flex justify-between">
                    <span>Status: <span className="text-green-600 font-medium">✓ Paid</span></span>
                    {order.receipt?.approved_at && (
                      <span>Approved: {new Date(order.receipt.approved_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReceipts;