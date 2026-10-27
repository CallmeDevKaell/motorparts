import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import ProductCard from '../components/common/ProductCard';
import Navbar from '../components/common/Navbar';

const Homepage = () => {
  const [products, setProducts] = useState([]);
  const [bestOffers, setBestOffers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setBestOffers(data.filter((product) => product.is_best_offer));
        setNewArrivals(data.filter((product) => product.is_new_arrival));
        setCategories([
          ...new Set(data.map((product) => product.category).filter(Boolean)),
        ]);
        setFilteredProducts(data);
      }

      setLoading(false);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    const term = searchTerm.trim().toLowerCase();

    if (term) {
      filtered = filtered.filter((product) =>
        [product.name, product.description, product.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  const availableProducts = products.filter(
    (product) => Number(product.stock_quantity) > 0
  ).length;

  const featuredHeroProduct = bestOffers[0] || newArrivals[0] || products[0];
  const secondaryHeroProduct = newArrivals[0] || bestOffers[1] || products[1];

  const categoryChips = useMemo(
    () => categories.slice(0, 8),
    [categories]
  );

  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  return (
    <div className="min-h-screen bg-[#f4f5f2] text-slate-950">
      {/* HERO */}
      <section
        id="home"
        className="relative overflow-hidden bg-[#f4f5f2] px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pb-24 lg:pt-7"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 top-20 h-80 w-80 rounded-full bg-orange-200/35 blur-3xl" />
          <div className="absolute right-[-120px] top-[-70px] h-[430px] w-[430px] rounded-full bg-lime-200/40 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[42%] h-72 w-72 rounded-full bg-slate-200/50 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <Navbar />

          <div className="grid items-center gap-10 pt-12 lg:grid-cols-[0.96fr_1.04fr] lg:gap-14 lg:pt-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Motorcycle Parts Marketplace
              </div>

              <h1 className="mt-7 text-5xl font-black leading-[0.94] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
                Parts for your
                <span className="block text-orange-600">next ride.</span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Browse motorcycle parts, check current stock, discover new arrivals,
                and find featured deals in one clean storefront.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={scrollToProducts}
                  className="rounded-2xl bg-slate-950 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Browse Parts →
                </button>

                <a
                  href="#why-us"
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                >
                  Why choose us
                </a>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-r border-slate-200 px-4 py-4 sm:px-5">
                  <p className="text-2xl font-black">{products.length}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Parts listed
                  </p>
                </div>

                <div className="border-r border-slate-200 px-4 py-4 sm:px-5">
                  <p className="text-2xl font-black text-orange-600">
                    {newArrivals.length}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    New arrivals
                  </p>
                </div>

                <div className="px-4 py-4 sm:px-5">
                  <p className="text-2xl font-black text-lime-600">
                    {availableProducts}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    In stock
                  </p>
                </div>
              </div>
            </div>

            {/* PRODUCT COLLAGE */}
            <div className="relative min-h-[470px] lg:min-h-[600px]">
              <div className="absolute right-4 top-4 h-52 w-52 rounded-full border border-orange-200/90" />
              <div className="absolute bottom-5 left-10 h-36 w-36 rounded-full border border-lime-300/80" />

              <div className="absolute left-0 top-8 z-20 w-[68%] overflow-hidden rounded-[30px] border border-white bg-slate-950 shadow-2xl shadow-slate-950/20">
                {featuredHeroProduct?.image_url ? (
                  <img
                    src={featuredHeroProduct.image_url}
                    alt={featuredHeroProduct.name}
                    className="h-72 w-full object-cover sm:h-[330px]"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center bg-slate-900 text-sm text-slate-400 sm:h-[330px]">
                    Product image
                  </div>
                )}

                <div className="p-5 text-white">
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Featured part
                      </p>
                      <p className="mt-1 truncate text-lg font-black">
                        {featuredHeroProduct?.name || 'Featured Motorcycle Part'}
                      </p>
                    </div>

                    <p className="whitespace-nowrap text-sm font-black text-lime-400">
                      ₱{Number(featuredHeroProduct?.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute right-0 top-28 z-30 w-[47%] overflow-hidden rounded-[26px] border border-white bg-white shadow-2xl shadow-slate-950/10">
                {secondaryHeroProduct?.image_url ? (
                  <img
                    src={secondaryHeroProduct.image_url}
                    alt={secondaryHeroProduct.name}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400">
                    Product image
                  </div>
                )}

                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600">
                    Fresh pick
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">
                    {secondaryHeroProduct?.name || 'New motorcycle parts'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {secondaryHeroProduct
                      ? `₱${Number(secondaryHeroProduct.price).toFixed(2)}`
                      : 'Explore the catalog'}
                  </p>
                </div>
              </div>

              <div className="absolute bottom-4 left-[16%] z-40 w-[62%] rounded-[25px] border border-slate-200 bg-[#f4f5f2] p-4 shadow-2xl shadow-slate-950/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-100 text-lime-700">
                    ✓
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Shop with confidence
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      Live stock visibility
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      See what is currently available before you order.
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 right-0 z-50 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Catalog status
                </p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {availableProducts} items ready
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY STRIP */}
      {categoryChips.length > 0 && (
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl overflow-x-auto px-5 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-max items-center gap-2">
              <span className="mr-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Browse by
              </span>

              {categoryChips.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category);
                    scrollToProducts();
                  }}
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                    selectedCategory === category
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:text-slate-950'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WHY US */}
      <section id="why-us" className="border-b border-slate-200 bg-[#e8ebe4]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
              Built for riders
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">
              A cleaner way to shop for motorcycle parts.
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Keep the essentials easy to find: product details, current stock,
              promos, new arrivals, and online ordering.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
                🔧
              </div>
              <h3 className="mt-5 text-lg font-black">Organized catalog</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Find parts by category and quickly scan prices, descriptions,
                and availability.
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-700">
                ★
              </div>
              <h3 className="mt-5 text-lg font-black">Offers that stand out</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Featured promos and new arrivals are surfaced clearly so you
                can spot them faster.
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-100 text-xl text-lime-700">
                ✓
              </div>
              <h3 className="mt-5 text-lg font-black">Clear stock view</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Check current stock before placing your order and complete
                your cash payment at the shop.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* PRODUCT CATALOG */}
      <section
        id="products"
        className="bg-[#f4f5f2] px-5 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                Product catalog
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-4xl">
                Find your next upgrade.
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Search the live catalog or browse every available part below.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {bestOffers.length > 0 && (
                <span className="rounded-full bg-orange-100 px-3.5 py-2 text-xs font-bold text-orange-700">
                  {bestOffers.length} promo
                  {bestOffers.length !== 1 ? 's' : ''}
                </span>
              )}

              {newArrivals.length > 0 && (
                <span className="rounded-full bg-lime-100 px-3.5 py-2 text-xs font-bold text-lime-700">
                  {newArrivals.length} new
                  {newArrivals.length !== 1 ? ' arrivals' : ' arrival'}
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  🔍
                </span>

                <input
                  type="text"
                  placeholder="Search products by name, category, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
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
                  type="button"
                  onClick={clearFilters}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <p className="font-semibold text-slate-500">
                Showing {filteredProducts.length} product
                {filteredProducts.length !== 1 ? 's' : ''}
              </p>

              <p className="font-medium text-slate-400">
                Live catalog · {availableProducts} currently in stock
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
                >
                  <div className="h-60 animate-pulse bg-slate-200" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                🔍
              </div>
              <h3 className="mt-5 text-lg font-black text-slate-950">
                No products found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Try another search term or reset the filter.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              {bestOffers.length > 0 &&
                !searchTerm &&
                !selectedCategory && (
                  <div className="mt-10">
                    <div className="mb-5 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                          Featured
                        </p>
                        <h3 className="mt-1 text-2xl font-black tracking-tight">
                          Best offers
                        </h3>
                      </div>

                      <span className="text-xs font-semibold text-slate-400">
                        {bestOffers.length} featured
                      </span>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                      {bestOffers.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                )}

              {newArrivals.length > 0 &&
                !searchTerm &&
                !selectedCategory && (
                  <div className="mt-12">
                    <div className="mb-5 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-700">
                          Fresh stock
                        </p>
                        <h3 className="mt-1 text-2xl font-black tracking-tight">
                          New arrivals
                        </h3>
                      </div>

                      <span className="text-xs font-semibold text-slate-400">
                        {newArrivals.length} new
                      </span>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                      {newArrivals.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                )}

              <div className="mt-12">
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Catalog
                  </p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight">
                    {searchTerm || selectedCategory
                      ? 'Search results'
                      : 'All products'}
                  </h3>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                Motor Parts Marketplace
              </p>
              <h3 className="mt-2 max-w-xl text-xl font-black tracking-tight sm:text-2xl">
                A cleaner way to browse, order, and upgrade your ride.
              </h3>
            </div>

            <div className="flex gap-2">
              <a
                href="#home"
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold hover:bg-white/10"
              >
                Back to top
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-5 text-xs text-slate-500">
            © {new Date().getFullYear()} Motor Parts Marketplace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
