import { Link } from 'react-router-dom';
import motorPartsLogo from '../../assets/motorparts.png';

const Navbar = () => {
	return (
		<nav className="relative z-20">
			<div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/85 px-4 py-4 shadow-sm backdrop-blur md:px-6 md:py-5">
				<Link to="/" className="inline-flex items-center" aria-label="Motor Parts Marketplace home">
					<div className="relative h-11 w-[260px] overflow-hidden sm:h-12 sm:w-[320px]">
						<img
							src={motorPartsLogo}
							alt="Motor Parts Marketplace"
							className="absolute left-1/2 top-1/2 w-[460px] max-w-none -translate-x-1/2 -translate-y-1/2 mix-blend-multiply sm:w-[560px]"
						/>
					</div>
				</Link>
				<div className="flex items-center gap-3 sm:gap-4">
					<a
						href="#products"
						className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-blue-700"
					>
						Browse Products
					</a>
					<Link
						to="/login"
						className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:text-sky-700"
					>
						Log In
					</Link>
					<Link
						to="/register"
						className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
					>
						Sign Up
					</Link>
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
