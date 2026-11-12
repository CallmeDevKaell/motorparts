import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const productViews = [
  { key: 'all', label: '📦 All Products' },
  { key: 'new', label: '🆕 New' },
  { key: 'promo', label: '🔥 Promo & Sale' }
];

const money = (value) => `₱${Number(value || 0).toFixed(2)}`;

const ClientProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeView, setActiveView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCart, setShowCart] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesView =
        activeView === 'all'
          ? true
          : activeView === 'new'
            ? product.is_new_arrival
            : product.is_best_offer;

      const normalizedSearch = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        product.name?.toLowerCase().includes(normalizedSearch) ||
        product.description?.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        !selectedCategory || product.category === selectedCategory;

      return matchesView && matchesSearch && matchesCategory;
    });
  }, [products, activeView, searchTerm, selectedCategory]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
    [cart]
  );

  const cartUnits = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  const addToCart = (product) => {
    if (!product || Number(product.stock_quantity) <= 0) return;

    const existing = cart.find((item) => item.product_id === product.id);

    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        alert(`Only ${product.stock_quantity} unit(s) of ${product.name} are available.`);
        return;
      }

      const quantity = existing.quantity + 1;

      setCart((current) =>
        current.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity,
                subtotal: quantity * Number(item.price_per_unit)
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
        price_per_unit: Number(product.price),
        quantity: 1,
        subtotal: Number(product.price),
        image_url: product.image_url
      }
    ]);
  };

  const updateCartQuantity = (productId, nextQuantity) => {
    const product = products.find((item) => item.id === productId);

    if (!product || !Number.isFinite(nextQuantity) || nextQuantity < 1) return;

    if (nextQuantity > Number(product.stock_quantity)) {
      alert(`Only ${product.stock_quantity} unit(s) of ${product.name} are available.`);
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: nextQuantity,
              subtotal: nextQuantity * Number(item.price_per_unit)
            }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((current) =>
      current.filter((item) => item.product_id !== productId)
    );
  };

  const handlePlaceOrder = async () => {
    if (!user?.id) {
      alert('Please log in again before placing an order.');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    const confirmed = window.confirm(
      `Place this online order for ${money(cartTotal)}?`
    );

    if (!confirmed) return;

    setPlacingOrder(true);

    try {
      const { data: orderId, error } = await supabase.rpc(
        'create_client_order',
        {
          p_items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity
          }))
        }
      );

      if (error) throw error;

      setCart([]);
      setShowCart(false);

      alert(
        `✅ Online order #${orderId} placed successfully.\n\n` +
        `Your order is now pending and will appear in My Receipts.`
      );

      await fetchProducts();
    } catch (error) {
      console.error('Error placing online order:', error);
      alert(
        `Unable to place the online order.\n\n${error?.message || 'Please try again.'}`
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff_50%,#f0fdf4)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Client Catalog
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Browse products in a cleaner customer view.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Add products to your cart, review everything together, then place one online order.
              You can still add more items when you visit the shop.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="relative w-fit rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700"
          >
            🛒 Cart · {cartUnits}
            {cartUnits > 0 && (
              <span className="ml-2 text-emerald-300">
                {money(cartTotal)}
              </span>
            )}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
            {products.length} listed items
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-cyan-700 shadow-sm">
            {products.filter((product) => product.is_new_arrival).length} new
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm">
            {products.filter((product) => product.is_best_offer).length} promo
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap gap-2">
          {productViews.map((view) => (
            <button
              key={view.key}
              type="button"
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
              type="button"
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
        <div className="rounded-[28px] border border-slate-200 bg-white py-14 text-center text-slate-500 shadow-sm">
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white py-14 text-center text-slate-500">
          <p className="mb-2 text-4xl">🔍</p>
          <p>No products found in this view.</p>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm text-slate-500">
            Showing {filteredProducts.length} product
            {filteredProducts.length !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find(
                (item) => item.product_id === product.id
              );

              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">
                        📦
                      </div>
                    )}

                    <div className="absolute left-4 top-4 flex gap-2">
                      {product.is_new_arrival && (
                        <span className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-bold text-cyan-950">
                          NEW
                        </span>
                      )}
                      {product.is_best_offer && (
                        <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">
                          PROMO
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow">
                        {product.category || 'General Parts'}
                      </span>

                      <span className="rounded-full bg-emerald-400/90 px-3 py-1 text-xs font-semibold text-emerald-950 shadow">
                        {product.stock_quantity} in stock
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h4 className="line-clamp-1 text-lg font-semibold text-slate-900">
                        {product.name}
                      </h4>
                      <span className="whitespace-nowrap text-xl font-black text-emerald-600">
                        {money(product.price)}
                      </span>
                    </div>

                    <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">
                      {product.description || 'No description available'}
                    </p>

                    <div className="flex gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        View Item
                      </button>

                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={
                          Number(product.stock_quantity) <= 0 ||
                          Number(inCart?.quantity || 0) >= Number(product.stock_quantity)
                        }
                        className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {inCart ? `+ Add (${inCart.quantity})` : '🛒 Add to Cart'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {showCart && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setShowCart(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Online Shopping
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    My Cart
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Review all items before placing the online order.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCart(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <div className="text-4xl">🛒</div>
                  <p className="mt-3 font-semibold text-slate-700">
                    Your cart is empty.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add products from the catalog first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const product = products.find(
                      (product) => product.id === item.product_id
                    );

                    return (
                      <div
                        key={item.product_id}
                        className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              📦
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">
                            {item.product_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {money(item.price_per_unit)} each
                          </p>

                          <div className="mt-2 inline-flex items-center rounded-xl border border-slate-200 bg-slate-50">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  item.product_id,
                                  item.quantity - 1
                                )
                              }
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 text-slate-600 disabled:opacity-30"
                            >
                              −
                            </button>

                            <span className="w-8 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  item.product_id,
                                  item.quantity + 1
                                )
                              }
                              disabled={
                                !product ||
                                item.quantity >= Number(product.stock_quantity)
                              }
                              className="h-8 w-8 text-slate-600 disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-slate-900">
                            {money(item.subtotal)}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product_id)}
                            className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 rounded-[22px] bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>{cartUnits} unit(s)</span>
                  <span>Online order total</span>
                </div>

                <div className="mt-2 flex items-end justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-300">
                    Total
                  </span>
                  <span className="text-3xl font-black">
                    {money(cartTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCart(false)}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Shopping
              </button>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={placingOrder || cart.length === 0}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {placingOrder ? 'Placing Order...' : 'Place Online Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[30px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/9] bg-slate-100">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl">
                  📦
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-slate-700 shadow"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    {selectedProduct.category || 'General Parts'}
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    {selectedProduct.name}
                  </h3>
                </div>

                <p className="text-2xl font-black text-emerald-600">
                  {money(selectedProduct.price)}
                </p>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                {selectedProduct.description || 'No description available.'}
              </p>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                {selectedProduct.stock_quantity} unit(s) currently in stock.
              </div>

              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProduct);
                  setSelectedProduct(null);
                  setShowCart(true);
                }}
                disabled={Number(selectedProduct.stock_quantity) <= 0}
                className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientProducts;
