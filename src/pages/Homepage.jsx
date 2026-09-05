import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import ProductCard from '../components/common/ProductCard';
import Navbar from '../components/common/Navbar';

const Homepage = () => {
  const [products, setProducts] = useState([]);
  const [bestOffers, setBestOffers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProducts(data);
        setBestOffers(data.filter(p => p.is_best_offer));
        setNewArrivals(data.filter(p => p.is_new_arrival));
        
        // Get unique categories
        const uniqueCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
        setFilteredProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  // Filter products when search or category changes
  useEffect(() => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  const availableProducts = products.filter((product) => product.stock_quantity > 0).length;

  return (
    <div className="bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_16%,#ffffff_34%,#f8fafc_100%)] text-slate-900">
      <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
        <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.25),transparent_42%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.22),transparent_35%)]" />
        <div className="mx-auto max-w-7xl">
          <Navbar />
          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm backdrop-blur">
                Motor Parts Marketplace
              </span>
              <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
                Upgrade every ride with parts that look ready and perform right.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Browse trusted motorcycle parts, discover fresh arrivals, and catch promo items in one cleaner shopping view.
              </p>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-lg shadow-sky-100/60 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Catalog</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{products.length}</p>
                  <p className="mt-1 text-sm text-slate-500">Total parts listed</p>
                </div>
                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-lg shadow-sky-100/60 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">New Stock</p>
                  <p className="mt-2 text-3xl font-bold text-cyan-600">{newArrivals.length}</p>
                  <p className="mt-1 text-sm text-slate-500">Fresh arrivals</p>
                </div>
                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-lg shadow-sky-100/60 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Ready Now</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">{availableProducts}</p>
                  <p className="mt-1 text-sm text-slate-500">Items in stock</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-10 hidden h-28 w-28 rounded-full bg-cyan-200/40 blur-2xl lg:block" />
              <div className="absolute -right-4 bottom-10 hidden h-32 w-32 rounded-full bg-blue-300/40 blur-2xl lg:block" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-slate-950 p-6 text-white shadow-2xl shadow-sky-200/60">
                <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(14,165,233,0.24),transparent_40%,rgba(37,99,235,0.3))]" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-sky-100">FEATURED SHOP</span>
                    <span className="text-3xl">🏍️</span>
                  </div>
                  <div className="mt-8 space-y-4">
                    <div className="rounded-3xl bg-white/10 p-5 backdrop-blur-sm">
                      <p className="text-sm text-sky-100">Promo Picks</p>
                      <p className="mt-2 text-2xl font-bold">{bestOffers.length} items on offer</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                        <p className="text-sm text-slate-200">Trusted fit</p>
                        <p className="mt-2 text-lg font-semibold">Engine, brakes, clutch, and more</p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                        <p className="text-sm text-slate-200">Fast browsing</p>
                        <p className="mt-2 text-lg font-semibold">Search, filter, and compare available parts</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">🔧</div>
            <h3 className="text-lg font-bold text-slate-900">Quality Parts</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Premium motorcycle parts from trusted sources, organized for faster browsing.</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-2xl">🔥</div>
            <h3 className="text-lg font-bold text-slate-900">Promo Highlights</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Weekly featured deals surface immediately so customers can spot discounts faster.</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">🛡️</div>
            <h3 className="text-lg font-bold text-slate-900">Reliable Stock View</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">See what is available right away with clearer stock badges and category labels.</p>
          </div>
        </div>
      </section>

      <section id="products" className="px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Product Catalog</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Browse parts with a cleaner, more focused layout.</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">Search by keyword, narrow by category, then scan promos and new arrivals from the same product grid.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-rose-50 px-4 py-2 font-semibold text-rose-700">🔥 {bestOffers.length} promo items</span>
              <span className="rounded-full bg-cyan-50 px-4 py-2 font-semibold text-cyan-700">🆕 {newArrivals.length} new arrivals</span>
            </div>
          </div>

          <div className="mb-10 rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur md:p-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search products by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="md:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {(searchTerm || selectedCategory) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                  }}
                  className="rounded-2xl bg-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-300"
                >
                  Clear
                </button>
              )}
            </div>
            {filteredProducts.length > 0 && (
              <p className="mt-3 text-sm text-slate-500">
                Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white py-16 text-center shadow-sm">
              <div className="text-xl text-slate-500">Loading products...</div>
            </div>
          ) : (
            <>
              {bestOffers.length > 0 && !searchTerm && !selectedCategory && (
                <div className="mb-12">
                  <div className="mb-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Promo Picks</p>
                      <h3 className="mt-1 text-2xl font-bold text-slate-950">Best Offers</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {bestOffers.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}

              {newArrivals.length > 0 && !searchTerm && !selectedCategory && (
                <div className="mb-12">
                  <div className="mb-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600">Fresh Stock</p>
                      <h3 className="mt-1 text-2xl font-bold text-slate-950">New Arrivals</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {newArrivals.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-5 text-2xl font-bold text-slate-950">
                  {(searchTerm || selectedCategory) ? 'Search Results' : '📦 All Products'}
                </h3>
                {filteredProducts.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-300 bg-white py-14 text-center text-slate-500">
                    <p className="mb-4 text-4xl">🔍</p>
                    <p>No products found matching your search.</p>
                    <p className="mt-2 text-sm">Try adjusting your search terms or filters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Homepage;