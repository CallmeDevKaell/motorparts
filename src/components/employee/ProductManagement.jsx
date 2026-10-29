import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

// The percentage is a markup on purchase cost: cost + (cost * percentage).
const calculateSellingPrice = (purchasePrice, profitPercentage) => {
  if (purchasePrice === '' || profitPercentage === '') return null;
  const cost = Number(purchasePrice);
  const percentage = Number(profitPercentage);
  if (!Number.isFinite(cost) || !Number.isFinite(percentage) || cost < 0 || percentage < 0) return null;
  return Math.round((cost * (1 + percentage / 100) + Number.EPSILON) * 100) / 100;
};

const getStoredMarkup = (product) => {
  if (product.profit_percentage != null) return Number(product.profit_percentage).toFixed(2);
  const cost = Number(product.purchase_price);
  const selling = Number(product.price);
  if (product.purchase_price != null && cost > 0 && selling >= cost) {
    return (((selling - cost) / cost) * 100).toFixed(2);
  }
  return '';
};

const emptyForm = {
  name: '',
  description: '',
  category: '',
  purchase_price: '',
  profit_percentage: '',
  stock_quantity: '',
  is_best_offer: false,
  is_new_arrival: false,
  image_url: '',
};

const ProductManagement = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  const categories = ['Engine', 'Brake', 'Electrical', 'Chain', 'Tire', 'Clutch', 'Body', 'Other'];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      setFormError(`Unable to load products: ${error.message}`);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setImageFile(null);
    setFormError('');
    setFormData({ ...emptyForm });
  };

  const uploadImage = async (file, productId) => {
    if (!file) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const isLegacyProductEdit = Boolean(
      editingProduct && formData.purchase_price === '' && formData.profit_percentage === ''
    );
    const purchasePrice = formData.purchase_price === '' ? null : Number(formData.purchase_price);
    const profitPercentage = formData.profit_percentage === '' ? null : Number(formData.profit_percentage);
    const sellingPrice = isLegacyProductEdit
      ? Number(editingProduct.price)
      : calculateSellingPrice(formData.purchase_price, formData.profit_percentage);
    const stockQuantity = Number(formData.stock_quantity);

    if (!isLegacyProductEdit && (formData.purchase_price === '' || !Number.isFinite(purchasePrice) || purchasePrice < 0)) {
      setFormError('Please enter a valid purchase price (₱).');
      return;
    }
    if (!isLegacyProductEdit && (formData.profit_percentage === '' || !Number.isFinite(profitPercentage) || profitPercentage < 0)) {
      setFormError('Please enter a valid markup percentage (0 or higher).');
      return;
    }
    if (sellingPrice === null || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setFormError('Enter a purchase price and markup percentage to calculate the selling price.');
      return;
    }
    if (formData.stock_quantity === '' || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setFormError('Please enter a valid whole-number stock quantity.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = formData.image_url;
      if (imageFile) {
        const tempId = editingProduct?.id || Date.now().toString();
        imageUrl = await uploadImage(imageFile, tempId);
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category || null,
        purchase_price: isLegacyProductEdit ? null : purchasePrice,
        profit_percentage: isLegacyProductEdit ? null : profitPercentage,
        // Keep `price` as the calculated selling price so storefront/cart/order queries remain compatible.
        price: sellingPrice,
        stock_quantity: stockQuantity,
        is_best_offer: formData.is_best_offer,
        is_new_arrival: formData.is_new_arrival,
        image_url: imageUrl || null,
        ...(user?.id ? { created_by: user.id } : {}),
      };

      let error;
      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert([productData]);
        error = insertError;
      }

      if (error) throw error;

      window.alert(editingProduct ? 'Product updated!' : 'Product added!');
      setShowModal(false);
      resetForm();
      await fetchProducts();
    } catch (error) {
      console.error('Save product error:', error);
      setFormError(error?.message || 'Unable to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      window.alert(`Unable to delete product: ${error.message}`);
      return;
    }
    window.alert('Product deleted!');
    await fetchProducts();
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setImageFile(null);
    setFormError('');
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      // Older products remain blank here because their historical purchase cost is unknown.
      purchase_price: product.purchase_price == null ? '' : String(product.purchase_price),
      profit_percentage: getStoredMarkup(product),
      stock_quantity: product.stock_quantity == null ? '' : String(product.stock_quantity),
      is_best_offer: Boolean(product.is_best_offer),
      is_new_arrival: Boolean(product.is_new_arrival),
      image_url: product.image_url || '',
    });
    setShowModal(true);
  };

  const toggleBestOffer = async (id, currentStatus) => {
    const { error } = await supabase
      .from('products')
      .update({ is_best_offer: !currentStatus })
      .eq('id', id);
    if (error) {
      window.alert(`Unable to update offer: ${error.message}`);
      return;
    }
    await fetchProducts();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <button
          type="button"
          onClick={() => { resetForm(); setShowModal(true); }}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600"
        >
          + Add Product
        </button>
      </div>

      {formError && !showModal && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Image</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Purchase Price</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Markup %</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Selling Price</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stock</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Best Offer</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-200 text-xs text-gray-400">No img</div>
                  )}
                </td>
                <td className="px-4 py-3">{product.name}</td>
                <td className="px-4 py-3">{product.category || 'N/A'}</td>
                <td className="px-4 py-3 font-medium text-gray-600">
                  {product.purchase_price == null ? <span className="text-amber-600">Not set</span> : money(product.purchase_price)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {product.profit_percentage != null
                    ? `${Number(product.profit_percentage).toFixed(2)}%`
                    : product.purchase_price != null && Number(product.purchase_price) > 0 && Number(product.price) >= Number(product.purchase_price)
                      ? `${(((Number(product.price) - Number(product.purchase_price)) / Number(product.purchase_price)) * 100).toFixed(2)}%`
                      : <span className="text-amber-600">Not set</span>}
                </td>
                <td className="px-4 py-3 font-semibold">{money(product.price)}</td>
                <td className="px-4 py-3">
                  <span className={Number(product.stock_quantity) > 0 ? 'text-green-600' : 'text-red-600'}>{product.stock_quantity}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleBestOffer(product.id, product.is_best_offer)}
                    className={`rounded px-3 py-1 text-sm ${product.is_best_offer ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
                  >
                    {product.is_best_offer ? '✓ Active' : 'Set Offer'}
                  </button>
                </td>
                <td className="space-x-2 whitespace-nowrap px-4 py-3">
                  <button type="button" onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-800">✏️ Edit</button>
                  <button type="button" onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800">🗑️ Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && products.length === 0 && (
          <div className="py-8 text-center text-gray-500">No products yet. Click &quot;Add Product&quot; to get started!</div>
        )}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
            <h3 className="mb-1 text-xl font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <p className="mb-4 text-sm text-gray-500">Enter the purchase cost and markup percentage. The selling price is calculated automatically.</p>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Product Name *</label>
                  <input type="text" required maxLength={35} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <textarea maxLength={500} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" rows="3" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Category</option>
                    {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Purchase Price (₱) *</label>
                  <input type="number" required step="0.01" min="0" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} placeholder="Enter cost / puhunan" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="mt-1 text-xs text-gray-500">The amount you pay to buy the product.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Profit / Markup (%) *</label>
                  <input type="number" required min="0" step="0.01" value={formData.profit_percentage} onChange={(e) => setFormData({ ...formData, profit_percentage: e.target.value })} placeholder="e.g. 20" className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="mt-1 text-xs text-gray-500">Percentage is calculated on the purchase price (cost).</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Calculated Selling Price (₱)</label>
                  <input type="text" readOnly value={calculateSellingPrice(formData.purchase_price, formData.profit_percentage) == null ? '' : money(calculateSellingPrice(formData.purchase_price, formData.profit_percentage))} placeholder="Enter purchase price and percentage" className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-gray-700 outline-none" />
                  <p className="mt-1 text-xs text-gray-500">Example: ₱500 purchase price + 20% = ₱600 selling price. This is the price shown to customers.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Stock Quantity *</label>
                  <input type="number" required min="0" step="1" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Product Image</label>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                  {formData.image_url && !imageFile && <div className="mt-2"><img src={formData.image_url} alt="Current product" className="h-20 w-20 rounded object-cover" /><p className="mt-1 text-xs text-gray-500">Current image</p></div>}
                  {imageFile && <p className="mt-1 text-xs text-green-600">New image selected: {imageFile.name}</p>}
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center"><input type="checkbox" checked={formData.is_best_offer} onChange={(e) => setFormData({ ...formData, is_best_offer: e.target.checked })} className="mr-2" />Best Offer</label>
                  <label className="flex items-center"><input type="checkbox" checked={formData.is_new_arrival} onChange={(e) => setFormData({ ...formData, is_new_arrival: e.target.checked })} className="mr-2" />New Arrival</label>
                </div>
              </div>

              {formError && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => { setShowModal(false); setFormError(''); }} className="rounded-lg border px-4 py-2 transition hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading || uploading} className="rounded-lg bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600 disabled:opacity-50">
                  {uploading ? 'Uploading...' : loading ? 'Saving...' : editingProduct ? 'Update' : 'Add'}
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

export default ProductManagement;
