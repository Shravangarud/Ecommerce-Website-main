// Finalized JS for E-commerce Project (style.js)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isFile = window.location.protocol === 'file:';

// Logic: 
// 1. If 'file://' or 'localhost' (but NOT port 5000), assume Dev Mode -> Point to http://localhost:5000/api
// 2. Otherwise (Production or running node server on port 5000) -> Use relative path '/api'
const API_URL = (isLocalhost && window.location.port !== '5000') || isFile
	? 'http://localhost:5000/api'
	: '/api';

/* Utilities */
const CURRENCIES = {
	INR: { symbol: '₹', rate: 1 },
	USD: { symbol: '$', rate: 0.012 },
	EUR: { symbol: '€', rate: 0.011 },
	GBP: { symbol: '£', rate: 0.0094 }
};

let currentCurrency = localStorage.getItem('sp_currency') || 'INR';
let currentPage = 1;
let maxPages = 1;

function formatCurrency(n) {
	const cur = CURRENCIES[currentCurrency];
	const val = n * cur.rate;
	return cur.symbol + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const COUNTRIES = ["India", "USA", "UK", "Canada", "Australia", "Germany", "France", "Japan", "UAE", "Others"];

function populateCountries() {
	const selects = document.querySelectorAll('.country-select, #checkout-country, #profile-country');
	selects.forEach(s => {
		if (s.children.length > 0) return;
		COUNTRIES.forEach(c => {
			const opt = document.createElement('option');
			opt.value = opt.textContent = c;
			s.appendChild(opt);
		});
	});
}

function debounce(fn, wait = 300) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); }; }
function discounted(price, disc) { return +(price * (1 - disc / 100)).toFixed(2); }

/* Fetch wrapper with auth */
async function apiFetch(endpoint, options = {}) {
	const token = localStorage.getItem('sp_token');
	const headers = {
		'Content-Type': 'application/json',
		...options.headers
	};
	if (token) headers['Authorization'] = `Bearer ${token}`;

	console.log(`[API] Fetching ${endpoint}...`);
	const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

	const contentType = res.headers.get('content-type');
	let data;

	if (contentType && contentType.includes('application/json')) {
		data = await res.json();
	} else {
		// If not JSON (likely an HTML error page usually), throw helpful error
		const text = await res.text();
		console.error(`[API ERROR] Non-JSON response from ${endpoint}:`, text);
		throw new Error(`Server Error: ${res.status} ${res.statusText}`);
	}

	if (!res.ok) {
		console.error(`[API ERROR] ${endpoint}:`, data.message);

		// Auto-logout on token failure
		if (res.status === 401 || data.message === "Not authorized, token failed") {
			localStorage.removeItem('sp_current_user');
			localStorage.removeItem('sp_token');
			// Avoid infinite loop if already on login
			if (!window.location.hash.includes('login')) {
				window.location.hash = 'login';
				window.location.reload();
			}
		}

		throw new Error(data.message || 'Something went wrong');
	}
	return data;
}

/* UI Helpers */
function showMsg(id, text, type = 'error') {
	const el = document.getElementById(id);
	if (!el) return;
	el.textContent = text;
	el.className = `auth-msg ${type}`;
	setTimeout(() => { el.style.display = 'block'; }, 10);
}

function showLoading(show = true) {
	let loader = document.getElementById('sp-loader');
	if (show) {
		if (!loader) {
			loader = document.createElement('div');
			loader.id = 'sp-loader';
			loader.className = 'loading-overlay';
			loader.innerHTML = '<div class="spinner"></div>';
			document.body.appendChild(loader);
		}
	} else if (loader) {
		loader.remove();
	}
}

/* Authentication */
async function handleSignup(e) {
	e.preventDefault();
	const fd = new FormData(e.target);
	const body = Object.fromEntries(fd.entries());
	const msgId = 'signup-msg';

	try {
		showLoading(true);
		const data = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) });
		localStorage.setItem('sp_token', data.token);
		localStorage.setItem('sp_current_user', JSON.stringify(data));
		showMsg(msgId, 'Account created! Redirecting...', 'success');
		setTimeout(() => { renderAuthLinks(); navigateTo('products'); }, 1000);
	} catch (err) {
		showMsg(msgId, err.message);
	} finally {
		showLoading(false);
	}
}

async function handleLogin(e) {
	e.preventDefault();
	const fd = new FormData(e.target);
	const body = Object.fromEntries(fd.entries());
	const msgId = 'login-msg';

	console.log('[AUTH] Attempting login for:', body.email);
	try {
		showLoading(true);
		const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) });
		console.log('[AUTH] Login successful, token received.');
		localStorage.setItem('sp_token', data.token);
		localStorage.setItem('sp_current_user', JSON.stringify(data));
		showMsg(msgId, 'Logged in! Redirecting...', 'success');
		setTimeout(() => { renderAuthLinks(); navigateTo('products'); }, 800);
	} catch (err) {
		console.error('[AUTH ERROR] Login failed:', err.message);
		showMsg(msgId, err.message);
	} finally {
		showLoading(false);
	}
}

function logout() {
	localStorage.removeItem('sp_token');
	localStorage.removeItem('sp_current_user');
	renderAuthLinks();
	navigateTo('products');
}

/* Navigation & Routing */
function syncUI() {
	const hash = window.location.hash.replace('#', '') || 'products';
	const [section, id] = hash.split('/');
	const sections = document.querySelectorAll('[data-section]');
	sections.forEach(s => { s.style.display = s.dataset.section === section ? '' : 'none'; });

	if (section === 'products') loadProducts();
	if (section === 'product-detail' && id) loadProductDetail(id);
	if (section === 'cart') loadCart();
	if (section === 'order') loadOrderSummary();
	if (section === 'orders') loadOrderHistory();
	if (section === 'profile') loadProfile();
	if (section === 'wishlist') loadWishlist();
	if (section === 'admin') switchAdminTab(adminCurrentTab);
}

function navigateTo(section, id = '') {
	window.location.hash = id ? `${section}/${id}` : section;
}

/* Products */
async function loadProducts(query = '', category = 'All', page = 1) {
	const grid = document.getElementById('sp-grid');
	const catsEl = document.getElementById('sp-cats');
	const emptyEl = document.getElementById('sp-empty');

	// Sort
	const sort = document.getElementById('sp-sort')?.value || 'newest';

	if (!grid) return;

	try {
		let url = `/products?category=${category}&page=${page}&sort=${sort}`;
		if (query) url += `&search=${query}`;
		// Store current query state for pagination
		grid.dataset.query = query;
		grid.dataset.category = category;

		const data = await apiFetch(url);

		// Handle new response structure
		const products = data.products || data;
		currentPage = data.page || 1;
		maxPages = data.pages || 1;

		// Render Categories if missing (Only if we have products or first load)
		if (catsEl.children.length === 0) {
			let categories = ['All'];
			// Note: Ideally we'd have a separate endpoint for categories, but here we infer from current batch
			// which is imperfect with pagination but acceptable for MVP.
			if (products.length > 0) {
				const fromProducts = [...new Set(products.map(p => p.category))].filter(Boolean);
				categories = ['All', ...fromProducts];
			}

			catsEl.innerHTML = '';
			categories.forEach(c => {
				const btn = document.createElement('button');
				btn.className = `cat ${c === category ? 'active' : ''}`;
				btn.textContent = c;
				btn.onclick = () => {
					document.querySelectorAll('.cat').forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
					loadProducts(document.getElementById('sp-search')?.value, c, 1);
				};
				catsEl.appendChild(btn);
			});
		}

		grid.innerHTML = '';
		if (products.length === 0) {
			emptyEl.hidden = false;
			updatePaginationControls();
			return;
		}
		emptyEl.hidden = true;

		products.forEach(p => {
			const discPrice = discounted(p.price, p.discount);
			const card = document.createElement('article');
			card.className = 'card';
			card.innerHTML = `
                <div class="media" onclick="navigateTo('product-detail', '${p._id}')" style="cursor:pointer">
                    <img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=400&q=80'">
                </div>
                <div class="body">
                    <h3 class="title" onclick="navigateTo('product-detail', '${p._id}')" style="cursor:pointer">${p.title}</h3>
                    <p class="desc">${p.desc}</p>
                    <div class="meta">
                        <div class="price">${formatCurrency(p.discount > 0 ? discPrice : p.price)}</div>
                        ${p.discount > 0 ? `<div class="old">${formatCurrency(p.price)}</div><div class="badge">${p.discount}% off</div>` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="add-btn" onclick="addToCart('${p._id}', this)">Add to cart</button>
                        <button class="buy-btn" onclick="buyNow('${p._id}', this)">Buy now</button>
                    </div>
                </div>
            `;
			grid.appendChild(card);
		});

		updatePaginationControls();

	} catch (err) {
		console.error("Failed to load products:", err);
		if (emptyEl) {
			emptyEl.hidden = false;
			emptyEl.innerHTML = `
                <div style="text-align:center; padding: 20px;">
                    <p style="color: #ef4444; margin-bottom: 10px;">Unable to load products.</p>
                    <p style="font-size: 0.9em; color: #64748b;">Server responded with error.</p>
                    <p style="font-size: 0.8em; color: #94a3b8; margin-top:5px;">${err.message}</p>
                </div>
            `;
		}
	}
}

function updatePaginationControls() {
	const prevBtn = document.getElementById('prev-page');
	const nextBtn = document.getElementById('next-page');
	const info = document.getElementById('page-info');
	const pagDiv = document.getElementById('sp-pagination');

	if (!pagDiv) return;

	// Hide if only 1 page
	if (maxPages <= 1) {
		pagDiv.hidden = true;
		return;
	}
	pagDiv.hidden = false;

	if (info) info.textContent = `Page ${currentPage} of ${maxPages}`;
	if (prevBtn) prevBtn.disabled = currentPage <= 1;
	if (nextBtn) nextBtn.disabled = currentPage >= maxPages;
}

async function loadProductDetail(id) {
	const content = document.getElementById('pd-content');
	if (!content) return;

	try {
		content.innerHTML = '<div class="empty">Loading product details...</div>';
		const p = await apiFetch(`/products/${id}`);
		const discPrice = discounted(p.price, p.discount);

		content.innerHTML = `
            <div class="pd-image-section">
                <img class="pd-image" src="${p.image}" alt="${p.title}" onerror="this.src='https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=800&q=80'">
            </div>

            <div class="pd-center-col">
                <div class="pd-meta-top">
                    <div class="pd-category">${p.category}</div>
                    <div class="pd-rating">★ 4.8 <span style="color:#64748b; font-weight:400">(1.2k reviews)</span></div>
                </div>
                <h1 class="pd-title">${p.title}</h1>
                <p class="pd-desc">${p.desc}</p>
                
                <div class="pd-about">
                    <h3 style="margin-bottom:12px; font-size:18px">Key Features</h3>
                    <ul class="pd-specs-list">
                        <li><strong>Premium Craftsmanship</strong>: Designed with attention to detail and high-grade materials.</li>
                        <li><strong>Versatile Style</strong>: Seamlessly fits into your lifestyle, whether at home or on the go.</li>
                        <li><strong>Reliable Performance</strong>: Built to last with a focus on durability and user satisfaction.</li>
                        <li><strong>Eco-Friendly</strong>: Sustainably sourced components for a better future.</li>
                    </ul>
                </div>
                </div>
            </div>

            <!-- Reviews Section -->
            <div style="grid-column: 1 / -1; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 30px;">
                <h2>Reviews (${p.numReviews || 0})</h2>
                
                ${p.reviews && p.reviews.length > 0 ?
				`<div class="reviews-list" style="margin-bottom:30px">
                      ${p.reviews.map(r => `
                        <div class="review-item" style="margin-bottom:15px; padding-bottom:15px; border-bottom:1px solid #f1f5f9">
                            <div style="font-weight:bold">${r.name}</div>
                            <div style="color:#fbbf24">★ ${r.rating}</div>
                            <p style="margin-top:5px; color:#475569">${r.comment}</p>
                            <small style="color:#94a3b8">${new Date(r.createdAt).toLocaleDateString()}</small>
                        </div>
                      `).join('')}
                   </div>`
				: '<p style="margin-bottom:30px; color:#64748b">No reviews yet.</p>'}
                
                <div class="review-form-container" style="background:#f8fafc; padding:20px; border-radius:8px">
                    <h3>Write a Review</h3>
                    <form onsubmit="handleReviewSubmit(event, '${p._id}')">
                        <div style="margin-bottom:10px">
                            <label>Rating</label>
                            <select name="rating" required style="padding:8px; width:100%; border:1px solid #cbd5e1; border-radius:4px">
                                <option value="5">5 - Excellent</option>
                                <option value="4">4 - Very Good</option>
                                <option value="3">3 - Good</option>
                                <option value="2">2 - Fair</option>
                                <option value="1">1 - Poor</option>
                            </select>
                        </div>
                        <div style="margin-bottom:15px">
                            <label>Comment</label>
                            <textarea name="comment" required rows="3" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px"></textarea>
                        </div>
                        <button type="submit" class="add-btn">Submit Review</button>
                    </form>
                </div>
            </div>
            
            <div class="pd-right-col">
                <div class="pd-action-card">
                    <div class="pd-price-display">
                        <div class="pd-main-price">${formatCurrency(p.discount > 0 ? discPrice : p.price)}</div>
                        ${p.discount > 0 ? `<div class="pd-old-price">${formatCurrency(p.price)}</div>` : ''}
                    </div>
                    <div class="pd-stock-status">✓ In Stock & Ready to Ship</div>
                    <div style="font-size:13px; color:#64748b">Free Shipping on this item. Usually ships within 24 hours.</div>
                    
                    <div class="action-card-btns">
                        <button class="add-btn" onclick="addToCart('${p._id}', this)">Add to Cart</button>
                        <button class="buy-btn" onclick="buyNow('${p._id}', this)">Buy Now</button>
                    </div>
                    <button style="margin-top:10px; width:100%; background:white; border:1px solid #cbd5e1; color:#475569" class="add-btn" onclick="toggleWishlist('${p._id}', this)">♥ Add/Remove Wishlist</button>
                    
                    <div style="margin-top:8px; border-top:1px solid #e2e8f0; padding-top:12px; font-size:12px; color:#64748b">
                        <p>• 7-Day Money Back Guarantee</p>
                        <p>• Secuire Payment Processing</p>
                    </div>
                </div>
            </div>
        `;
	} catch (err) {
		content.innerHTML = `<div class="empty">Error: ${err.message}</div>`;
	}
}

async function handleReviewSubmit(e, id) {
	e.preventDefault();
	const fd = new FormData(e.target);
	const body = Object.fromEntries(fd.entries());

	try {
		showLoading(true);
		await apiFetch(`/products/${id}/reviews`, { method: 'POST', body: JSON.stringify(body) });
		alert('Review submitted!');
		loadProductDetail(id);
	} catch (err) {
		alert(err.message);
	} finally {
		showLoading(false);
	}
}

/* Wishlist */
async function loadWishlist() {
	const grid = document.getElementById('wishlist-grid');
	const empty = document.getElementById('wishlist-empty');
	if (!grid) return;

	try {
		showLoading(true);
		const products = await apiFetch('/auth/wishlist');
		grid.innerHTML = '';

		if (products.length === 0) {
			empty.hidden = false;
			return;
		}
		empty.hidden = true;

		products.forEach(p => {
			const discPrice = discounted(p.price, p.discount);
			grid.innerHTML += `
                <article class="card">
                    <div class="media" onclick="navigateTo('product-detail', '${p._id}')" style="cursor:pointer">
                        <img src="${p.image}" alt="${p.title}">
                    </div>
                    <div class="body">
                        <h3 class="title">${p.title}</h3>
                         <div class="meta">
                            <div class="price">${formatCurrency(p.discount > 0 ? discPrice : p.price)}</div>
                        </div>
                        <div class="card-actions">
                            <button class="add-btn" onclick="addToCart('${p._id}', this)">Add to Cart</button>
                            <button class="add-btn micro red" onclick="removeFromWishlist('${p._id}')">Remove</button>
                        </div>
                    </div>
                </article>
            `;
		});
	} catch (err) {
		navigateTo('login');
	} finally {
		showLoading(false);
	}
}

async function toggleWishlist(id, btn) {
	try {
		await apiFetch(`/auth/wishlist/${id}`, { method: 'POST' });
		btn.classList.add('active'); // Just visual feedback
		alert("Added to wishlist!");
	} catch (err) {
		if (err.message.includes('401') || err.message.includes('token')) navigateTo('login');
		else alert(err.message);
	}
}

async function removeFromWishlist(id) {
	try {
		showLoading(true);
		await apiFetch(`/auth/wishlist/${id}`, { method: 'DELETE' });
		loadWishlist();
	} catch (err) {
		alert(err.message);
	} finally {
		showLoading(false);
	}
}

/* Cart Management */
async function addToCart(id, btn) {
	try {
		const token = localStorage.getItem('sp_token');
		if (!token) { navigateTo('login'); return; }

		await apiFetch('/cart', { method: 'POST', body: JSON.stringify({ productId: id, quantity: 1 }) });
		updateHeaderBadge();

		if (btn) {
			const old = btn.textContent;
			btn.textContent = 'Added';
			btn.classList.add('added');
			setTimeout(() => { btn.textContent = old; btn.classList.remove('added'); }, 1000);
		}
	} catch (err) {
		alert(err.message);
	}
}

async function buyNow(id, btn) {
	await addToCart(id, btn);
	setTimeout(() => navigateTo('order'), 300);
}

async function updateHeaderBadge() {
	const el = document.getElementById('sp-cart');
	if (!el) return;
	try {
		const token = localStorage.getItem('sp_token');
		if (!token) { el.textContent = '0'; return; }
		const cart = await apiFetch('/cart');
		const count = cart.items.reduce((s, i) => s + i.quantity, 0);
		el.textContent = count;
	} catch (err) { el.textContent = '0'; }
}

async function loadCart() {
	const container = document.getElementById('cart-items');
	const summary = document.getElementById('cart-summary');
	const empty = document.getElementById('cart-empty');
	if (!container) return;

	try {
		showLoading(true);
		const cart = await apiFetch('/cart');
		container.innerHTML = '';

		if (cart.items.length === 0) {
			empty.hidden = false;
			summary.hidden = true;
			return;
		}
		empty.hidden = true;
		summary.hidden = false;

		cart.items.forEach(item => {
			const p = item.product;
			const row = document.createElement('div');
			row.className = 'cart-row';
			row.innerHTML = `
                <img src="${p.image}" alt="${p.title}">
                <div class="meta">
                    <div class="title">${p.title}</div>
                    <div class="price">${formatCurrency(discounted(p.price, p.discount))}</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px">
                    <input type="number" class="qty-input" value="${item.quantity}" min="1" onchange="updateQty('${p._id}', this.value)">
                    <button class="remove-btn" onclick="removeFromCart('${p._id}')">Remove</button>
                </div>
            `;
			container.appendChild(row);
		});

		document.getElementById('cart-subtotal').textContent = formatCurrency(cart.subtotal);
		document.getElementById('cart-tax').textContent = formatCurrency(cart.tax);
		document.getElementById('cart-total').textContent = formatCurrency(cart.total);
		updateHeaderBadge();
	} catch (err) {
		navigateTo('login');
	} finally {
		showLoading(false);
	}
}

async function updateQty(id, qty) {
	await apiFetch(`/cart/${id}`, { method: 'PUT', body: JSON.stringify({ quantity: Number(qty) }) });
	loadCart();
}

async function removeFromCart(id) {
	await apiFetch(`/cart/${id}`, { method: 'DELETE' });
	loadCart();
}

/* Checkout */
async function loadOrderSummary() {
	const container = document.getElementById('summary-items');
	if (!container) return;
	try {
		const cart = await apiFetch('/cart');
		container.innerHTML = '';
		cart.items.forEach(item => {
			const p = item.product;
			container.innerHTML += `
                <div class="cart-row">
                    <img src="${p.image}" alt="${p.title}">
                    <div class="meta">
                        <div class="title">${p.title}</div>
                        <div>${formatCurrency(discounted(p.price, p.discount))} × ${item.quantity}</div>
                    </div>
                </div>
            `;
		});
		document.getElementById('summary-sub').textContent = formatCurrency(cart.subtotal);
		document.getElementById('summary-tax').textContent = formatCurrency(cart.tax);
		document.getElementById('summary-total').textContent = formatCurrency(cart.total);

		// Pre-fill form if user has address
		const user = JSON.parse(localStorage.getItem('sp_current_user'));
		if (user && user.address) {
			const form = document.getElementById('order-form');
			form.name.value = user.name || '';
			form.email.value = user.email || '';
			form.phone.value = user.phone || '';
			form.address1.value = user.address.address1 || '';
			form.address2.value = user.address.address2 || '';
			form.city.value = user.address.city || '';
			form.state.value = user.address.state || '';
			form.zip.value = user.address.zip || '';
		}
	} catch (err) { navigateTo('cart'); }
}

async function handlePlaceOrder(e) {
	e.preventDefault();
	const fd = new FormData(e.target);
	const customer = Object.fromEntries(fd.entries());

	try {
		showLoading(true);
		const order = await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ customer }) });
		document.getElementById('order-form').hidden = true;
		document.getElementById('order-confirm').hidden = false;
		document.getElementById('order-id').textContent = `Order ID: ${order._id}`;
		updateHeaderBadge();
	} catch (err) {
		alert(err.message);
	} finally {
		showLoading(false);
	}
}

/* Order History & Profile */
async function loadOrderHistory() {
	const list = document.getElementById('orders-list');
	const empty = document.getElementById('orders-empty');
	if (!list) return;

	try {
		showLoading(true);
		const orders = await apiFetch('/orders');
		list.innerHTML = '';
		if (orders.length === 0) { empty.hidden = false; return; }
		empty.hidden = true;

		orders.forEach(o => {
			list.innerHTML += `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-id">#${o._id.slice(-8).toUpperCase()}</span>
                        <span class="order-status status-${o.status}">${o.status}</span>
                    </div>
                    <div class="order-details">
                        <div>Date: ${new Date(o.createdAt).toLocaleDateString()}</div>
                        <div>Items: ${o.items.length}</div>
                        <div style="font-weight:700">Total: ${formatCurrency(o.total)}</div>
                    </div>
                </div>
            `;
		});
	} catch (err) { navigateTo('login'); } finally { showLoading(false); }
}

async function loadProfile() {
	const form = document.getElementById('profile-form');
	if (!form) return;
	try {
		showLoading(true);
		const user = await apiFetch('/auth/profile');
		const orders = await apiFetch('/orders');

		// Fill Form
		form.name.value = user.name || '';
		form.email.value = user.email || '';
		form.phone.value = user.phone || '';
		if (user.address) {
			form.address1.value = user.address.address1 || '';
			form.address2.value = user.address.address2 || '';
			form.city.value = user.address.city || '';
			form.state.value = user.address.state || '';
			form.zip.value = user.address.zip || '';
			form.country.value = user.address.country || 'USA';
		}

		// Update UI Displays
		document.getElementById('profile-name-display').textContent = user.name;
		document.getElementById('profile-email-display').textContent = user.email;
		document.getElementById('profile-orders-count').textContent = orders.length;
		document.getElementById('profile-since').textContent = new Date(user.createdAt || Date.now()).getFullYear();

		const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
		document.getElementById('profile-avatar').textContent = initials;
	} catch (err) { navigateTo('login'); } finally { showLoading(false); }
}

async function handleProfileUpdate(e) {
	e.preventDefault();
	const fd = new FormData(e.target);
	const data = Object.fromEntries(fd.entries());
	const body = {
		name: data.name,
		email: data.email,
		phone: data.phone,
		address: {
			address1: data.address1,
			address2: data.address2,
			city: data.city,
			state: data.state,
			zip: data.zip,
			country: data.country
		}
	};

	try {
		showLoading(true);
		const updated = await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(body) });
		localStorage.setItem('sp_current_user', JSON.stringify(updated));
		showMsg('profile-msg', 'Profile updated successfully!', 'success');
		renderAuthLinks();
	} catch (err) {
		showMsg('profile-msg', err.message);
	} finally {
		showLoading(false);
	}
}

/* Admin Dashboard */
let adminCurrentTab = 'orders';

function switchAdminTab(tab) {
	adminCurrentTab = tab;
	document.getElementById('tab-orders-btn').className = `add-btn micro ${tab === 'orders' ? 'active' : 'outline'}`;
	document.getElementById('tab-products-btn').className = `add-btn micro ${tab === 'products' ? 'active' : 'outline'}`;
	document.getElementById('admin-tab-orders').style.display = tab === 'orders' ? 'block' : 'none';
	document.getElementById('admin-tab-products').style.display = tab === 'products' ? 'block' : 'none';

	if (tab === 'orders') loadAdminOrders();
	if (tab === 'products') loadAdminProducts();
}

async function loadAdminOrders() {
	const list = document.getElementById('admin-orders-list');
	if (!list) return;

	try {
		showLoading(true);
		const orders = await apiFetch('/orders');

		list.innerHTML = '';
		let revenue = 0;

		orders.forEach(o => {
			revenue += o.total;
			list.innerHTML += `
               <div class="order-card admin-card">
                    <div class="order-header">
                        <span class="order-id">#${o._id.slice(-8).toUpperCase()}</span>
                        <div class="admin-actions">
                            <select onchange="updateOrderStatus('${o._id}', this.value)" class="status-select">
                                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div class="order-details">
                         <div>User: ${o.user || 'N/A'}</div>
                         <div>Date: ${new Date(o.createdAt).toLocaleDateString()}</div>
                         <div style="font-weight:700">Total: ${formatCurrency(o.total)}</div>
                    </div>
               </div>
            `;
		});

		document.getElementById('admin-total-orders').textContent = orders.length;
		document.getElementById('admin-total-revenue').textContent = formatCurrency(revenue);

	} catch (err) {
		showMsg('admin-orders-list', 'Failed to load orders: ' + err.message);
	} finally {
		showLoading(false);
	}
}

async function updateOrderStatus(id, status) {
	try {
		showLoading(true);
		await apiFetch(`/orders/${id}/status`, {
			method: 'PUT',
			body: JSON.stringify({ status })
		});
		showMsg('admin-orders-list', 'Status updated!', 'success');
	} catch (err) {
		alert(err.message);
	} finally {
		showLoading(false);
	}
}

/* Admin Products */
async function loadAdminProducts() {
	const list = document.getElementById('admin-products-list');
	if (!list) return;

	try {
		showLoading(true);
		// Put limit high to see all for admin
		const data = await apiFetch('/products?limit=100&sort=newest');
		const products = data.products || [];

		list.innerHTML = '';

		if (products.length === 0) {
			list.innerHTML = '<div class="empty">No products found.</div>';
			return;
		}

		products.forEach(p => {
			list.innerHTML += `
               <div class="order-card admin-card product-row">
                    <div class="product-info-mini">
                        <img src="${p.image}" alt="${p.title}" style="width:50px; height:50px; object-fit:cover; border-radius:4px">
                        <div>
                            <div style="font-weight:600">${p.title}</div>
                            <div style="font-size:0.85em; color:#64748b">${p.category}</div>
                        </div>
                    </div>
                    <div class="admin-actions">
                        <span style="font-weight:bold; margin-right:15px">${formatCurrency(p.price)}</span>
                        <button class="add-btn micro outline" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Edit</button>
                        <button class="add-btn micro red" onclick="deleteProduct('${p._id}')">Delete</button>
                    </div>
               </div>
            `;
		});

	} catch (err) {
		list.innerHTML = `<div class="auth-msg error">Failed: ${err.message}</div>`;
	} finally {
		showLoading(false);
	}
}

// Modal Logic
function openProductModal(product = null) {
	const modal = document.getElementById('product-modal');
	const form = document.getElementById('product-form');
	const title = document.getElementById('modal-title');

	if (!modal || !form) return;

	if (product) {
		title.textContent = "Edit Product";
		form.id.value = product._id;
		form.title.value = product.title;
		form.desc.value = product.desc;
		form.price.value = product.price;
		form.discount.value = product.discount || 0;
		form.category.value = product.category;
		form.stock.value = product.stock || 0;
		form.image.value = product.image;
	} else {
		title.textContent = "Add New Product";
		form.reset();
		form.id.value = '';
	}

	modal.style.display = 'flex';
}

function closeProductModal() {
	document.getElementById('product-modal').style.display = 'none';
}

async function handleSaveProduct(e) {
	e.preventDefault();
	const fd = new FormData(e.target);
	const data = Object.fromEntries(fd.entries());
	const id = data.id;

	// Clean data
	delete data.id;
	data.price = Number(data.price);
	data.discount = Number(data.discount);
	data.stock = Number(data.stock);

	try {
		showLoading(true);
		if (id) {
			// Update
			await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
			alert("Product updated!");
		} else {
			// Create
			await apiFetch('/products', { method: 'POST', body: JSON.stringify(data) });
			alert("Product created!");
		}
		closeProductModal();
		loadAdminProducts();
	} catch (err) {
		alert(err.message);
	} finally {
		showLoading(false);
	}
}

async function deleteProduct(id) {
	if (!confirm("Are you sure you want to delete this product?")) return;

	try {
		showLoading(true);
		await apiFetch(`/products/${id}`, { method: 'DELETE' });
		loadAdminProducts();
	} catch (err) {
		alert(err.message);
	} finally {
		showLoading(false);
	}
}

/* Auth UI */
function renderAuthLinks() {
	const el = document.getElementById('auth-links');
	if (!el) return;
	const user = JSON.parse(localStorage.getItem('sp_current_user'));

	if (user) {
		const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
		const adminLink = user.isAdmin ? `<a href="#admin" onclick="navigateTo('admin')">Admin Board</a>` : '';
		el.innerHTML = `
            <div style="position:relative">
                <button class="avatar" onclick="toggleDropdown(event)">${initials}</button>
                <div id="user-dropdown" class="account-dropdown" style="display:none">
                    ${adminLink}
                    <a href="#profile" onclick="navigateTo('profile')">Profile</a>
                    <a href="#orders" onclick="navigateTo('orders')">Orders</a>
                    <button onclick="logout()">Logout</button>
                </div>
            </div>
        `;
	} else {
		el.innerHTML = `
            <a href="#login" onclick="navigateTo('login')">Log in</a>
            <a href="#signup" style="margin-left:10px" onclick="navigateTo('signup')">Sign up</a>
        `;
	}
}

function toggleDropdown(e) {
	e.stopPropagation();
	const dd = document.getElementById('user-dropdown');
	dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

/* Global Init */
document.addEventListener('DOMContentLoaded', () => {
	// Fancy Currency Dropdown
	const dropdown = document.getElementById('currency-dropdown');
	const trigger = dropdown?.querySelector('.fancy-select-trigger');
	const text = document.getElementById('current-currency-text');
	const options = dropdown?.querySelectorAll('.fancy-option');

	if (dropdown && trigger) {
		trigger.onclick = (e) => {
			e.stopPropagation();
			dropdown.classList.toggle('active');
		};

		options.forEach(opt => {
			if (opt.dataset.value === currentCurrency) {
				opt.classList.add('selected');
				if (text) text.textContent = opt.textContent;
			}

			opt.onclick = () => {
				const val = opt.dataset.value;
				if (currentCurrency === val) {
					dropdown.classList.remove('active');
					return;
				}
				currentCurrency = val;
				localStorage.setItem('sp_currency', currentCurrency);

				// Update UI state
				options.forEach(o => o.classList.remove('selected'));
				opt.classList.add('selected');
				if (text) text.textContent = opt.textContent;
				dropdown.classList.remove('active');

				// Sync and Animate
				syncUI();
				triggerPriceAnimation();
			};
		});

		window.addEventListener('click', () => dropdown.classList.remove('active'));
	}

	populateCountries();
	renderAuthLinks();
	updateHeaderBadge();

	// Auth Form Events
	document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
	document.getElementById('login-form')?.addEventListener('submit', handleLogin);
	document.getElementById('order-form')?.addEventListener('submit', handlePlaceOrder);
	document.getElementById('profile-form')?.addEventListener('submit', handleProfileUpdate);
	document.getElementById('product-form')?.addEventListener('submit', handleSaveProduct);

	// Search
	const searchInput = document.getElementById('sp-search');
	if (searchInput) {
		searchInput.addEventListener('input', debounce((e) => {
			const cat = document.querySelector('.cat.active')?.textContent || 'All';
			loadProducts(e.target.value, cat);
		}, 300));
	}

	// Handle initial hash and history
	window.addEventListener('hashchange', syncUI);
	syncUI();

	// Pagination Listeners
	document.getElementById('prev-page')?.addEventListener('click', () => {
		if (currentPage > 1) {
			const grid = document.getElementById('sp-grid');
			loadProducts(grid.dataset.query, grid.dataset.category, currentPage - 1);
		}
	});

	document.getElementById('next-page')?.addEventListener('click', () => {
		if (currentPage < maxPages) {
			const grid = document.getElementById('sp-grid');
			loadProducts(grid.dataset.query, grid.dataset.category, currentPage + 1);
		}
	});
});

/**
 * Triggers a fancy glow animation on all price elements
 */
function triggerPriceAnimation() {
	const prices = document.querySelectorAll('.price, .old, #cart-total, #summary-total');
	prices.forEach(el => {
		el.classList.remove('price-animate');
		void el.offsetWidth; // Trigger reflow
		el.classList.add('price-animate');
	});
}
