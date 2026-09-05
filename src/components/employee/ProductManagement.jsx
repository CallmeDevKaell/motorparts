import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const ProductManagement = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    stock_quantity: '',
    is_best_offer: false,
    is_new_arrival: false,
    image_url: ''
  });

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
    
    if (!error) setProducts(data || []);
    setLoading(false);
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file, productId) => {
    if (!file) return null;
    
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      setUploading(false);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    setUploading(false);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = formData.image_url;

    // Upload image if there's a new file
    if (imageFile) {
      const tempId = editingProduct?.id || Date.now().toString();
      const uploadedUrl = await uploadImage(imageFile, tempId);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    const productData = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      price: parseFloat(formData.price),
      stock_quantity: parseInt(formData.stock_quantity),
      is_best_offer: formData.is_best_offer,
      is_new_arrival: formData.is_new_arrival,
      image_url: imageUrl || null,
      created_by: user.id
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

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert(editingProduct ? 'Product updated!' : 'Product added!');
      setShowModal(false);
      resetForm();
      fetchProducts();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setImageFile(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      stock_quantity: '',
      is_best_offer: false,
      is_new_arrival: false,
      image_url: ''
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (!error) {
        alert('Product deleted!');
        fetchProducts();
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setImageFile(null);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      is_best_offer: product.is_best_offer || false,
      is_new_arrival: product.is_new_arrival || false,
      image_url: product.image_url || ''
    });
    setShowModal(true);
  };

  const toggleBestOffer = async (id, currentStatus) => {
    const { error } = await supabase
      .from('products')
      .update({ is_best_offer: !currentStatus })
      .eq('id', id);
    
    if (!error) fetchProducts();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          + Add Product
        </button>
      </div>

      {/* Product Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Image</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price</th>
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
                    <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                      No img
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{product.name}</td>
                <td className="px-4 py-3">{product.category || 'N/A'}</td>
                <td className="px-4 py-3 font-medium">₱{product.price.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                    {product.stock_quantity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleBestOffer(product.id, product.is_best_offer)}
                    className={`px-3 py-1 rounded text-sm ${
                      product.is_best_offer 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    {product.is_best_offer ? '✓ Active' : 'Set Offer'}
                  </button>
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No products yet. Click "Add Product" to get started!
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₱) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-1">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {formData.image_url && !imageFile && (
                    <div className="mt-2">
                      <img src={formData.image_url} alt="Product" className="h-20 w-20 object-cover rounded" />
                      <p className="text-xs text-gray-500 mt-1">Current image</p>
                    </div>
                  )}
                  {imageFile && (
                    <p className="text-xs text-green-600 mt-1">New image selected: {imageFile.name}</p>
                  )}
                </div>

                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_best_offer}
                      onChange={(e) => setFormData({...formData, is_best_offer: e.target.checked})}
                      className="mr-2"
                    />
                    Best Offer
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_new_arrival}
                      onChange={(e) => setFormData({...formData, is_new_arrival: e.target.checked})}
                      className="mr-2"
                    />
                    New Arrival
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : loading ? 'Saving...' : (editingProduct ? 'Update' : 'Add')}
                </button>
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

export default ProductManagement;