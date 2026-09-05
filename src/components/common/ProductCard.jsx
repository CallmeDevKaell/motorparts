const ProductCard = ({ product }) => {
  return (
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
          ) : <span />}
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
            <span className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
              product.stock_quantity > 0
                ? 'bg-emerald-400/90 text-emerald-950'
                : 'bg-slate-900/80 text-white'
            }`}>
              {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
            </span>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h4 className="line-clamp-1 text-lg font-semibold text-slate-900">{product.name}</h4>
          <span className="whitespace-nowrap text-2xl font-bold text-emerald-600">
            ₱{Number(product.price).toFixed(2)}
          </span>
        </div>
        <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">
          {product.description || 'No description available'}
        </p>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Availability</p>
            <p className={`text-sm font-semibold ${
              product.stock_quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {product.stock_quantity > 0 ? 'Ready for order' : 'Currently unavailable'}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-blue-600"
          >
            View Item
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
