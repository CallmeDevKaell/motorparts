import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import ProductCard from '../common/ProductCard';

const productViews = [
  { key: 'all', label: '📦 All Products' },
  { key: 'new', label: '🆕 New' },
  { key: 'promo', label: '🔥 Promo & Sale' }
];

const ClientProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        setProducts(data || []);
      }

      setLoading(false);
    };

    fetchProducts();
  }, []);

  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];

  const filteredProducts = products.filter((product) => {
    const matchesView =
      activeView === 'all'
        ? true
        : activeView === 'new'
          ? product.is_new_arrival
          : product.is_best_offer;

    const matchesSearch = searchTerm
      ? product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;

    return matchesView && matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff_50%,#f0fdf4)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Client Catalog</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Browse products in a cleaner customer view.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">Switch between all products, fresh arrivals, and promo items while keeping search and category filters in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">{products.length} listed items</span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-cyan-700 shadow-sm">{products.filter((product) => product.is_new_arrival).length} new</span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm">{products.filter((product) => product.is_best_offer).length} promo</span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap gap-2">
          {productViews.map((view) => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeView === view.key
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 md:w-56"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {(searchTerm || selectedCategory) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
            }}
            className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
          >
            Clear
          </button>
        )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white py-14 text-center text-slate-500 shadow-sm">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white py-14 text-center text-slate-500">
          <p className="mb-2 text-4xl">🔍</p>
          <p>No products found in this view.</p>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm text-slate-500">
            Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientProducts;