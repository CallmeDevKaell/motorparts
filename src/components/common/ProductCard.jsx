import React, { useState } from 'react';

const ProductCard = ({ product }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <article className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
        <div className="relative overflow-hidden bg-slate-100">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center bg-[radial-gradient(circle_at_top,_#e2e8f0,_#cbd5e1)]">
              <span className="text-sm font-medium text-slate-500">No Image</span>
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            {product.is_new_arrival ? (
              <span className="rounded-full bg-cyan-500/95 px-3 py-1 text-[11px] font-semibold tracking-wide text-white shadow-lg">
                NEW
              </span>
            ) : (
              <span />
            )}

            {product.is_best_offer && (
              <span className="rounded-full bg-rose-500/95 px-3 py-1 text-[11px] font-semibold tracking-wide text-white shadow-lg">
                PROMO
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur">
                {product.category || 'General Parts'}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
                  product.stock_quantity > 0
                    ? 'bg-emerald-400/90 text-emerald-950'
                    : 'bg-slate-900/80 text-white'
                }`}
              >
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} in stock`
                  : 'Out of stock'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h4 className="line-clamp-1 text-lg font-semibold text-slate-900">
              {product.name}
            </h4>

            <span className="whitespace-nowrap text-2xl font-bold text-emerald-600">
              ₱{Number(product.price).toFixed(2)}
            </span>
          </div>

          <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">
            {product.description || 'No description available'}
          </p>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Availability
              </p>

              <p
                className={`text-sm font-semibold ${
                  product.stock_quantity > 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {product.stock_quantity > 0
                  ? 'Ready for order'
                  : 'Currently unavailable'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              View Item
            </button>
          </div>
        </div>
      </article>

      {showDetails && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetails(false);
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-white/20 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                  Product Details
                </p>
                <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {product.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-medium text-slate-600 transition hover:bg-slate-200"
                aria-label="Close product details"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto">
              <div className="grid gap-6 p-6 md:grid-cols-[1.05fr_0.95fr]">
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-[330px] w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[330px] items-center justify-center bg-[radial-gradient(circle_at_top,_#e2e8f0,_#cbd5e1)]">
                      <span className="text-sm font-medium text-slate-500">
                        No Image Available
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {product.category || 'General Parts'}
                    </span>

                    {product.is_new_arrival && (
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                        New Arrival
                      </span>
                    )}

                    {product.is_best_offer && (
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                        Promo
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <p className="text-sm text-slate-500">Price</p>
                    <p className="mt-1 text-4xl font-black text-emerald-600">
                      ₱{Number(product.price).toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">Stock Available</span>
                      <span
                        className={`font-bold ${
                          product.stock_quantity > 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {product.stock_quantity}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">Availability</span>
                      <span className="font-semibold text-slate-800">
                        {product.stock_quantity > 0
                          ? 'Ready for order'
                          : 'Currently unavailable'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Description
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {product.description || 'No description available.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="ml-auto block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;
