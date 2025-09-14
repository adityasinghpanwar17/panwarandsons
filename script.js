<script type="module">
    import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
    // Is line ko neeche di gayi nayi line se replace karein
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, doc, deleteDoc, where, getDocs, updateDoc, getDoc, setDoc, orderBy, limit, startAfter, arrayUnion, arrayRemove, increment, runTransaction } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
    const firebaseConfig = {
    apiKey: "AIzaSyBmvOrvAs1EJAUJJ7E5iG-gQmXWtzqDRxw",
    authDomain: "e-commerce-29e15.firebaseapp.com",
    projectId: "e-commerce-29e15",
    storageBucket: "e-commerce-29e15.firebasestorage.app", // <-- YAHAN BADLAV KAREIN
    messagingSenderId: "429029191252",
    appId: "1:429029191252:web:d1f866328f38928ee047c1",
    measurementId: "G-3TV4L14NKC"
};

    const app = initializeFirebaseApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
const storage = getStorage(app); // <-- YEH NAYI LINE ADD KAREIN

    const ADMIN_UID = "u11KiXjaIrbrMHgublgzwkRIR4p2";

    let cart = [];
    let currentUser = null;
    let allProducts = [];
    let allCategories = [];
    let lastVisibleProduct = null; // <-- YEH NAYI LINE ADD KAREIN
let isLoading = false; // <-- YEH BHI ADD KAREIN // <-- NEW: Global variable for categories
    let currentRoute = { page: 'home', params: null };
    let appliedPromoDetails = null;
    const mainContent = document.getElementById('main-content');
const navigateTo = (path) => {
        history.pushState({ path }, '', path);
        handleLocation(path);
    };

    const handleLocation = (path) => {
        const mobileBackButton = document.getElementById('mobile-back-btn');
    if (path === '/') {
        mobileBackButton.classList.add('hidden');
    } else {
        mobileBackButton.classList.remove('hidden');
    }
        toggleMobileMenu(false);
        if (path === '/') return renderHome();
        if (path === '/shop') return renderShop(null);
        if (path === '/about') return renderAbout();
        if (path === '/contact') return renderContact();
        if (path === '/login') return renderLogin();
        if (path === '/cart') return renderCart();
        if (path === '/wishlist') return renderWishlist();
        if (path === '/checkout') return renderCheckout();
        if (path.startsWith('/admin')) return renderAdminSection();
        if (path === '/my-orders') return renderMyOrders();
        if (path.startsWith('/product/')) {
            const productId = path.split('/')[2];
            return renderProduct(productId);
        }
        if (path.startsWith('/shop/')) {
            const category = path.split('/')[2];
            return renderShop(decodeURIComponent(category));
        }
        renderHome();
    };

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.path) {
            handleLocation(event.state.path);
        } else {
            handleLocation(location.pathname);
        }
    });
    // --- UTILITY FUNCTIONS ---
    function formatPrice(price) { return `₹${price.toLocaleString('en-IN')}`; }


    
    function createStarRating(rating, reviews) {
        let fullStars = Math.floor(rating);
        let halfStar = rating - fullStars >= 0.5;
        let emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        let starsHtml = '';
        for (let i = 0; i < fullStars; i++) { starsHtml += '<i class="fas fa-star text-yellow-400"></i>'; }
        if (halfStar) { starsHtml += '<i class="fas fa-star-half-alt text-yellow-400"></i>'; }
        for (let i = 0; i < emptyStars; i++) { starsHtml += '<i class="far fa-star text-gray-300"></i>'; }
        if (reviews) {
            starsHtml += `<span class="text-gray-500 text-xs ml-2">(${reviews} reviews)</span>`;
        }
        return starsHtml;
    }

    function toggleMobileMenu(show) {
        const menu = document.getElementById('mobile-menu');
        if (show === undefined) {
            menu.classList.toggle('hidden');
        } else if (show) {
            menu.classList.remove('hidden');
        } else {
            menu.classList.add('hidden');
        }
    }
    
    
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    
    

    // --- UI UPDATE FUNCTIONS ---
   function updateUserDisplay(user) {
    const userActionsContainer = document.getElementById('user-actions-container');
    const adminLinkDesktop = document.getElementById('nav-admin-desktop');
    const loginMobile = document.getElementById('nav-login-mobile');
    const userInfoMobile = document.getElementById('user-info-mobile');
    const adminLinkMobile = document.getElementById('nav-admin-mobile');

    userActionsContainer.innerHTML = ''; 

    if (user) {
        const userEmailName = user.email.split('@')[0];
        const userAvatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${userEmailName.charAt(0)}&background=random`;

        // --- Desktop Header Icons ---
        userActionsContainer.innerHTML = `
            <a id="nav-profile" class="flex flex-col items-center space-y-1 text-gray-700 hover:text-pink-600 transition cursor-pointer">
                <img alt="User profile photo" class="h-8 w-8 rounded-full object-cover" src="${userAvatarUrl}" />
                <span class="text-xs font-bold">${userEmailName}</span>
            </a>
            <a id="nav-my-orders-link" class="flex flex-col items-center space-y-1 text-gray-700 hover:text-pink-600 transition cursor-pointer">
                <i class="far fa-file-alt text-lg"></i>
                <span class="text-xs font-bold">Orders</span>
            </a>
            <a id="nav-wishlist-link" class="flex flex-col items-center space-y-1 text-gray-700 hover:text-pink-600 transition cursor-pointer">
                <i class="far fa-heart text-lg"></i>
                <span class="text-xs font-bold">Wishlist</span>
            </a>
            <button id="logout-btn" class="flex flex-col items-center space-y-1 text-gray-700 hover:text-pink-600 transition cursor-pointer">
                <i class="fas fa-sign-out-alt text-lg"></i>
                <span class="text-xs font-bold">Logout</span>
            </button>
        `;
        document.getElementById('nav-my-orders-link').onclick = () => navigateTo('/my-orders');
        document.getElementById('nav-wishlist-link').onclick = () => navigateTo('/wishlist'); // New
        document.getElementById('logout-btn').onclick = () => signOut(auth);

        // --- Mobile Menu ---
        loginMobile.style.display = 'none';
        userInfoMobile.classList.remove('hidden');
        document.getElementById('user-avatar-mobile').src = userAvatarUrl;
        document.getElementById('user-email-display-mobile').textContent = userEmailName;
        document.getElementById('nav-my-orders-mobile').onclick = () => navigateTo('/my-orders');
        document.getElementById('logout-btn-mobile').onclick = () => signOut(auth);

        // --- Admin Links ---
        if (user.uid === ADMIN_UID || (user.role === 'vendor' && user.status === 'approved')) {
            adminLinkDesktop.classList.remove('hidden');
            adminLinkMobile.classList.remove('hidden');
        } else {
            adminLinkDesktop.classList.add('hidden');
            adminLinkMobile.classList.add('hidden');
        }

    } else {
        // --- Desktop Header "Login" Button ---
        userActionsContainer.innerHTML = `
             <a id="nav-login-desktop" class="flex flex-col items-center space-y-1 ...">
                 <i class="far fa-user-circle text-base md:text-lg"></i>
                 <span class="text-xs font-bold">Login</span>
             </a>
        `;
        document.getElementById('nav-login-desktop').onclick = () => navigateTo('/login');

        // --- Mobile Menu ---
        loginMobile.style.display = 'flex';
        userInfoMobile.classList.add('hidden');
        
        // --- Admin Links ---
        adminLinkDesktop.classList.add('hidden');
        adminLinkMobile.classList.add('hidden');
    }
}


    function updateCartCount() {
        const count = cart.reduce((acc, item) => acc + item.quantity, 0);
        document.getElementById('cart-count').textContent = count;
    }

    // --- CART LOGIC ---
    function addToCart(productId, size, color, quantity) {
    let product = allProducts.find(p => p.id === productId);
    if (!product) {
        console.error("Product not found!");
        return;
    }

    // Check karein ki product pehle se cart mein hai ya nahi
    const existingIndex = cart.findIndex(item => item.id === productId && item.size === size && item.color === color);

    if (existingIndex !== -1) {
        // Agar hai, toh sirf quantity badhayein
        cart[existingIndex].quantity += quantity;
    } else {
        // Agar naya product hai, toh usse cart mein add karein
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            size: size,
            color: color,
            quantity: quantity,
            image: product.image,
            alt: product.alt || product.name,
            vendorId: product.vendorId,
            vendorName: product.vendorName
        });
    }
    updateCartCount();
}


// 'Rising Stars (Large Banners)' design ke liye HTML banata hai
function renderLargeBannerSlider(section) {
    if (!section.items || section.items.length === 0) return '';
    const itemsHtml = section.items.map(item => `
        // YAHAN BADLAV KIYA GAYA HAI: w-64 md:w-80
        <a href="${item.linkUrl}" class="flex-shrink-0 w-64 md:w-80 snap-start">
            <img src="${item.imageUrl}" alt="Promotion Banner" class="w-full h-full object-cover rounded-lg shadow-md">
        </a>
    `).join('');

    return `
        <section>
            <h2 class="text-2xl font-semibold text-gray-800 mb-6">${section.title}</h2>
            // YAHAN BADLAV KIYA GAYA HAI: space-x-4 md:space-x-6
            <div class="flex space-x-4 md:space-x-6 overflow-x-auto pb-4 scrollbar-hide snap-x">
                ${itemsHtml}
            </div>
        </section>
    `;
}

// 'Grand Brands (Small Banners)' design ke liye HTML banata hai
function renderSmallBrandSlider(section) {
    if (!section.items || section.items.length === 0) return '';
    const itemsHtml = section.items.map(item => `
        <a href="${item.linkUrl}" class="flex-shrink-0 w-32 md:w-40 snap-start">
            <img src="${item.imageUrl}" alt="Brand Logo" class="w-full h-full object-cover rounded-full shadow-md">
        </a>
    `).join('');

    return `
        <section>
            <h2 class="text-2xl font-semibold text-gray-800 mb-6">${section.title}</h2>
            <div class="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide snap-x">
                ${itemsHtml}
            </div>
        </section>
    `;
}
// ===================================================================
// START: ADD THIS NEW HELPER FUNCTION
// ===================================================================

// 'Meesho #TRENDZ Banner' design ke liye HTML banata hai
function renderPromoBannerWithScroll(section) {
    // Agar 2 se kam item hain to yeh design nahi ban sakta
    if (!section.items || section.items.length < 2) return '';

    const mainBanner = section.items[0]; // Pehla item main banner hai
    const scrollingItems = section.items.slice(1); // Baaki ke items scroll honge

    const scrollingItemsHtml = scrollingItems.map(item => `
        <a href="${item.linkUrl}" class="flex-shrink-0 w-40 snap-start">
            <img src="${item.imageUrl}" alt="Promotional Item" class="w-full h-full object-cover rounded-md">
        </a>
    `).join('');

    return `
        <section>
            <h2 class="text-2xl font-semibold text-gray-800 mb-6">${section.title}</h2>
            <div class="md:flex md:space-x-6 space-y-6 md:space-y-0">
                <div class="md:w-2/5 flex-shrink-0">
                     <a href="${mainBanner.linkUrl}">
                        <img src="${mainBanner.imageUrl}" alt="Main Promotion Banner" class="w-full h-full object-cover rounded-lg shadow-md">
                    </a>
                </div>
                <div class="md:w-3/5">
                    <div class="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                        ${scrollingItemsHtml}
                    </div>
                </div>
            </div>
        </section>
    `;
}

// ===================================================================
// END: NEW HELPER FUNCTION
// ===================================================================
    // --- RENDER FUNCTIONS (PAGES) ---
    // Function ke aage 'async' jodein
// ===================================================================
// START: AAPKA SAHI KIYA GAYA RENDERHOME FUNCTION
// ===================================================================

async function renderHome() {
    currentRoute = { page: 'home' };
    await fetchAllCategories();

    mainContent.innerHTML = `
        <section class="relative rounded-lg overflow-hidden shadow-lg h-80 md:h-96">
            <video autoplay loop muted playsinline class="absolute z-0 w-full h-full object-cover">
                <source src="Generate_a_royal_202508171842_j6odf.mp4" type="video/mp4">
            </video>
            <div class="relative z-10 h-full bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center px-6 md:px-20">
                <h1 class="text-white text-3xl sm:text-4xl md:text-5xl font-extrabold max-w-xl leading-tight drop-shadow-lg">Discover Your Style</h1>
                <p class="mt-4 text-pink-100 text-base md:text-lg max-w-md drop-shadow-md">Up to 50% off on top brands.</p>
                <button id="hero-shop-now" class="mt-6 inline-block bg-white text-pink-600 font-semibold px-6 py-3 rounded-md shadow-md hover:bg-pink-50 transition w-max cursor-pointer">Shop Now</button>
            </div>
        </section>

        <section class="mt-12">
            <h2 class="text-3xl font-bold text-center tracking-widest mb-8" style="font-family: 'serif'; color: #8A5B2E;">SHOP BY CATEGORY</h2>
            <div id="category-grid" class="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x px-4 sm:px-0">
            </div>
        </section>

        <section class="mt-16">
            <h2 class="text-3xl font-bold text-center tracking-widest mb-8" style="font-family: 'serif'; color: #8A5B2E;">POCKET-FRIENDLY PRICES</h2>
            <div class="w-full overflow-hidden group">
                <div id="pocket-friendly-container" class="flex">
                </div>
            </div>
        </section>

        <div id="dynamic-homepage-sections" class="space-y-16 mt-16"></div>

        <section class="mt-16">
            <h2 class="text-2xl font-semibold text-gray-800 mb-6">Featured Products</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6" id="featured-products"></div>
        </section>
    `;

    document.getElementById('hero-shop-now').addEventListener('click', () => navigateTo('/shop'));
    
    // Shop by Category rendering code (unchanged)
    const categoryContainer = document.getElementById('category-grid');
    if (allCategories.length > 0) {
        categoryContainer.innerHTML = allCategories.map(cat => `
            <a class="text-center space-y-2 cursor-pointer category-item bg-[#FFFBF2] border border-[#E9C289] rounded-2xl p-2 transition-transform duration-300 hover:scale-105" data-category="${cat.name}">
                <img alt="Category: ${cat.name}" class="w-full h-32 md:h-48 object-cover rounded-xl" src="${cat.imageUrl}"/>
                <div class="px-1">
                    <p class="font-semibold text-xs md:text-sm text-gray-800 truncate">${cat.name}</p>
                    ${cat.offerText ? `<p class="font-bold text-base md:text-lg text-red-600">${cat.offerText}</p>` : ''}
                    <p class="text-xs font-semibold text-gray-700 underline">Shop Now</p>
                </div>
            </a>
        `).join('');
        categoryContainer.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => navigateTo(`/shop/${encodeURIComponent(item.dataset.category)}`));
        });
    } else {
        categoryContainer.innerHTML = `<p>Loading categories...</p>`;
    }

    const loadPocketFriendlyData = async () => {
        const container = document.getElementById('pocket-friendly-container');
        if (!container) return;
        try {
            const q = query(collection(db, "pocketFriendlyItems"), orderBy("order"));
            const querySnapshot = await getDocs(q);
            const items = querySnapshot.docs.map(doc => doc.data());

            if (items.length === 0) {
                container.closest('section').style.display = 'none';
                return;
            }

            const allItemsHtml = [...items, ...items].map(item => `
                <a href="#" onclick="navigateTo('${item.linkUrl}'); return false;" class="flex flex-col flex-shrink-0 w-28 md:w-36 mx-2 bg-white rounded-lg shadow-sm overflow-hidden transition-transform duration-300 hover:scale-105">
                    <img src="${item.imageUrl}" class="w-full h-32 object-cover" alt="${item.subtext}">
                    <div class="p-2 text-center bg-gray-100">
                        <p class="font-bold text-gray-800 text-xs truncate">${item.priceText}</p>
                        <p class="text-[10px] text-gray-500 truncate">${item.subtext}</p>
                    </div>
                </a>
            `).join('');
            
            container.innerHTML = allItemsHtml;
            container.classList.add('animate-slide');

            const wrapper = container.parentElement;
            wrapper.addEventListener('mouseenter', () => { container.style.animationPlayState = 'paused'; });
            wrapper.addEventListener('mouseleave', () => { container.style.animationPlayState = 'running'; });
        } catch (error) { 
            console.error("Error loading pocket-friendly items:", error); 
        }
    };

    function loadSpotlightStealsSection() {
        // This function is empty in your code, so I'm leaving it as is.
        // If it had code, it would be here.
    }
    
    loadPocketFriendlyData();
    loadSpotlightStealsSection();

    const sectionsQuery = query(collection(db, "homepage-sections"), where("isActive", "==", true), orderBy("order"));
    const querySnapshot = await getDocs(sectionsQuery);
    let sectionsHtml = '';
    querySnapshot.forEach(doc => {
        const section = { id: doc.id, ...doc.data() };
        switch (section.type) {
            case 'large_banner_slider':
                sectionsHtml += renderLargeBannerSlider(section);
                break;
            case 'small_brand_slider':
                sectionsHtml += renderSmallBrandSlider(section);
                break;
            case 'promo_banner_with_scroll':
                sectionsHtml += renderPromoBannerWithScroll(section);
                break;
        }
    });
    document.getElementById('dynamic-homepage-sections').innerHTML = sectionsHtml;

    const featuredContainer = document.getElementById('featured-products');
    if (featuredContainer) {
        let featuredProducts = allProducts.sort((a, b) => (b.reviews || 0) - (a.reviews || 0)).slice(0, 10);
        
        if (featuredProducts.length > 0) {
            featuredContainer.innerHTML = featuredProducts.map((p, index) => `
                <article class="product-card border rounded-lg overflow-hidden shadow-sm cursor-pointer animate-fadeInUp" data-id="${p.id}" style="animation-delay: ${index * 0.1}s;">
                    <img alt="${p.alt || p.name}" class="w-full h-56 md:h-64 object-cover" src="${p.image}" />
                    <div class="p-3 md:p-4">
                        <h3 class="text-gray-900 font-semibold text-sm md:text-base truncate">${p.name}</h3>
                        <div class="mt-1 flex items-baseline gap-2 flex-wrap">
                            <p class="text-pink-600 font-bold text-base md:text-lg">${formatPrice(p.price)}</p>
                            ${p.originalPrice ? `
                                <p class="text-gray-500 line-through text-xs md:text-sm">${formatPrice(p.originalPrice)}</p>
                                <p class="text-green-600 font-semibold text-xs">
                                    (${Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF)
                                </p>
                            ` : ''}
                        </div>
                        <div class="flex items-center mt-2">${createStarRating(p.rating, p.reviews)}</div>
                    </div>
                </article>
            `).join('');
        } else {
            featuredContainer.innerHTML = `<p class="col-span-full text-center text-gray-500">No featured products to show right now.</p>`;
        }
    } // <<<<< YEH HAI WOH BRACKET JO MISSING THA
}

// ===================================================================
// END: AAPKA SAHI KIYA GAYA RENDERHOME FUNCTION
// ===================================================================
    
// Helper function for rendering products
function applyFiltersAndRender(products, containerId) {
    const container = document.getElementById(containerId);
    let filteredProducts = [...products];

    const sortBy = document.getElementById('sort-by').value;
    if (sortBy === 'price-asc') {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating-desc') {
        filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (filteredProducts.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-500">No products found.</p>`;
        return;
    }

    container.innerHTML = filteredProducts.map(p => {
        const discountHtml = p.originalPrice ? `
            <p class="text-gray-500 line-through text-sm">${formatPrice(p.originalPrice)}</p>
            <p class="text-green-600 font-semibold text-xs">
                (${Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF)
            </p>
        ` : '';
        return `
            <article class="product-card cursor-pointer border rounded-lg overflow-hidden shadow-sm hover:shadow-lg" data-id="${p.id}">
                <img alt="${p.alt || p.name}" class="w-full h-64 object-cover" src="${p.image}"/>
                <div class="p-4">
                    <h3 class="text-gray-800 font-semibold text-base truncate">${p.name}</h3>
                    <div class="mt-1 flex items-baseline gap-2">
                        <p class="text-pink-600 font-bold text-lg">${formatPrice(p.price)}</p>
                        ${discountHtml}
                    </div>
                    <div class="flex items-center mt-2">${createStarRating(p.rating, p.reviews)}</div>
                    <button class="mt-4 w-full bg-pink-600 text-white py-2 rounded-md font-semibold hover:bg-pink-700 transition add-to-cart-btn flex justify-center items-center space-x-2" data-id="${p.id}">
                        <i class="fas fa-cart-plus"></i><span>Add to Cart</span>
                    </button>
                </div>
            </article>
        `;
    }).join('');
    
}
// Apne renderShop function ko isse replace karein
// REPLACE your old renderShop function with this new one.
function renderShop(category = null) {
    currentRoute = { page: 'shop', params: category };
    const title = category || "All Products";

    mainContent.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 mb-4">${title}</h2>
        
        <div class="bg-gray-100 p-4 rounded-lg mb-8 flex justify-end items-center">
            <div class="flex items-center gap-2">
                <label for="sort-by" class="font-semibold">Sort By:</label>
                <select id="sort-by" class="p-2 border rounded-md">
                    <option value="name_asc">Default (A-Z)</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating_desc">Rating: High to Low</option>
                </select>
            </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6" id="shop-products-grid">
           </div>
    `;

    const productsGrid = document.getElementById('shop-products-grid');
    const sortDropdown = document.getElementById('sort-by');

    // This function handles filtering, sorting, and displaying products
    const displayProducts = () => {
        // Step 1: Filter products by the selected category from the 'allProducts' array
        let productsToDisplay = category
            ? allProducts.filter(p => p.category === category)
            : [...allProducts];

        // Step 2: Sort the filtered list based on the dropdown value
        const sortBy = sortDropdown.value;
        if (sortBy === 'price_asc') {
            productsToDisplay.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price_desc') {
            productsToDisplay.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'rating_desc') {
            productsToDisplay.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else { // Default to name sorting
             productsToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Step 3: Generate the HTML and render the products
        if (productsToDisplay.length === 0) {
            productsGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">No products found in this category.</p>`;
            return;
        }
        
        productsGrid.innerHTML = productsToDisplay.map(p => {
             const discountHtml = p.originalPrice ? `
                <p class="text-gray-500 line-through text-sm">${formatPrice(p.originalPrice)}</p>
                <p class="text-green-600 font-semibold text-xs">
                    (${Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF)
                </p>
            ` : '';
            return `
                <article class="product-card cursor-pointer border rounded-lg overflow-hidden shadow-sm hover:shadow-lg" data-id="${p.id}">
                    <img alt="${p.alt || p.name}" class="w-full h-64 object-cover" src="${p.image}"/>
                    <div class="p-4">
                        <h3 class="text-gray-800 font-semibold text-base truncate">${p.name}</h3>
                        <div class="mt-1 flex items-baseline gap-2">
                            <p class="text-pink-600 font-bold text-lg">${formatPrice(p.price)}</p>
                            ${discountHtml}
                        </div>
                        <div class="flex items-center mt-2">${createStarRating(p.rating, p.reviews)}</div>
                        <button class="mt-4 w-full bg-pink-600 text-white py-2 rounded-md font-semibold hover:bg-pink-700 transition add-to-cart-btn flex justify-center items-center space-x-2" data-id="${p.id}">
                            <i class="fas fa-cart-plus"></i><span>Add to Cart</span>
                        </button>
                    </div>
                </article>
            `;
        }).join('');
    };

    // Show the products when the page first loads
    displayProducts();

    // Add a listener to the sort dropdown to re-sort and re-display the products whenever it changes
    sortDropdown.addEventListener('change', displayProducts);
}
// YEH POORA NAYA FUNCTION ADD KAREIN
async function fetchAndRenderProducts(category, sortBy = 'name_asc') {
    if (isLoading) return; // Agar pehle se loading chal rahi hai, toh kuch na karein
    isLoading = true;

    const productsGrid = document.getElementById('shop-products-grid');
    const loaderContainer = document.getElementById('loader-container');
    
    // Sirf tabhi "Loading..." dikhayein jab page naya ho
    if (!lastVisibleProduct) {
        loaderContainer.innerHTML = `<p class="text-gray-500">Loading products...</p>`;
    }

    try {
        let [orderByField, orderByDirection] = sortBy.split('_');
        if (!orderByDirection) orderByDirection = 'asc';

        let productsQuery;
        const productsRef = collection(db, "products");

        let baseQuery = category 
            ? query(productsRef, where("category", "==", category), orderBy(orderByField, orderByDirection))
            : query(productsRef, orderBy(orderByField, orderByDirection));

        if (lastVisibleProduct) {
            productsQuery = query(baseQuery, startAfter(lastVisibleProduct), limit(8));
        } else {
            productsQuery = query(baseQuery, limit(8));
        }
        
        const querySnapshot = await getDocs(productsQuery);
        
        if (!querySnapshot.empty) {
            lastVisibleProduct = querySnapshot.docs[querySnapshot.docs.length - 1];
        }

        if (querySnapshot.empty && !lastVisibleProduct) {
            productsGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">No products found.</p>`;
            loaderContainer.innerHTML = '';
        } else {
            querySnapshot.forEach(doc => {
                const p = { id: doc.id, ...doc.data() };
                const productHtml = `
                    <article class="product-card cursor-pointer border rounded-lg overflow-hidden shadow-sm hover:shadow-lg hidden-on-load" data-id="${p.id}">
                        <img loading="lazy" alt="${p.alt || p.name}" class="w-full h-64 object-cover" src="${p.image}"/>
                        <div class="p-4">
                            <h3 class="text-gray-800 font-semibold text-base truncate">${p.name}</h3>
                            <p class="text-pink-600 font-bold text-lg mt-1">${formatPrice(p.price)}</p>
                            <div class="flex items-center mt-2">${createStarRating(p.rating, p.reviews)}</div>
                            <button class="mt-4 w-full bg-pink-600 text-white py-2 rounded-md font-semibold hover:bg-pink-700 transition add-to-cart-btn flex justify-center items-center space-x-2" data-id="${p.id}">
                                <i class="fas fa-cart-plus"></i><span>Add to Cart</span>
                            </button>
                        </div>
                    </article>
                `;
                productsGrid.insertAdjacentHTML('beforeend', productHtml);
            });
        }
        
        if (querySnapshot.size < 8) {
            loaderContainer.innerHTML = `<p class="text-gray-500 mt-4">No more products to show.</p>`;
        } else {
            loaderContainer.innerHTML = `<button id="load-more-btn" class="bg-white text-pink-600 border border-pink-600 px-6 py-3 rounded-md hover:bg-pink-50 transition">Load More</button>`;
            document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderProducts(category, sortBy));
        }

        // =========================================================
        // 2. NAYE LOAD HUE PRODUCTS PAR ANIMATION APPLY KAREIN
        // =========================================================
        applyScrollAnimations();

    } catch (error) {
        console.error("Error fetching products: ", error);
        loaderContainer.innerHTML = `<p class="text-red-500">Failed to load products.</p>`;
    } finally {
        isLoading = false;
    }
}
// इस पूरे फंक्शन को अपनी स्क्रिप्ट में जोड़ें
function setupDynamicEventListeners() {
    mainContent.addEventListener('click', async (e) => {
        // Product Card Click
        const productCard = e.target.closest('.product-card');
        if (productCard && !e.target.closest('.add-to-cart-btn')) {
            navigateTo(`/product/${productCard.dataset.id}`);
            return;
        }

        // Add to Cart from Card
        const addToCartBtn = e.target.closest('.add-to-cart-btn');
        if (addToCartBtn) {
            e.stopPropagation();
            const product = allProducts.find(p => p.id === addToCartBtn.dataset.id);
            if (!product) return;
            addToCart(product.id, product.sizes?.[0] || 'N/A', product.colors?.[0] || 'N/A', 1);
            alert(`${product.name} added to cart!`);
            return;
        }

        // Add to Cart from Product Page
        const detailBtn = e.target.closest('.add-to-cart-btn-detail');
        if (detailBtn) {
            const size = document.getElementById('selected-size')?.value;
            if (!size) {
                alert("Please select a size.");
                return;
            }
            addToCart(detailBtn.dataset.id, size, document.getElementById('color-select').value, 1);
            alert('Product added to cart!');
            return;
        }
        
        // Wishlist Page Buttons
        const removeFromWishlistBtn = e.target.closest('.remove-from-wishlist-btn');
        if (removeFromWishlistBtn) {
            // ... (wishlist logic) ...
        }
        // >>> IS BLOCK KO NAYE WALE SE REPLACE KAREIN <<<
const moveToBagBtn = e.target.closest('.move-to-bag-btn');
if (moveToBagBtn) {
    
    const productId = moveToBagBtn.dataset.id;
    if (!productId || !currentUser) return;

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    try {
        // Step 1: Product ko cart mein add karein
        const size = product.sizes?.[0] || 'N/A';
        const color = product.colors?.[0] || 'N/A';
        addToCart(productId, size, color, 1);

        // Step 2: Product ko wishlist se hatayein
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            wishlist: arrayRemove(productId)
        });

        // Step 3: User ko batayein aur page ko update karein
        alert(`'${product.name}' has been moved to your bag.`);
        renderWishlist(); // Wishlist page ko dobara se load karein

    } catch (error) {
        console.error("Error moving item to bag: ", error);
        alert("Sorry, there was an error. Please try again.");
    }
}

const deleteReviewBtn = e.target.closest('.delete-review-btn');
        if (deleteReviewBtn) {
            const productId = deleteReviewBtn.dataset.productId;
            const reviewId = deleteReviewBtn.dataset.reviewId;

            if (confirm('Are you sure you want to delete your review?')) {
                try {
                    const reviewRef = doc(db, "products", productId, "reviews", reviewId);
                    await deleteDoc(reviewRef);
                    alert('Review deleted successfully.');
                    // The onSnapshot listener will automatically refresh the review list.
                } catch (error) {
                    console.error("Error deleting review: ", error);
                    alert("Failed to delete review.");
                }
            }
        }

    });
     
     mainContent.addEventListener('submit', async (e) => {
        // Contact form ka logic
        if (e.target.id === 'contact-form') {
            e.preventDefault();
            alert('Thank you for your message!');
            e.target.reset();
        }

        // Review form ka logic
        if (e.target.id === 'review-form') {
            e.preventDefault();
            
            if (!currentUser) {
                alert("Please login to submit a review.");
                return;
            }

            const submitBtn = document.getElementById('submit-review-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            try {
                const productId = document.querySelector('.add-to-cart-btn-detail, .add-to-cart-btn').dataset.id;
                const rating = parseInt(document.getElementById('rating-value').value);
                const text = document.getElementById('review-text').value;
                const photoFile = document.getElementById('review-photo').files[0];
                let photoURL = '';

                if (rating === 0) {
                    alert('Please select a star rating.');
                    submitBtn.disabled = false; 
                    submitBtn.textContent = 'Submit Review';
                    return;
                }

                if (photoFile) {
                    const photoRef = ref(storage, `review-photos/${productId}/${Date.now()}-${photoFile.name}`);
                    const snapshot = await uploadBytes(photoRef, photoFile);
                    photoURL = await getDownloadURL(snapshot.ref);
                }

                const reviewsCollection = collection(db, "products", productId, "reviews");
                await addDoc(reviewsCollection, {
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    rating: rating,
                    text: text,
                    photoURL: photoURL,
                    createdAt: serverTimestamp()
                });

                alert('Thank you for your review!');
                e.target.reset();
                document.getElementById('review-photo-preview').classList.add('hidden');

            } catch (error) {
                console.error("Error submitting review:", error);
                alert("Failed to submit review. Please try again.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Review';
            }
        }
    });
}
       


    function renderProduct(productId) {
    currentRoute = { page: 'product', params: productId };
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        mainContent.innerHTML = `<p class="text-center">Product not found.</p>`;
        return; 
    }

    const getDeliveryDate = () => {
        if (!product.deliveryEstimate || !product.deliveryEstimate.minDays || !product.deliveryEstimate.maxDays) {
            return "Delivery details not available.";
        }
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        const today = new Date();
        const minDate = new Date();
        minDate.setDate(today.getDate() + product.deliveryEstimate.minDays);
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + product.deliveryEstimate.maxDays);
        if (minDate.getTime() === maxDate.getTime()) {
             return `Get it by ${minDate.toLocaleDateString('en-US', options)}`;
        }
        return `Get it between ${minDate.toLocaleDateString('en-US', options)} and ${maxDate.toLocaleDateString('en-US', options)}`;
    };

    const allProductImages = [product.image, ...(product.additionalImages || [])].filter(Boolean);

    const thumbnailsHtml = allProductImages.map((imgUrl, index) => `
        <img src="${imgUrl}" alt="${product.name} thumbnail ${index + 1}" 
             class="w-full h-auto object-cover rounded-md cursor-pointer border-2 hover:border-pink-500 thumbnail-image ${index === 0 ? 'border-pink-500' : 'border-gray-200'}">
    `).join('');

    const sizeOptions = product.sizes && product.sizes.length > 0
        ? product.sizes.map(s => `<button data-size="${s}" class="size-btn border rounded-md px-4 py-2 hover:border-pink-500 focus:outline-none">${s}</button>`).join('')
        : '<p class="text-gray-500">Size not available</p>';
        
    const colorOptions = product.colors && product.colors.length > 0
        ? product.colors.map(c => `<option value="${c}">${c}</option>`).join('')
        : '<option value="N/A">Not Available</option>';

    const discountPercentage = product.originalPrice 
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;


// >>> NAYA CODE SHURU <<<
    // Stock check karke button ka HTML banayein
    const stock = product.stock;
    const addToBagButtonHtml = stock > 0
        ? `<button class="w-full bg-pink-600 text-white py-3 rounded-md font-semibold hover:bg-pink-700 transition flex items-center justify-center gap-2 add-to-cart-btn-detail" data-id="${product.id}">
               <i class="fas fa-shopping-bag"></i> ADD TO BAG
           </button>`
        : `<button class="w-full bg-gray-400 text-white py-3 rounded-md font-semibold cursor-not-allowed" disabled>
               OUT OF STOCK
           </button>`;
    // >>> NAYA CODE KHATM <<<

    mainContent.innerHTML = `

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div class="grid grid-cols-6 gap-2">
                 <div class="col-span-1 space-y-2">
                    ${thumbnailsHtml}
                </div>
                <div class="col-span-5 relative">
                    <img id="main-product-image" alt="${product.name}" class="w-full h-auto object-contain rounded-lg shadow-sm" src="${allProductImages[0] || 'https://placehold.co/600x600?text=No+Image'}"/>
                </div>
            </div>

            <div>
                <h2 class="text-2xl font-bold text-gray-800">${product.brand || ''}</h2>
                <h1 class="text-xl text-gray-600 mt-1">${product.name}</h1>
                <div class="flex items-center mt-2">${createStarRating(product.rating, product.reviews)}</div>
                <hr class="my-4">
                <div class="flex items-baseline space-x-3">
                    <p class="text-2xl font-bold">${formatPrice(product.price)}</p>
                    ${product.originalPrice ? `
                        <p class="text-gray-500 line-through">MRP ${formatPrice(product.originalPrice)}</p>
                        <p class="text-orange-500 font-bold">(${discountPercentage}% OFF)</p>
                    ` : ''}
                </div>
                <p class="text-sm font-semibold text-green-600">inclusive of all taxes</p>
                <div class="mt-6">
                    <div class="flex justify-between items-center">
                        <h3 class="font-bold">SELECT SIZE</h3>
                        <a href="#" class="text-pink-500 text-sm font-semibold">SIZE CHART ></a>
                    </div>
                    <div id="size-selector" class="flex flex-wrap gap-2 mt-2">${sizeOptions}</div>
                    <input type="hidden" id="selected-size" value="">
                </div>
                 <div class="mt-4 w-1/2">
                    <label for="color-select" class="font-bold">COLOR</label>
                    <select id="color-select" class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm">${colorOptions}</select>
                </div>
                <div class="flex items-center gap-4 mt-6">
                    <button class="w-full bg-pink-600 text-white py-3 rounded-md font-semibold hover:bg-pink-700 transition flex items-center justify-center gap-2 add-to-cart-btn-detail" data-id="${product.id}">
                        <i class="fas fa-shopping-bag"></i> ADD TO BAG
                    </button>
                    <button id="wishlist-btn" data-id="${product.id}" class="w-full border border-gray-400 py-3 rounded-md font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2">
                       <i id="wishlist-icon" class="far fa-heart"></i> <span id="wishlist-text">WISHLIST</span>
                    </button>
                </div>
                <hr class="my-6">
                <div>
                     <h3 class="font-bold uppercase">Delivery Options <i class="fas fa-truck"></i></h3>
                     <div class="mt-2 flex rounded-md shadow-sm border border-gray-300">
                        <input type="number" id="pincode-check-input" placeholder="Enter Pincode" class="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md">
                        <button type="button" id="pincode-check-btn" class="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 text-pink-600 font-semibold">Check</button>
                    </div>
                    <p id="pincode-check-result" class="text-sm mt-2 h-5"></p> 
                    <div class="text-sm text-gray-700 mt-2 space-y-1">
                        <p id="delivery-time-estimate" class="font-semibold">${getDeliveryDate()}</p>
                        <p>Pay on delivery available</p>
                        <p>Easy 7 days return & exchange available</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-12">
            <h3 class="font-bold text-lg">PRODUCT DETAILS</h3>
            <p class="text-gray-600 mt-2 whitespace-pre-wrap">${product.description}</p>
        </div>
<div class="mt-10">
    <h3 class="text-2xl font-bold mb-4">Reviews & Ratings</h3>
    <div id="reviews-container" class="space-y-6">
        </div>

    <form id="review-form" class="mt-8 p-6 border rounded-lg shadow-sm bg-gray-50 ${currentUser ? '' : 'hidden'}">
        <h4 class="font-semibold text-lg mb-4">Write a Review</h4>

        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Your Rating</label>
            <div class="flex items-center text-3xl text-gray-300" id="star-rating-input">
                <i class="far fa-star cursor-pointer" data-value="1"></i>
                <i class="far fa-star cursor-pointer" data-value="2"></i>
                <i class="far fa-star cursor-pointer" data-value="3"></i>
                <i class="far fa-star cursor-pointer" data-value="4"></i>
                <i class="far fa-star cursor-pointer" data-value="5"></i>
            </div>
            <input type="hidden" id="rating-value" value="0" required>
        </div>

        <div class="mb-4">
            <label for="review-text" class="block text-sm font-medium text-gray-700">Your Review</label>
            <textarea id="review-text" rows="4" class="mt-1 w-full border rounded-md p-2" placeholder="Tell us what you liked or disliked..." required></textarea>
        </div>

        <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700">Add a Photo (Optional)</label>
            <div class="mt-2 flex items-center">
                <input type="file" id="review-photo" accept="image/*" class="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100">
                <img id="review-photo-preview" class="w-16 h-16 object-cover rounded-md ml-4 hidden" src="#" alt="Photo Preview">
            </div>
        </div>

        <button type="submit" id="submit-review-btn" class="w-full bg-pink-600 text-white py-3 rounded-md font-semibold hover:bg-pink-700">Submit Review</button>
    </form>

    <p id="login-for-review" class="mt-4 text-center ${currentUser ? 'hidden' : ''}">Please <a href="#" onclick="navigateTo('/login'); return false;" class="text-pink-600 font-semibold">login</a> to write a review.</p>
</div>
    `;
// यह जावास्क्रिप्ट कोड renderProduct फंक्शन के अंत में जोड़ें

// --- LOGIC FOR REVIEW FORM INTERACTIVITY ---
const starRatingContainer = document.getElementById('star-rating-input');
const ratingValueInput = document.getElementById('rating-value');
if (starRatingContainer) {
    const stars = starRatingContainer.querySelectorAll('i');
    starRatingContainer.addEventListener('mouseover', (e) => {
        if (e.target.matches('i')) {
            const hoverValue = parseInt(e.target.dataset.value);
            stars.forEach(star => {
                star.className = parseInt(star.dataset.value) <= hoverValue ? 'fas fa-star text-yellow-400 cursor-pointer' : 'far fa-star text-gray-300 cursor-pointer';
            });
        }
    });
    starRatingContainer.addEventListener('mouseout', () => {
         const selectedValue = parseInt(ratingValueInput.value);
         stars.forEach(star => {
            star.className = parseInt(star.dataset.value) <= selectedValue ? 'fas fa-star text-yellow-400 cursor-pointer' : 'far fa-star text-gray-300 cursor-pointer';
         });
    });
    starRatingContainer.addEventListener('click', (e) => {
        if (e.target.matches('i')) {
            ratingValueInput.value = e.target.dataset.value;
        }
    });
}

const photoInput = document.getElementById('review-photo');
const photoPreview = document.getElementById('review-photo-preview');
if (photoInput && photoPreview) {
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            photoPreview.src = URL.createObjectURL(file);
            photoPreview.classList.remove('hidden');
        } else {
            photoPreview.classList.add('hidden');
        }
    });
}

    // Size button click logic (unchanged)
    const sizeSelector = document.getElementById('size-selector');
    const selectedSizeInput = document.getElementById('selected-size');
    if (sizeSelector) {
        sizeSelector.addEventListener('click', (e) => {
            if (e.target.matches('.size-btn')) {
                sizeSelector.querySelectorAll('.size-btn').forEach(btn => {
                    btn.classList.remove('bg-pink-600', 'text-white', 'border-pink-600');
                });
                e.target.classList.add('bg-pink-600', 'text-white', 'border-pink-600');
                selectedSizeInput.value = e.target.dataset.size;
            }
        });
    }

    // Thumbnail click logic (unchanged)
    const mainProductImage = document.getElementById('main-product-image');
    document.querySelectorAll('.thumbnail-image').forEach(thumb => {
        thumb.addEventListener('click', () => {
            mainProductImage.src = thumb.src;
            document.querySelectorAll('.thumbnail-image').forEach(t => t.classList.replace('border-pink-500', 'border-gray-200'));
            thumb.classList.replace('border-gray-200', 'border-pink-500');
        });
    });

    // =======================================================
    // START: NEW WISHLIST FUNCTIONALITY LOGIC
    // =======================================================
    const wishlistBtn = document.getElementById('wishlist-btn');
    const wishlistIcon = document.getElementById('wishlist-icon');
    const wishlistText = document.getElementById('wishlist-text');

    // Function to update the button's appearance
    const updateWishlistButtonState = (isWishlisted) => {
        if (isWishlisted) {
            wishlistBtn.classList.add('text-pink-500', 'border-pink-500');
            wishlistIcon.classList.replace('far', 'fas'); // far = regular, fas = solid
            wishlistText.textContent = 'WISHLISTED';
        } else {
            wishlistBtn.classList.remove('text-pink-500', 'border-pink-500');
            wishlistIcon.classList.replace('fas', 'far');
            wishlistText.textContent = 'WISHLIST';
        }
    };

    // Check initial state when the page loads
    if (currentUser && currentUser.wishlist && currentUser.wishlist.includes(productId)) {
        updateWishlistButtonState(true);
    }

    // Add click listener to the button
    wishlistBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Please log in to add items to your wishlist.');
            navigateTo('/login');
            return;
        }

        const userRef = doc(db, "users", currentUser.uid);
        const isCurrentlyWishlisted = currentUser.wishlist && currentUser.wishlist.includes(productId);

        try {
            if (isCurrentlyWishlisted) {
                // Remove from wishlist
                await updateDoc(userRef, {
                    wishlist: arrayRemove(productId)
                });
                // Update local state
                currentUser.wishlist = currentUser.wishlist.filter(id => id !== productId);
                updateWishlistButtonState(false);
                alert('Removed from wishlist!');
            } else {
                // Add to wishlist
                await updateDoc(userRef, {
                    wishlist: arrayUnion(productId)
                });
                // Update local state
                if (!currentUser.wishlist) currentUser.wishlist = [];
                currentUser.wishlist.push(productId);
                updateWishlistButtonState(true);
                alert('Added to wishlist!');
            }
        } catch (error) {
            console.error("Error updating wishlist: ", error);
            alert("Sorry, there was an error. Please try again.");
        }
    });

        const reviewsContainer = document.getElementById('reviews-container');
        const q = query(collection(db, "products", productId, "reviews"));
        onSnapshot(q, (querySnapshot) => {
            reviewsContainer.innerHTML = '';
            if (querySnapshot.empty) {
                reviewsContainer.innerHTML = '<p class="text-gray-500">No reviews yet. Be the first to review!</p>';
            } else {
                querySnapshot.forEach((doc) => {
                    const review = doc.data();
                    const reviewEl = document.createElement('div');
                    reviewEl.className = 'border-b pb-2';
                    // >>> IS NAYE CODE SE REPLACE KAREIN <<<
const deleteButtonHtml = (currentUser && currentUser.uid === review.userId)
    ? `<button class="delete-review-btn text-red-500 text-xs ml-4 font-semibold hover:underline" data-product-id="${productId}" data-review-id="${doc.id}">Delete</button>`
    : '';

reviewEl.innerHTML = `
    <div class="flex justify-between items-start">
        <div>
            <div class="flex items-center mb-1">${createStarRating(review.rating, 0)}</div>
            <p><strong>${review.userEmail.split('@')[0]}</strong></p>
        </div>
        ${deleteButtonHtml}
    </div>
    <p class="mt-1 text-gray-700">${review.text}</p>
    ${review.photoURL ? `<img src="${review.photoURL}" alt="Review image" class="mt-2 w-24 h-24 object-cover rounded-md">` : ''}
`;
                    reviewsContainer.appendChild(reviewEl);
                });
            }
        });
        
// =======================================================
    // >>>>>>>>>> YEH POORA NAYA CODE YAHAN PASTE KAREIN <<<<<<<<<<<<
    // =======================================================
    const pincodeBtn = document.getElementById('pincode-check-btn');
    const pincodeInput = document.getElementById('pincode-check-input');
    const pincodeResult = document.getElementById('pincode-check-result'); // <-- Yeh rahi woh line

    if (pincodeBtn) {
        pincodeBtn.addEventListener('click', async () => {
            const pincode = pincodeInput.value.trim();
            
            if (pincode.length !== 6) {
                pincodeResult.textContent = "Please enter a valid 6-digit pincode.";
                pincodeResult.className = 'text-sm mt-2 h-5 text-red-500';
                return;
            }

            pincodeResult.textContent = "Checking...";
            pincodeResult.className = 'text-sm mt-2 h-5 text-gray-500';

            try {
                const pincodeRef = doc(db, "serviceable-pincodes", pincode);
                const docSnap = await getDoc(pincodeRef);

                if (docSnap.exists()) {
                    pincodeResult.textContent = `✅ Delivery available to ${docSnap.data().cityName}.`;
                    pincodeResult.className = 'text-sm mt-2 h-5 text-green-600';
                } else {
                    pincodeResult.textContent = "❌ Sorry, delivery is not available to this pincode.";
                    pincodeResult.className = 'text-sm mt-2 h-5 text-red-500';
                }
            } catch (error) {
                console.error("Error checking pincode:", error);
                pincodeResult.textContent = "Could not check pincode. Try again.";
                pincodeResult.className = 'text-sm mt-2 h-5 text-red-500';
            }
        });
    }
    


    }

    function renderCart() {
        currentRoute = { page: 'cart' };

        if (cart.length === 0) {
            appliedPromoDetails = null;
            mainContent.innerHTML = `
                <div class="text-center py-20">
                    <h2 class="text-3xl font-semibold mb-4">Your Cart is Empty</h2>
                    <button id="continue-shopping-btn" class="bg-pink-600 text-white px-6 py-3 rounded-md hover:bg-pink-700 transition cursor-pointer">Continue Shopping</button>
                </div>
            `;
            document.getElementById('continue-shopping-btn').addEventListener('click', renderHome);
            updateCartCount();
            return;
        }

        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        let discountAmount = 0;

        if (appliedPromoDetails) {
            if (appliedPromoDetails.type === 'percent') {
                discountAmount = (subtotal * appliedPromoDetails.value) / 100;
            } else if (appliedPromoDetails.type === 'fixed') {
                discountAmount = appliedPromoDetails.value;
            }
        }
        const finalTotal = subtotal - discountAmount;

        mainContent.innerHTML = `
            <h2 class="text-3xl font-semibold mb-6">Shopping Cart</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-left border border-gray-300 rounded-md">
                    <thead class="bg-pink-600 text-white">
                        <tr><th class="p-3">Product</th><th class="p-3">Size</th><th class="p-3">Color</th><th class="p-3">Price</th><th class="p-3">Quantity</th><th class="p-3">Total</th><th class="p-3">Remove</th></tr>
                    </thead>
                    <tbody>
                        ${cart.map((item, idx) => `
                            <tr class="border-t border-gray-300">
                                <td class="p-3 flex items-center space-x-4"><img alt="${item.name}" class="w-16 h-16 object-cover rounded" src="${item.image}" width="64" height="64"/><span>${item.name}</span></td>
                                <td class="p-3">${item.size}</td><td class="p-3">${item.color}</td><td class="p-3">${formatPrice(item.price)}</td>
                                <td class="p-3"><input type="number" min="1" value="${item.quantity}" data-idx="${idx}" class="quantity-input border border-gray-300 rounded px-2 py-1 w-16"/></td>
                                <td class="p-3">${formatPrice(item.price * item.quantity)}</td>
                                <td class="p-3 text-center"><button data-idx="${idx}" class="remove-item-btn text-red-600 hover:text-red-800"><i class="fas fa-trash-alt"></i></button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="flex flex-col md:flex-row justify-between mt-6 gap-6">
                <div class="w-full md:w-1/3">
                    <label for="promo-code-input" class="font-semibold mb-2 block">Promo Code</label>
                    <div class="flex items-center border border-gray-300 rounded-md overflow-hidden">
                        <input type="text" id="promo-code-input" placeholder="Enter Code" class="px-3 py-2 w-full focus:outline-none" ${appliedPromoDetails ? 'disabled' : ''}>
                        <button id="apply-promo-btn" class="bg-gray-200 px-4 py-2 font-semibold hover:bg-gray-300 whitespace-nowrap" ${appliedPromoDetails ? 'disabled' : ''}>
                            ${appliedPromoDetails ? 'Applied' : 'Apply'}
                        </button>
                    </div>
                    <p id="promo-message" class="text-sm mt-2 h-5"></p>
                </div>

                <div class="w-full md:w-1/3 text-right space-y-2">
                    <div>Subtotal: <span class="font-semibold">${formatPrice(subtotal)}</span></div>
                    <div class="text-green-600 ${discountAmount > 0 ? '' : 'hidden'}">
                        Discount: <span class="font-semibold">-${formatPrice(discountAmount)}</span>
                    </div>
                    <div class="text-2xl font-bold border-t pt-2">Total: <span class="text-pink-600">${formatPrice(finalTotal)}</span></div>
                    <button id="proceed-checkout-btn" class="w-full mt-4 bg-pink-600 text-white px-6 py-3 rounded-md hover:bg-pink-700 transition cursor-pointer">Proceed to Checkout</button>
                </div>
            </div>
        `;

        const promoInput = document.getElementById('promo-code-input');
        const promoBtn = document.getElementById('apply-promo-btn');
        const promoMessage = document.getElementById('promo-message');

        if (promoBtn && !appliedPromoDetails) {
            promoBtn.addEventListener('click', async () => {
                const code = promoInput.value.toUpperCase().trim();
                if (!code) return;

                const codeRef = doc(db, 'promo-codes', code);
                const docSnap = await getDoc(codeRef);

                if (docSnap.exists() && docSnap.data().isActive) {
                    appliedPromoDetails = { id: docSnap.id, ...docSnap.data() };
                    renderCart();
                } else {
                    promoMessage.textContent = 'Invalid or inactive promo code.';
                    promoMessage.style.color = 'red';
                }
            });
        } else if (promoInput && appliedPromoDetails) {
            promoInput.value = appliedPromoDetails.id;
            promoMessage.textContent = 'Promo code applied!';
            promoMessage.style.color = 'green';
        }
document.getElementById('proceed-checkout-btn').addEventListener('click', () => {
    navigateTo('/checkout');
});
        //attachDynamicListeners();
        updateCartCount();
    }

    function renderCheckout() {
if (!currentUser) {
        alert("Please log in to proceed to checkout.");
        navigateTo('/login');
        return; 
    }



        currentRoute = { page: 'checkout' };
        if (cart.length === 0) { renderCart(); return; }

        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        let discountAmount = 0;
        if (appliedPromoDetails) {
            if (appliedPromoDetails.type === 'percent') {
                discountAmount = (subtotal * appliedPromoDetails.value) / 100;
            } else if (appliedPromoDetails.type === 'fixed') {
                discountAmount = appliedPromoDetails.value;
            }
        }
        const finalTotal = subtotal - discountAmount;

        mainContent.innerHTML = `
            <h2 class="text-3xl font-bold mb-8">Checkout</h2>
            <form id="checkout-form" class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-xl font-semibold mb-6">Shipping Details</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium">Full Name</label>
                            <input type="text" id="full-name" name="fullName" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${currentUser ? currentUser.email.split('@')[0] : ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Email</label>
                            <input type="email" id="email" name="email" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${currentUser ? currentUser.email : ''}">
                        </div>
                        <div class="sm:col-span-2">
                            <label class="block text-sm font-medium">Street Address</label>
                            <input type="text" id="address" name="address" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">City</label>
                            <input type="text" id="city" name="city" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">State</label>
                            <input type="text" id="state" name="state" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Zip Code</label>
                            <input type="text" id="zip" name="zip" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Phone</label>
                            <input type="tel" id="phone" name="phone" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        </div>
                    </div>
                </div>
                <div class="md:col-span-1 bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-xl font-semibold mb-6">Order Summary</h3>
                    <div class="space-y-2 text-sm">${cart.map(item => `<div class="flex justify-between"><span>${item.name} x ${item.quantity}</span><span>${formatPrice(item.price*item.quantity)}</span></div>`).join('')}</div>
                    <div class="flex justify-between font-semibold mt-4 pt-4 border-t"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
                    <div class="flex justify-between text-green-600 ${discountAmount > 0 ? '' : 'hidden'}"><span>Discount</span><span>-${formatPrice(discountAmount)}</span></div>
                    <div class="flex justify-between font-bold text-lg mt-2 pt-2 border-t"><span>Total</span><span>${formatPrice(finalTotal)}</span></div>
                    <button type="submit" form="checkout-form" class="w-full mt-6 bg-pink-600 text-white py-3 rounded-md font-semibold hover:bg-pink-700 transition">Confirm Order</button>
                </div>
            </form>`;

        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
    checkoutForm.addEventListener('submit', async e => {
        e.preventDefault();
        if (!checkoutForm.checkValidity()) {
            checkoutForm.reportValidity();
            return;
        }

        const submitButton = checkoutForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

        // --- Pincode Validation Start ---
        const zipCode = document.getElementById('zip').value.trim();
        const pincodeRef = doc(db, "serviceable-pincodes", zipCode);
        const pincodeSnap = await getDoc(pincodeRef);

        if (!pincodeSnap.exists()) {
            alert(`Sorry, we do not deliver to the pincode ${zipCode}. Please change your address.`);
            submitButton.disabled = false;
            submitButton.innerHTML = 'Confirm Order';
            return; // Order process ko yahin rok dein
        }
        // --- Pincode Validation End ---

        const orderDetails = {
            fullName: document.getElementById('full-name').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zip: document.getElementById('zip').value,
            phone: document.getElementById('phone').value,
            paymentMethod: 'Online',
            cart: cart,
            total: finalTotal,
            discount: discountAmount,
            promoCode: appliedPromoDetails ? appliedPromoDetails.id : 'N/A'
        };

        await submitOrder(orderDetails);

        submitButton.disabled = false;
        submitButton.innerHTML = 'Confirm Order';
    });
}
    }

    async function renderWishlist() {
    currentRoute = { page: 'wishlist' };
    
    // 1. Check if user is logged in
    if (!currentUser) {
        mainContent.innerHTML = `
            <div class="text-center py-20">
                <h2 class="text-3xl font-semibold mb-4">Please Log In</h2>
                <p class="text-gray-600 mb-8">Login to view your wishlist.</p>
                <button id="login-from-wishlist-btn" class="bg-pink-600 text-white px-6 py-3 rounded-md hover:bg-pink-700 transition cursor-pointer">Login</button>
            </div>
        `;
        document.getElementById('login-from-wishlist-btn').addEventListener('click', () => navigateTo('/login'));
        return;
    }

    const userWishlistIds = currentUser.wishlist || [];

    // 2. Check if wishlist is empty
    if (userWishlistIds.length === 0) {
        mainContent.innerHTML = `
            <div class="text-center py-20">
                <h2 class="text-3xl font-semibold mb-4">Your Wishlist is Empty</h2>
                <p class="text-gray-600 mb-8">Looks like you haven't added anything to your wishlist yet.</p>
                <button id="shopping-from-wishlist-btn" class="bg-pink-600 text-white px-6 py-3 rounded-md hover:bg-pink-700 transition cursor-pointer">Continue Shopping</button>
            </div>
        `;
        document.getElementById('shopping-from-wishlist-btn').addEventListener('click', () => navigateTo('/shop'));
        return;
    }

    // 3. Find full product details from the wishlisted IDs
    const wishlistedProducts = allProducts.filter(p => userWishlistIds.includes(p.id));

    // 4. Display the products in a grid
    mainContent.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 mb-8">My Wishlist (${wishlistedProducts.length})</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6" id="wishlist-grid">
            ${wishlistedProducts.map(p => `
                <article class="border rounded-lg overflow-hidden shadow-sm">
                    <img alt="${p.name}" class="w-full h-64 object-cover cursor-pointer product-card" data-id="${p.id}" src="${p.image}"/>
                    <div class="p-4">
                        <h3 class="font-semibold text-gray-800 truncate">${p.brand || ''}</h3>
                        <p class="text-gray-600 text-sm truncate">${p.name}</p>
                        <p class="font-bold mt-2">${formatPrice(p.price)}</p>
                    </div>
                    <div class="p-2 border-t">
                        <button class="w-full bg-pink-600 text-white py-2 rounded-md font-semibold text-sm hover:bg-pink-700 move-to-bag-btn" data-id="${p.id}">
                            Move to Bag
                        </button>
                    </div>
                    <button class="absolute top-2 right-2 bg-white rounded-full h-8 w-8 flex items-center justify-center text-gray-500 hover:text-red-500 remove-from-wishlist-btn" data-id="${p.id}">
                        &times;
                    </button>
                </article>
            `).join('')}
        </div>
    `;
}

    function renderMyOrders() {
    currentRoute = { page: 'my-orders' };

    if (!currentUser) {
        navigateTo('/login');
        return;
    }

    mainContent.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 mb-8">My Orders</h2>
        <div id="orders-container" class="space-y-6">
            <p>Loading your orders...</p>
        </div>
    `;

    const ordersContainer = document.getElementById('orders-container');
    const q = query(collection(db, "orders"), where("customerUid", "==", currentUser.uid), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            ordersContainer.innerHTML = '<p class="text-gray-600">You have not placed any orders yet.</p>';
            return;
        }

        const ordersById = snapshot.docs.reduce((acc, doc) => {
            const orderData = doc.data();
            if (!acc[orderData.orderId]) {
                acc[orderData.orderId] = { ...orderData, subOrders: [] };
            }
            acc[orderData.orderId].subOrders.push(orderData);
            return acc;
        }, {});

        ordersContainer.innerHTML = Object.values(ordersById).map(order => {
            
const orderDate = order.createdAt?.toDate().toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            const totalAmount = order.subOrders.reduce((sum, sub) => sum + sub.total, 0);

            const allItemsHtml = order.subOrders.flatMap(sub => 
                sub.items.map(item => `
                    <div class="flex items-center space-x-3 text-sm">
                        <img src="${item.image}" alt="${item.name}" class="w-12 h-12 rounded object-cover">
                        <div>
                            <p class="font-semibold text-gray-700">${item.name}</p>
                            <p class="text-gray-500">Qty: ${item.quantity} • ${formatPrice(item.price)}</p>
                        </div>
                    </div>
                `)
            ).join('');

            return `
                <div class="border rounded-lg shadow-md overflow-hidden">
                    <div class="bg-gray-100 p-4 flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <p class="font-bold text-gray-800">Order ID: ${order.orderId}</p>
                            <p class="text-sm text-gray-600">Placed on: ${orderDate}</p>
                        </div>
                        <div class="text-right">
                             <p class="text-lg font-bold text-gray-900">${formatPrice(totalAmount)}</p>
                             <span class="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-200 text-yellow-800">${order.status}</span>
                        </div>
                    </div>
                    <div class="p-4 space-y-3">
                       ${allItemsHtml}
                    </div>
                </div>
            `;
        }).join('');
    });
}
    function renderThankYou(orderId) {
        currentRoute = { page: 'thankyou' };
        mainContent.innerHTML = `
            <div class="text-center py-20 max-w-xl mx-auto">
                <h2 class="text-4xl font-bold text-pink-600 mb-4">Thank You for Your Order!</h2>
                <p class="text-lg mb-6">Your order has been confirmed. Your Order ID is <span class="font-semibold">${orderId}</span>.</p>
                <button id="continue-shopping-btn" class="bg-pink-600 text-white px-6 py-3 rounded-md hover:bg-pink-700 transition">Continue Shopping</button>
            </div>
        `;
        document.getElementById('continue-shopping-btn').addEventListener('click', () => {
            cart = [];
            appliedPromoDetails = null;
            updateCartCount();
            renderHome();
        });
    }

    function renderLogin() {
        currentRoute = { page: 'login' };
        mainContent.innerHTML = `
            <div class="max-w-md mx-auto mt-10">
                <form id="login-form" class="bg-white p-8 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
                    <div id="login-error" class="text-red-500 text-center mb-4"></div>
                    <div class="mb-4">
                        <label class="block text-gray-700">Email</label>
                        <input type="email" id="login-email" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-700">Password</label>
                        <input type="password" id="login-password" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <button type="submit" class="w-full bg-pink-600 text-white py-2 rounded-md">Login</button>
                    <p class="text-center mt-4 text-sm"><a href="#" id="show-forgot-password" class="text-pink-600 hover:underline">Forgot Password?</a></p>
                    <p class="text-center mt-4">Don't have an account? <a href="#" id="show-register" class="text-pink-600 hover:underline">Register</a></p>
                </form>
                
                <form id="register-form" class="bg-white p-8 rounded-lg shadow-md hidden">
                    <h2 class="text-2xl font-bold mb-6 text-center">Register</h2>
                    <div id="register-error" class="text-red-500 text-center mb-4"></div>
                    <div class="mb-4">
                        <label class="block text-gray-700">Email</label>
                        <input type="email" id="register-email" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700">Password</label>
                        <input type="password" id="register-password" class="w-full px-3 py-2 border rounded" required>
                    </div>

                    <div class="mb-4">
                        <label class="flex items-center">
                            <input type="checkbox" id="is-vendor-checkbox" class="h-4 w-4 text-pink-600 border-gray-300 rounded">
                            <span class="ml-2 text-gray-700">Register as a Vendor</span>
                        </label>
                    </div>
                    <div id="vendor-fields" class="hidden space-y-4 mb-6">
                        <div>
                            <label class="block text-gray-700">Shop Name</label>
                            <input type="text" id="shop-name" placeholder="Your Shop's Name" class="w-full px-3 py-2 border rounded">
                        </div>
                        <div>
                            <label class="block text-gray-700">Shop Location</label>
                            <input type="text" id="shop-location" placeholder="e.g., Sanawad, Madhya Pradesh" class="w-full px-3 py-2 border rounded">
                        </div>
                        <div>
                            <label class="block text-gray-700">Phone Number</label>
                            <input type="tel" id="phone-number" placeholder="10-digit mobile number" class="w-full px-3 py-2 border rounded">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-pink-600 text-white py-2 rounded-md">Register</button>
                    <p class="text-center mt-4">Already have an account? <a href="#" id="show-login" class="text-pink-600 hover:underline">Login</a></p>
                </form>

                <form id="forgot-password-form" class="bg-white p-8 rounded-lg shadow-md hidden">
                    <h2 class="text-2xl font-bold mb-6 text-center">Reset Password</h2>
                    <div id="reset-message" class="text-center mb-4"></div>
                    <p class="text-sm text-gray-600 mb-4 text-center">Enter your email address and we will send you a link to reset your password.</p>
                    <div class="mb-4">
                        <label class="block text-gray-700">Email</label>
                        <input type="email" id="reset-email" class="w-full px-3 py-2 border rounded" required>
                    </div>
                    <button type="submit" class="w-full bg-pink-600 text-white py-2 rounded-md">Send Reset Link</button>
                    <p class="text-center mt-4">Remember your password? <a href="#" id="show-login-from-reset" class="text-pink-600 hover:underline">Login</a></p>
                </form>
            </div>
        `;
        
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        
        document.getElementById('show-register')?.addEventListener('click', e => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            forgotPasswordForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });

        document.getElementById('show-login')?.addEventListener('click', e => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            forgotPasswordForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });

        document.getElementById('show-forgot-password')?.addEventListener('click', e => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.add('hidden');
            forgotPasswordForm.classList.remove('hidden');
        });

        document.getElementById('show-login-from-reset')?.addEventListener('click', e => {
            e.preventDefault();
            forgotPasswordForm.classList.add('hidden');
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });

        document.getElementById('is-vendor-checkbox').addEventListener('change', (e) => {
            document.getElementById('vendor-fields').classList.toggle('hidden', !e.target.checked);
        });
        
        loginForm?.addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            signInWithEmailAndPassword(auth, email, pass)
                .then(() => renderHome())
                .catch(err => document.getElementById('login-error').textContent = err.message);
        });

        registerForm?.addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const pass = document.getElementById('register-password').value;
            const isVendor = document.getElementById('is-vendor-checkbox').checked;
            const shopName = document.getElementById('shop-name').value;
            const shopLocation = document.getElementById('shop-location').value;
            const phoneNumber = document.getElementById('phone-number').value;
            const registerError = document.getElementById('register-error');

            if (isVendor && (!shopName || !shopLocation || !phoneNumber)) {
                registerError.textContent = "Please fill out all vendor fields: Shop Name, Location, and Phone Number.";
                return;
            }

            createUserWithEmailAndPassword(auth, email, pass)
                .then((userCredential) => {
                    const user = userCredential.user;
                    
                    let userProfile = {
                        email: user.email,
                        role: isVendor ? "vendor" : "customer",
                    };
                    
                    if (isVendor) {
                        userProfile.shopName = shopName;
                        userProfile.status = "pending";
                        userProfile.vendorCategory = "Unassigned";
                        userProfile.shopLocation = shopLocation;
                        userProfile.phoneNumber = phoneNumber;
                    }

                    setDoc(doc(db, "users", user.uid), userProfile).then(() => {
                        alert(isVendor ? "Registration successful! Your account is pending approval." : "Registration successful!");
                        renderHome();
                    });
                })
                .catch(err => registerError.textContent = err.message);
        });

        forgotPasswordForm?.addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            const messageEl = document.getElementById('reset-message');
            
            sendPasswordResetEmail(auth, email)
                .then(() => {
                    messageEl.textContent = 'Password reset email sent! Please check your inbox.';
                    messageEl.className = 'text-green-600 text-center mb-4';
                })
                .catch(err => {
                    messageEl.textContent = "Error: " + err.message;
                    messageEl.className = 'text-red-500 text-center mb-4';
                });
        });
    }

    function renderAbout() {
        currentRoute = { page: 'about' };
        mainContent.innerHTML = `
            <h2 class="text-3xl font-semibold mb-6">About Us</h2>
            <p class="mb-4 max-w-3xl text-gray-700 leading-relaxed">
                Panwar&Son's is India's leading fashion e-commerce platform, offering a wide range of clothing, footwear, accessories, and lifestyle products. Our mission is to bring the latest trends and styles to your doorstep with convenience and trust.
            </p>
            <p class="mb-4 max-w-3xl text-gray-700 leading-relaxed">
                We partner with top brands and designers to provide you with quality products at competitive prices. Customer satisfaction and seamless shopping experience are our top priorities.
            </p>
        `;
    }

    function renderContact() {
        currentRoute = { page: 'contact' };
        mainContent.innerHTML = `
            <h2 class="text-3xl font-semibold mb-6">Contact Us</h2>
            <form id="contact-form" class="max-w-3xl mx-auto space-y-6" novalidate>
                <div><label for="contact-name" class="block font-semibold mb-1">Name</label><input type="text" id="contact-name" required class="w-full border border-gray-300 rounded-md px-3 py-2"/></div>
                <div><label for="contact-email" class="block font-semibold mb-1">Email</label><input type="email" id="contact-email" required class="w-full border border-gray-300 rounded-md px-3 py-2"/></div>
                <div><label for="contact-message" class="block font-semibold mb-1">Message</label><textarea id="contact-message" rows="5" required class="w-full border border-gray-300 rounded-md px-3 py-2"></textarea></div>
                <button type="submit" class="bg-pink-600 text-white px-6 py-3 rounded-md hover:bg-pink-700">Send Message</button>
            </form>
        `;
        
    }

    function handleSearch() {
        const query = document.getElementById('search-input').value.trim() || document.getElementById('mobile-search-input').value.trim();
        if (!query) return;

        const lowerCaseQuery = query.toLowerCase();
        const results = allProducts.filter(p =>
            p.name.toLowerCase().includes(lowerCaseQuery) ||
            p.category.toLowerCase().includes(lowerCaseQuery) ||
            p.description.toLowerCase().includes(lowerCaseQuery)
        );
        renderSearchResults(query, results);
    }

    function renderSearchResults(query, results) {
        currentRoute = { page: 'search', params: query };
        mainContent.innerHTML = `
            <h2 class="text-3xl font-semibold mb-6">Search Results for "${query}"</h2>
            ${results.length === 0 ? `<p class="text-gray-700">No products found.</p>` : `
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    ${results.map(p => `
                        <article class="product-card cursor-pointer border rounded-lg" data-id="${p.id}">
                           <img alt="${p.alt || p.name}" class="w-full h-64 object-cover" src="${p.image}"/>
                            <div class="p-4">
                                <h3>${p.name}</h3><p>${formatPrice(p.price)}</p>
                                <button class="add-to-cart-btn" data-id="${p.id}">Add to Cart</button>
                            </div>
                        </article>
                    `).join('')}
                </div>
            `}
        `;
        
    }

    async function fetchAllProducts() {
        const querySnapshot = await getDocs(collection(db, "products"));
        allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    // --- START: NEW FUNCTION TO FETCH CATEGORIES ---
    async function fetchAllCategories() {
        const querySnapshot = await getDocs(collection(db, "categories"));
        allCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    // --- END: NEW FUNCTION TO FETCH CATEGORIES ---
// 👇 Is poore function ko apne code mein add karein 👇
function loadOrdersIntoContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return; // Agar container na mile toh aage na badhe

    // Check karein ki user Admin hai ya Vendor
    let ordersQuery = currentUser.uid === ADMIN_UID 
        // Agar Admin hai, toh saare orders layein
        ? query(collection(db, "orders"), orderBy("createdAt", "desc"))
        // Agar Vendor hai, toh sirf uske vendorId se match hone wale orders layein
        : query(collection(db, "orders"), where("vendorId", "==", currentUser.uid), orderBy("createdAt", "desc"));

    onSnapshot(ordersQuery, (snapshot) => {
        if(snapshot.empty){
             container.innerHTML = '<p class="text-gray-600">No orders found.</p>';
             return;
        }
        // Har order ke liye HTML banayein
        container.innerHTML = snapshot.docs.map(docSnap => {
            const order = { id: docSnap.id, ...docSnap.data() };
            const orderDate = order.createdAt?.toDate().toLocaleDateString('en-IN') || 'N/A';
            
            // Poori order details ko JSON string mein store karein taaki modal mein use kar sakein
            const orderDetailsJson = JSON.stringify(order);

            // Status ke liye dropdown banayein
            const statuses = ['Pending', 'Shipped', 'Completed', 'Cancelled'];
            const statusDropdown = `
                <select data-order-id="${order.id}" class="order-status-select border rounded p-1 text-sm bg-gray-50">
                    ${statuses.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            `;

            return `
                <div class="border p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p class="font-bold">Order ID: <span class="font-normal">${order.orderId}</span></p>
                        <p class="text-sm text-gray-600">Customer: ${order.customerDetails.fullName} | Date: ${orderDate}</p>
                        ${currentUser.uid === ADMIN_UID ? `<p class="text-xs text-gray-500 mt-1">Vendor: ${order.vendorName || 'N/A'}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-4 w-full sm:w-auto">
                         <p class="font-semibold text-lg">${formatPrice(order.total)}</p>
                         ${statusDropdown}
                         <button class="view-order-details-btn text-sm text-pink-600 hover:underline whitespace-nowrap" data-order-details='${orderDetailsJson}'>View Details</button>
                    </div>
                </div>
            `;
        }).join('');
    });

    // "View Details" button ke liye Event Delegation
    container.addEventListener('click', e => {
        if (e.target.classList.contains('view-order-details-btn')) {
            const orderData = JSON.parse(e.target.getAttribute('data-order-details'));
            const modalContent = document.getElementById('modal-content-area');
            
            const itemsHtml = orderData.items.map(item => `
                <div class="flex justify-between items-center border-t pt-2 mt-2">
                    <div>
                        <p class="font-semibold">${item.name}</p>
                        <p class="text-xs text-gray-500">Qty: ${item.quantity} • Size: ${item.size} • Color: ${item.color}</p>
                    </div>
                    <span>${formatPrice(item.price * item.quantity)}</span>
                </div>
            `).join('');

            modalContent.innerHTML = `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><strong>Order ID:</strong> ${orderData.orderId}</div>
                    <div><strong>Total Amount:</strong> <span class="font-bold">${formatPrice(orderData.total)}</span></div>
                    <div><strong>Customer:</strong> ${orderData.customerDetails.fullName}</div>
                    <div><strong>Email:</strong> ${orderData.customerDetails.email}</div>
                    <div class="col-span-2"><strong>Phone:</strong> ${orderData.customerDetails.phone}</div>
                    <div class="col-span-2"><strong>Shipping Address:</strong> ${orderData.customerDetails.address}, ${orderData.customerDetails.city}, ${orderData.customerDetails.state} - ${orderData.customerDetails.zip}</div>
                </div>
                <div class="mt-4">
                    <h4 class="font-bold mb-2">Items in this order:</h4>
                    <div class="space-y-2">${itemsHtml}</div>
                </div>
                <div class="mt-6 pt-4 border-t">
                        <button id="print-order-receipt-btn" class="w-full bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-800 flex items-center justify-center gap-2">
                            <i class="fas fa-print"></i> Print Receipt / Invoice
                        </button>
                    </div>
            `;
            document.getElementById('order-details-modal').classList.remove('hidden');
        }
    });

    // Status change handle karne ke liye logic
    container.addEventListener('change', async (e) => {
        if (e.target.matches('.order-status-select')) {
            const orderId = e.target.dataset.orderId;
            const newStatus = e.target.value;
            if (confirm(`Change order status to "${newStatus}"?`)) {
                try {
                    await updateDoc(doc(db, "orders", orderId), { status: newStatus });
                    alert('Order status updated!');
                } catch (err) {
                    console.error("Error updating status: ", err);
                    alert("Failed to update status.");
                }
            } else {
                // Agar user "Cancel" par click karta hai, toh dropdown ko purani value par reset kar dein
                const orderDoc = await getDoc(doc(db, "orders", orderId));
                e.target.value = orderDoc.data().status;
            }
        }
    });

    // Modal ko band karne ka logic
    const modal = document.getElementById('order-details-modal');
    const closeModalBtn = document.getElementById('order-details-modal-close-btn');
    if(modal && closeModalBtn){
        const close = () => modal.classList.add('hidden');
        closeModalBtn.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { // Agar background par click ho
                close();
            }
        });
    }
}

    // ===================================================================
// START: NEW ADMIN SECTION CODE
// ===================================================================

// This is the NEW MASTER function for the entire admin area
function renderAdminSection() {
    // Basic admin layout with an updated sidebar and a content area
    mainContent.innerHTML = `
        <div class="flex flex-col md:flex-row">
            <aside class="w-full md:w-64 bg-gray-800 text-white min-h-screen p-4">
                <h2 class="text-xl font-bold mb-8">Admin Menu</h2>
                <nav class="flex flex-col space-y-2">
                    <a href="/admin" data-path="/admin" class="admin-nav-link p-3 rounded hover:bg-gray-700">Dashboard</a>
                    <a href="/admin/orders" data-path="/admin/orders" class="admin-nav-link p-3 rounded hover:bg-gray-700">Orders</a>
                    <a href="/admin/products" data-path="/admin/products" class="admin-nav-link p-3 rounded hover:bg-gray-700">Products</a>
                        <a href="/admin/pickup-schedule" data-path="/admin/pickup-schedule" class="admin-nav-link p-3 rounded hover:bg-gray-700">Schedule Pickup</a>

                    ${currentUser.uid === ADMIN_UID ? `
                        <hr class="border-gray-600 my-2">
                        <h3 class="px-3 text-xs text-gray-400 uppercase font-semibold">Super Admin</h3>
                        <a href="/admin/categories" data-path="/admin/categories" class="admin-nav-link p-3 rounded hover:bg-gray-700">Categories</a>
                        <a href="/admin/vendors" data-path="/admin/vendors" class="admin-nav-link p-3 rounded hover:bg-gray-700">Vendors</a>
                        <a href="/admin/promo-codes" data-path="/admin/promo-codes" class="admin-nav-link p-3 rounded hover:bg-gray-700">Promo Codes</a>
                        <a href="/admin/payouts" data-path="/admin/payouts" class="admin-nav-link p-3 rounded hover:bg-gray-700">Vendor Payouts</a>
<a href="/admin/pincodes" data-path="/admin/pincodes" class="admin-nav-link p-3 rounded hover:bg-gray-700">Manage Pincodes</a>
<a href="/admin/pocket-friendly" data-path="/admin/pocket-friendly" class="admin-nav-link p-3 rounded hover:bg-gray-700">Pocket-Friendly</a>

<a href="/admin/homepage" data-path="/admin/homepage" class="admin-nav-link p-3 rounded hover:bg-gray-700">Manage Homepage</a>

                        <a href="/admin/site-settings" data-path="/admin/site-settings" class="admin-nav-link p-3 rounded hover:bg-gray-700">Site Settings</a>
                    ` : ''}
                </nav>
            </aside>

            <main class="flex-1 p-6 sm:p-8" id="admin-content-area">
                </main>
        </div>
    `;

    // Handle sidebar link clicks
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const path = link.getAttribute('data-path');
            navigateTo(path);
        });
    });
    
    const path = window.location.pathname;
    
    // Highlight the active link in the sidebar
    document.querySelector(`.admin-nav-link[data-path="${path}"]`)?.classList.add('bg-pink-600', 'text-white');

    // Sub-router to render the correct content based on the URL
   const adminContentArea = document.getElementById('admin-content-area');
    if (!adminContentArea) return; // Safety check

    // Sub-router to render the correct content based on the URL
    switch (path) {
        case '/admin':
            renderAdminDashboard(adminContentArea);
            break;
        case '/admin/orders':
            renderAdminOrders(adminContentArea);
            break;
        case '/admin/products':
            renderAdminProducts(adminContentArea);
            break;
            case '/admin/pickup-schedule':
        renderAdminPickupSchedule(adminContentArea);
        break;
        case '/admin/categories':
            if (currentUser.uid === ADMIN_UID) renderAdminCategories(adminContentArea);
            break;
        case '/admin/vendors':
            if (currentUser.uid === ADMIN_UID) renderAdminVendors(adminContentArea);
            break;
        case '/admin/payouts':
            if (currentUser.uid === ADMIN_UID) renderAdminPayouts(adminContentArea);
            break;
        case '/admin/pincodes':
            if (currentUser.uid === ADMIN_UID) renderAdminPincodes(adminContentArea);
            break;
            case '/admin/pocket-friendly':
    if (currentUser.uid === ADMIN_UID) renderAdminPocketFriendly(adminContentArea);
    break;
        case '/admin/promo-codes':
            if (currentUser.uid === ADMIN_UID) renderAdminPromoCodes(adminContentArea);
            break;
            case '/admin/homepage':
        if (currentUser.uid === ADMIN_UID) renderAdminHomepageSections(adminContentArea);
        break;
        case '/admin/site-settings':
            if (currentUser.uid === ADMIN_UID) renderAdminSiteSettings(adminContentArea);
            break;
        default:
            renderAdminDashboard(adminContentArea); // Default to dashboard
    }
}

// Function for the main Dashboard page (/admin)
function renderAdminDashboard() {
    const contentArea = document.getElementById('admin-content-area');
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Dashboard</h2>
        <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-8" role="alert">
            <p class="font-bold">Recalculate Ratings</p>
            <p>Click this button to fix the average ratings for all existing products.</p>
            <button id="recalculate-ratings-btn" class="mt-2 bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
                Run Recalculation
            </button>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4">Recent Orders</h3>
            <div id="orders-list-container" class="space-y-4"><p>Loading orders...</p></div>
        </div>
    `;
    loadOrdersIntoContainer('orders-list-container');
        document.getElementById('recalculate-ratings-btn').addEventListener('click', recalculateAllRatings);

}
// Yeh function sabhi products ki rating ko recalculate karega
async function recalculateAllRatings() {
    const btn = document.getElementById('recalculate-ratings-btn');
    btn.disabled = true;
    btn.textContent = 'Calculating... Please Wait...';
    
    try {
        console.log('Starting recalculation for all products...');
        const productsSnapshot = await getDocs(collection(db, "products"));
        let updatedCount = 0;

        // Har product ke liye loop chalayein
        for (const productDoc of productsSnapshot.docs) {
            const productId = productDoc.id;
            const reviewsRef = collection(db, "products", productId, "reviews");
            const reviewsSnapshot = await getDocs(reviewsRef);
            
            const reviewCount = reviewsSnapshot.size;
            let totalRating = 0;

            if (reviewCount > 0) {
                reviewsSnapshot.forEach(reviewDoc => {
                    totalRating += reviewDoc.data().rating;
                });
                const newAverage = totalRating / reviewCount;

                // Product ko database mein nayi rating ke saath update karein
                await updateDoc(doc(db, "products", productId), {
                    rating: newAverage,
                    reviews: reviewCount
                });
                updatedCount++;
            }
        }
        
        alert(`Recalculation Complete! ${updatedCount} products were updated.`);
        await fetchAllProducts(); // App ke data ko refresh karein
        
    } catch (error) {
        console.error("Error during recalculation:", error);
        alert("An error occurred. Check the console for details.");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Run Recalculation';
    }
}
// Function for the Orders page (/admin/orders)
function renderAdminOrders() {
    const contentArea = document.getElementById('admin-content-area');
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">All Orders</h2>
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div id="orders-list-container" class="space-y-4"><p>Loading orders...</p></div>
        </div>
    `;
    loadOrdersIntoContainer('orders-list-container');
        
}
// ▼▼▼ YEH POORA NAYA FUNCTION ADD KAREIN ▼▼▼

function renderAdminPickupSchedule(contentArea) {
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-4">Pickup Schedule Karna</h2>
        <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-6 rounded-lg shadow-md mb-8">
            <h3 class="text-xl font-bold mb-2"><i class="fas fa-truck mr-2"></i>Sabse Bada Farak (The Biggest Difference)</h3>
            <p class="text-lg">
                Ab aapko courier office jaane ki zaroorat nahi hai. Humara delivery partner aapke diye gaye address se parcel pickup karega.
                Bas neeche diye gaye steps follow karein.
            </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-2xl font-semibold mb-6 border-b pb-3">Step 1: Orders Select Karein (Ready to Ship)</h3>
                <div id="ready-to-ship-orders" class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <p class="text-gray-500">Loading ready to ship orders...</p>
                </div>
            </div>

            <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-2xl font-semibold mb-6 border-b pb-3">Step 2: Pickup Details</h3>
                <form id="pickup-schedule-form" class="space-y-6">
                    <div>
                        <label for="pickup-address" class="block text-sm font-medium text-gray-700">Pickup Address</label>
                        <textarea id="pickup-address" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>${currentUser.shopLocation || ''}</textarea>
                        <p class="mt-1 text-xs text-gray-500">Yeh aapka registered address hai. Zaroorat ho toh badal sakte hain.</p>
                    </div>
                    <div>
                        <label for="pickup-date" class="block text-sm font-medium text-gray-700">Pickup Date</label>
                        <input type="date" id="pickup-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                    </div>
                    <div>
                        <label for="pickup-time" class="block text-sm font-medium text-gray-700">Preferred Pickup Time</label>
                        <select id="pickup-time" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                            <option value="10am-1pm">Morning (10 AM - 1 PM)</option>
                            <option value="1pm-4pm">Afternoon (1 PM - 4 PM)</option>
                            <option value="4pm-7pm">Evening (4 PM - 7 PM)</option>
                        </select>
                    </div>
<div>
    <label for="package-weight" class="block text-sm font-medium text-gray-700">Total Weight (in KG)</label>
    <input type="number" id="package-weight" step="0.1" placeholder="e.g., 2.5" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
    <p class="mt-1 text-xs text-gray-500">Sabhi packages ka kul vajan KG mein daalein.</p>
</div>

                    <button type="submit" class="w-full bg-pink-600 text-white py-3 rounded-md font-semibold hover:bg-pink-700 transition flex items-center justify-center gap-2">
                        <i class="fas fa-calendar-check"></i> Schedule Pickup
                    </button>
                </form>
            </div>
        </div>
    `;

    // Logic to load ready-to-ship orders
    const readyOrdersContainer = document.getElementById('ready-to-ship-orders');
    const packageCountInput = document.getElementById('package-count');

    const ordersQuery = query(collection(db, "orders"),
        where("vendorId", "==", currentUser.uid),
        where("status", "==", "Pending") // 'Pending' status wale orders hi pickup ke liye ready honge
    );

    onSnapshot(ordersQuery, (snapshot) => {
        if (snapshot.empty) {
            readyOrdersContainer.innerHTML = '<p class="text-center text-gray-600 p-4 bg-gray-100 rounded">Aapke paas abhi koi "Ready to Ship" orders nahi hain.</p>';
            return;
        }

        readyOrdersContainer.innerHTML = snapshot.docs.map(doc => {
            const order = { id: doc.id, ...doc.data() };
            const orderDate = order.createdAt?.toDate().toLocaleDateString('en-IN') || 'N/A';
            const itemsSummary = order.items.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ');

            return `
                <div class="border p-3 rounded-lg shadow-sm bg-gray-50">
                    <label class="flex items-start space-x-4 cursor-pointer">
                        <input type="checkbox" data-order-id="${order.id}" class="mt-1 h-5 w-5 text-pink-600 border-gray-300 rounded focus:ring-pink-500 order-checkbox">
                        <div>
                            <p class="font-bold text-gray-800">Order ID: ${order.orderId}</p>
                            <p class="text-sm text-gray-600"><strong>Customer:</strong> ${order.customerDetails.fullName}</p>
                            <p class="text-xs text-gray-500"><strong>Items:</strong> ${itemsSummary}</p>
                        </div>
                    </label>
                </div>
            `;
        }).join('');

        // Add event listener to checkboxes to update package count
        readyOrdersContainer.addEventListener('change', (e) => {
            if (e.target.matches('.order-checkbox')) {
                const checkedCount = readyOrdersContainer.querySelectorAll('.order-checkbox:checked').length;
                packageCountInput.value = checkedCount;
            }
        });
    });

    // Form submission logic
    const pickupForm = document.getElementById('pickup-schedule-form');
    pickupForm.addEventListener('submit',async (e) => {
        e.preventDefault();
        const selectedOrders = Array.from(readyOrdersContainer.querySelectorAll('.order-checkbox:checked'))
                                    .map(cb => cb.dataset.orderId);

        if (selectedOrders.length === 0) {
            alert('Please select at least one order to schedule a pickup.');
            return;
        }
        
        const pickupDetails = {
            address: document.getElementById('pickup-address').value,
            date: document.getElementById('pickup-date').value,
            time: document.getElementById('pickup-time').value,
            packageCount: selectedOrders.length,
            orderIds: selectedOrders
        };

        // Abhi ke liye, hum sirf ek alert dikhayenge.
        // >>>>> YEH NAYA CODE HAI <<<<<
const pickupData = {
    vendorId: currentUser.uid,
    vendorName: currentUser.shopName || currentUser.email.split('@')[0],
    pickupAddress: document.getElementById('pickup-address').value,
    pickupDate: document.getElementById('pickup-date').value,
    pickupTimeSlot: document.getElementById('pickup-time').value,
    packageCount: selectedOrders.length,
    totalWeight: parseFloat(document.getElementById('package-weight').value), // Check karein ki HTML mein id="package-weight" ka input hai
    orderIds: selectedOrders,
    status: 'Pending',
    createdAt: serverTimestamp()
};


try {
    const submitButton = pickupForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    const docRef = await addDoc(collection(db, "pickupRequests"), pickupData);
    console.log("Pickup request saved with ID: ", docRef.id);
    alert(`Pickup request submitted successfully for ${pickupData.packageCount} package(s)!`);
    
    pickupForm.reset();
    packageCountInput.value = 0;
    // Submit hone ke baad sabhi checkboxes ko uncheck kar dein
    readyOrdersContainer.querySelectorAll('.order-checkbox:checked').forEach(cb => cb.checked = false);

    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-calendar-check"></i> Schedule Pickup';

} catch (error) {
    console.error("Error saving pickup request: ", error);
    alert("Sorry, there was an error submitting your request. Please try again.");
    // Error aane par button ko wapas enable kar dein
    const submitButton = pickupForm.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-calendar-check"></i> Schedule Pickup';
}
    });
    
    // Pickup ke liye minimum date aaj ki set karein
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pickup-date').setAttribute('min', today);
}

// Function for the Products page (/admin/products)
// Function for the Products page (/admin/products)
// Function for the Products page (/admin/products)
function renderAdminProducts() {
    const contentArea = document.getElementById('admin-content-area');
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Manage Products</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h3 id="form-title" class="text-xl font-semibold mb-4">Add/Edit Product</h3>
                <form id="add-product-form" class="space-y-4">
                    <input type="text" id="product-name" placeholder="Product Name" class="w-full border p-2 rounded" required>
                    <input type="text" id="product-brand" placeholder="Brand Name" class="w-full border p-2 rounded">
                    <div>
    <label class="block text-sm font-medium text-gray-700">Sizes</label>
    <input type="text" id="product-sizes" placeholder="e.g., S, M, L, XL" class="w-full border p-2 rounded mt-1">
</div>
<div>
    <label class="block text-sm font-medium text-gray-700">Colors</label>
    <input type="text" id="product-colors" placeholder="e.g., Red, Blue, Black" class="w-full border p-2 rounded mt-1">
</div>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" id="product-price" placeholder="Sale Price (₹)" class="w-full border p-2 rounded" required>
                        <input type="number" id="product-original-price" placeholder="Original MRP (₹)" class="w-full border p-2 rounded">
                    </div>
                    <div>
    <label class="block text-sm font-medium text-gray-700">Stock Quantity</label>
    <input type="number" id="product-stock" placeholder="e.g., 10" min="0" class="w-full border p-2 rounded mt-1" required>
</div>
                    <fieldset class="border rounded p-3">
                        <legend class="text-sm font-semibold px-1">Delivery Estimate</legend>
                        <div class="grid grid-cols-2 gap-4">
                           <input type="number" id="delivery-min-days" placeholder="Min Days" class="w-full border p-2 rounded" required>
                           <input type="number" id="delivery-max-days" placeholder="Max Days" class="w-full border p-2 rounded" required>
                        </div>
                    </fieldset>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Product Images (select multiple)</label>
                        <div class="mt-1">
                            <div id="image-previews-container" class="flex flex-wrap gap-2 border p-2 rounded-md min-h-[112px] bg-gray-50">
                                <p class="text-gray-400 self-center mx-auto">Image previews will appear here</p>
                            </div>
                            <input type="file" id="product-image-file" accept="image/*" class="mt-2 text-sm" multiple>
                        </div>
                    </div>
<input type="text" id="product-category" placeholder="Category (auto-assigned)" class="w-full border p-2 rounded bg-gray-100" required disabled>
                    <textarea id="product-description" placeholder="Description" class="w-full border p-2 rounded" required></textarea>
                    <button type="submit" id="submit-product-btn" class="w-full bg-pink-600 text-white py-2 rounded-md hover:bg-pink-700">Add Product</button>
                    <button type="button" id="cancel-edit-btn" class="w-full bg-gray-200 py-2 rounded-md hover:bg-gray-300 hidden">Cancel Edit</button>
                </form>
            </div>
            <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-4">Your Products</h3>
                <div id="admin-products-list" class="space-y-4"><p>Loading products...</p></div>
            </div>
        </div>
    `;
    
    let editingProductId = null;
    const addProductForm = document.getElementById('add-product-form');
    const adminProductsList = document.getElementById('admin-products-list');
    const imageFileInput = document.getElementById('product-image-file');
    const previewsContainer = document.getElementById('image-previews-container');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const submitBtn = document.getElementById('submit-product-btn');
    const formTitle = document.getElementById('form-title');

    const resetForm = () => {
        editingProductId = null;
        addProductForm.reset();
        previewsContainer.innerHTML = '<p class="text-gray-400 self-center mx-auto">Image previews will appear here</p>';
        submitBtn.textContent = 'Add Product';
        formTitle.textContent = 'Add/Edit Product';
        cancelBtn.classList.add('hidden');
    };

    cancelBtn.addEventListener('click', resetForm);
    
    // CHANGE #2: Updated image preview logic for multiple files
    imageFileInput.addEventListener('change', (e) => {
        previewsContainer.innerHTML = ''; // Clear existing previews
        if (e.target.files.length > 0) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.className = 'w-24 h-24 object-cover rounded-md border';
                    previewsContainer.appendChild(img);
                }
                reader.readAsDataURL(file);
            });
        } else {
            previewsContainer.innerHTML = '<p class="text-gray-400 self-center mx-auto">Image previews will appear here</p>';
        }
    });

    // CHANGE #3: New form submission logic to handle multiple uploads
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const imageFiles = document.getElementById('product-image-file').files;
        let newImageUrls = [];

        try {
            if (imageFiles.length > 0) {
                submitBtn.textContent = `Uploading ${imageFiles.length} image(s)...`;
                const uploadPromises = Array.from(imageFiles).map(file => {
                    const imageRef = ref(storage, `product-images/${Date.now()}-${file.name}`);
                    return uploadBytes(imageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
                });
                newImageUrls = await Promise.all(uploadPromises);
            }

            submitBtn.textContent = 'Saving Product Data...';
            
            const productData = {
                name: document.getElementById('product-name').value,
                brand: document.getElementById('product-brand').value,
                price: parseFloat(document.getElementById('product-price').value),
                    stock: parseInt(document.getElementById('product-stock').value) || 0,

                sizes: document.getElementById('product-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
            colors: document.getElementById('product-colors').value.split(',').map(c => c.trim()).filter(Boolean),

                originalPrice: parseFloat(document.getElementById('product-original-price').value) || null,
                deliveryEstimate: {
                    minDays: parseInt(document.getElementById('delivery-min-days').value),
                    maxDays: parseInt(document.getElementById('delivery-max-days').value)
                },
                category: document.getElementById('product-category').value,
                description: document.getElementById('product-description').value,
                vendorId: currentUser.uid,
                vendorName: currentUser.shopName || currentUser.email.split('@')[0],
            };

            if (editingProductId) {
                const productRef = doc(db, "products", editingProductId);
                const productSnap = await getDoc(productRef);
                const existingData = productSnap.data();

                const existingAdditionalImages = existingData.additionalImages || [];
                const allAdditionalImages = [...existingAdditionalImages, ...newImageUrls];

                productData.image = newImageUrls.length > 0 ? newImageUrls[0] : existingData.image;
                productData.additionalImages = newImageUrls.length > 1 ? allAdditionalImages.concat(newImageUrls.slice(1)) : allAdditionalImages;
                
                await updateDoc(productRef, productData);
                alert('Product updated successfully!');
            } else {
                if (newImageUrls.length === 0) {
                    alert("Please select at least one image for the new product.");
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Add Product';
                    return;
                }
                productData.image = newImageUrls[0]; // First image is the main image
                productData.additionalImages = newImageUrls.slice(1); // The rest are additional
                productData.rating = 0;
                productData.reviews = 0;
                await addDoc(collection(db, "products"), productData);
                alert('Product added successfully!');
            }
        } catch (error) {
            console.error("Error saving product: ", error);
            alert("Failed to save product. Please check the console for errors.");
        } finally {
            submitBtn.disabled = false;
            resetForm();
            await fetchAllProducts();
        }
    });

    let productsQuery = currentUser.uid === ADMIN_UID 
        ? query(collection(db, "products"), orderBy("name"))
        : query(collection(db, "products"), where("vendorId", "==", currentUser.uid));
    
    onSnapshot(productsQuery, (snapshot) => {
        adminProductsList.innerHTML = snapshot.empty 
            ? '<p class="text-gray-500">You have not added any products yet.</p>'
            : snapshot.docs.map(doc => {
                const product = { id: doc.id, ...doc.data() };
                return `<div class="flex justify-between items-center border-b pb-2">
                    <span>${product.name}</span>
                    <div>
                        <button class="text-blue-500 hover:text-blue-700 mr-4 edit-product-btn" data-id="${product.id}">Edit</button>
                        <button class="text-red-500 hover:text-red-700 delete-product-btn" data-id="${product.id}">Delete</button>
                    </div>
                </div>`;
            }).join('');
    });
    
    adminProductsList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.matches('.delete-product-btn')) {
            if (confirm('Are you sure you want to delete this product?')) {
                await deleteDoc(doc(db, "products", id));
                await fetchAllProducts();
            }
        } else if (e.target.matches('.edit-product-btn')) {
            const productDoc = await getDoc(doc(db, "products", id));
            const product = productDoc.data();
            
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-brand').value = product.brand || '';
            document.getElementById('product-price').value = product.price || '';
            document.getElementById('product-stock').value = product.stock === undefined ? '' : product.stock;

            // >>> ADD THESE 2 NEW LINES <<<
document.getElementById('product-sizes').value = (product.sizes || []).join(', ');
document.getElementById('product-colors').value = (product.colors || []).join(', ');
            document.getElementById('product-original-price').value = product.originalPrice || '';
            if (product.deliveryEstimate) {
                document.getElementById('delivery-min-days').value = product.deliveryEstimate.minDays || '';
                document.getElementById('delivery-max-days').value = product.deliveryEstimate.maxDays || '';
            }
            document.getElementById('product-category').value = product.category || '';
            document.getElementById('product-description').value = product.description || '';
            
            // Show existing images in the preview
            previewsContainer.innerHTML = '';
            const allImages = [product.image, ...(product.additionalImages || [])].filter(Boolean);
            allImages.forEach(imgUrl => {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.className = 'w-24 h-24 object-cover rounded-md border';
                previewsContainer.appendChild(img);
            });
            
            editingProductId = id;
            submitBtn.textContent = 'Update Product';
            formTitle.textContent = 'Edit Product';
            cancelBtn.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    });
}
// Function for the Categories page (/admin/categories)
// Function for the Categories page (/admin/categories)
function renderAdminCategories() {
    const contentArea = document.getElementById('admin-content-area');
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Manage Categories</h2>
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 id="category-form-title" class="font-semibold mb-4 text-lg">Add New Category</h4>
                    <form id="category-form" class="space-y-4">
                        <input type="hidden" id="category-id">
                        <input type="text" id="category-name" placeholder="Category Name" class="w-full border p-2 rounded" required>
                        <input type="text" id="category-image-url" placeholder="Image URL" class="w-full border p-2 rounded" required>
                        <input type="text" id="category-offer-text" placeholder="Offer Text (e.g., 50-80% OFF)" class="w-full border p-2 rounded">
                        
                        <button type="submit" id="category-submit-btn" class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Add Category</button>
                        
                        <button type="button" id="category-cancel-btn" class="w-full bg-gray-200 py-2 rounded-md hover:bg-gray-300 hidden">Cancel Edit</button>
                    </form>
                </div>
                <div>
                    <h4 class="font-semibold mb-4 text-lg">Existing Categories</h4>
                    <div id="categories-list" class="space-y-2"></div>
                </div>
            </div>
        </div>
    `;
    if (currentUser.role === 'vendor') {
    document.getElementById('product-category').value = currentUser.vendorCategory || '';
}

    // --- NAYA AUR BEHTAR JAVASCRIPT LOGIC ---

    const categoryForm = document.getElementById('category-form');
    const categoriesList = document.getElementById('categories-list');
    const categoryIdInput = document.getElementById('category-id');
    const formTitle = document.getElementById('category-form-title');
    const submitBtn = document.getElementById('category-submit-btn');
    const cancelBtn = document.getElementById('category-cancel-btn');

    // Form ko reset karne ke liye ek function
    const resetForm = () => {
        categoryForm.reset();
        categoryIdInput.value = ''; // Hidden ID ko saaf karein
        formTitle.textContent = 'Add New Category';
        submitBtn.textContent = 'Add Category';
        cancelBtn.classList.add('hidden'); // Cancel button ko chhupa dein
    }

    // Form submit hone par (Add ya Update)
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = categoryIdInput.value; // ID check karein
        const categoryData = {
            name: document.getElementById('category-name').value.trim(),
            imageUrl: document.getElementById('category-image-url').value.trim(),
            offerText: document.getElementById('category-offer-text').value.trim()
        };

        if (!categoryData.name || !categoryData.imageUrl) {
             alert("Name and Image URL are required.");
             return;
        }

        if (categoryId) {
            // Agar ID hai, to yeh EDIT mode hai -> updateDoc ka istemal karein
            await updateDoc(doc(db, "categories", categoryId), categoryData);
            alert('Category updated successfully!');
        } else {
            // Agar ID nahi hai, to yeh ADD mode hai -> addDoc ka istemal karein
            await addDoc(collection(db, "categories"), categoryData);
            alert('Category added successfully!');
        }
        
        resetForm(); // Form ko wapas default state mein le aayein
    });

    // Cancel button par click karne par form reset ho jayega
    cancelBtn.addEventListener('click', resetForm);

    // Categories ki list dikhane ke liye
    onSnapshot(query(collection(db, "categories"), orderBy("name")), (snapshot) => {
        categoriesList.innerHTML = snapshot.docs.map(doc => {
            const category = { id: doc.id, ...doc.data() };
            return `
            <div class="flex justify-between items-center p-2 border rounded">
                <span>${category.name}</span>
                <div>
                    <button class="text-blue-500 hover:text-blue-700 mr-3 edit-category-btn" data-id="${category.id}">Edit</button>
                    <button class="text-red-500 hover:text-red-700 text-lg delete-category-btn" data-id="${category.id}">&times;</button>
                </div>
            </div>
        `}).join('');
    });

    // List mein Edit ya Delete button par click hone par
    categoriesList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return; // Agar button par ID nahi hai to kuch na karein

        if (e.target.matches('.delete-category-btn')) {
            if (confirm('Are you sure you want to delete this category?')) {
                await deleteDoc(doc(db, "categories", id));
            }
        } 
        else if (e.target.matches('.edit-category-btn')) {
            // 1. Firestore se us category ka data layein
            const docRef = doc(db, "categories", id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return;
            const category = docSnap.data();

            // 2. Form mein data bharein
            categoryIdInput.value = id;
            document.getElementById('category-name').value = category.name;
            document.getElementById('category-image-url').value = category.imageUrl;
            document.getElementById('category-offer-text').value = category.offerText || '';

            // 3. Form ko "Edit Mode" mein badlein
            formTitle.textContent = 'Edit Category';
            submitBtn.textContent = 'Save Changes';
            cancelBtn.classList.remove('hidden'); // Cancel button dikhayein

            // 4. User ko form tak scroll karein
            formTitle.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// Function for the Vendors page (/admin/vendors)
function renderAdminVendors() {
    const contentArea = document.getElementById('admin-content-area');
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Vendor Management</h2>
        <div class="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 class="text-xl font-semibold mb-4 text-yellow-600">Pending Approval</h3>
            <div id="pending-vendors-list" class="space-y-4"></div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4 text-green-600">Approved Vendors</h3>
            <div id="approved-vendors-list" class="space-y-4"></div>
        </div>
    `;

    const pendingList = document.getElementById('pending-vendors-list');
    const approvedList = document.getElementById('approved-vendors-list');

    // Fetch and display PENDING vendors
    const pendingQuery = query(collection(db, "users"), where("role", "==", "vendor"), where("status", "==", "pending"));
    onSnapshot(pendingQuery, (snapshot) => {
        if (snapshot.empty) {
            pendingList.innerHTML = '<p class="text-gray-500">No pending vendor requests.</p>';
            return;
        }
        const categoryOptions = allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        pendingList.innerHTML = snapshot.docs.map(doc => {
            const vendor = { id: doc.id, ...doc.data() };
            return `<div class="border p-4 rounded-lg flex justify-between items-center flex-wrap gap-2">
                <div>
                    <p class="font-bold">${vendor.shopName}</p><p class="text-sm text-gray-500">${vendor.email}</p>
                </div>
                <div class="flex items-center">
                    <select id="category-for-${vendor.id}" class="border rounded-md p-2 mr-4"><option value="">Assign Category</option>${categoryOptions}</select>
                    <button data-id="${vendor.id}" class="approve-vendor-btn bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">Approve</button>
                </div>
            </div>`;
        }).join('');
    });

    // Fetch and display APPROVED vendors
    const approvedQuery = query(collection(db, "users"), where("role", "==", "vendor"), where("status", "==", "approved"));
    onSnapshot(approvedQuery, (snapshot) => {
        if (snapshot.empty) {
            approvedList.innerHTML = '<p class="text-gray-500">No approved vendors found.</p>';
            return;
        }
        approvedList.innerHTML = snapshot.docs.map(doc => {
            const vendor = { id: doc.id, ...doc.data() };
            return `<div class="border p-4 rounded-lg flex justify-between items-center flex-wrap gap-2">
                <div>
                    <p class="font-bold">${vendor.shopName}</p><p class="text-sm text-gray-500">${vendor.email}</p>
                    <p class="text-xs text-gray-500 mt-1">Sheet URL: ${vendor.googleSheetUrl ? 'Set' : 'Not Set'}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button data-id="${vendor.id}" data-name="${vendor.shopName}" data-url="${vendor.googleSheetUrl || ''}" class="edit-vendor-btn bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Edit</button>
                    <button data-id="${vendor.id}" data-email="${vendor.email}" data-name="${vendor.shopName}" class="block-vendor-btn bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">Block</button>
                </div>
            </div>`;
        }).join('');
    });

    // Event listeners for Approve, Block, and EDIT buttons
    const adminContentArea = document.getElementById('admin-content-area');
    adminContentArea.addEventListener('click', async e => {
        if (e.target.matches('.approve-vendor-btn')) {
            const vendorId = e.target.dataset.id;
            const selectedCategory = document.getElementById(`category-for-${vendorId}`).value;
            if (!selectedCategory) return alert('Please assign a category.');
            await updateDoc(doc(db, "users", vendorId), { status: "approved", vendorCategory: selectedCategory });
            alert('Vendor approved!');
        }
        if (e.target.matches('.block-vendor-btn')) {
            // ... (block vendor logic is same)
        }
        if (e.target.matches('.edit-vendor-btn')) {
            const vendorId = e.target.dataset.id;
            const vendorName = e.target.dataset.name;
            const currentUrl = e.target.dataset.url;
            
            const modal = document.getElementById('edit-vendor-modal');
            modal.dataset.vendorId = vendorId; // Store vendorId on the modal
            
            document.getElementById('edit-vendor-title').textContent = `Edit Vendor: ${vendorName}`;
            document.getElementById('vendor-sheet-url').value = currentUrl;
            modal.classList.remove('hidden');
        }
    });

    // Logic for the Edit Vendor Modal
    const editModal = document.getElementById('edit-vendor-modal');
    const editForm = document.getElementById('edit-vendor-form');
    const closeModalBtn = document.getElementById('edit-vendor-modal-close-btn');

    const closeModal = () => editModal.classList.add('hidden');

    closeModalBtn.addEventListener('click', closeModal);
    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeModal(); });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const vendorId = editModal.dataset.vendorId;
        const newUrl = document.getElementById('vendor-sheet-url').value.trim();

        if (!vendorId) return;

        try {
            await updateDoc(doc(db, "users", vendorId), { googleSheetUrl: newUrl });
            alert('Vendor details updated successfully!');
            closeModal();
        } catch (error) {
            console.error("Error updating vendor:", error);
            alert("Failed to update vendor details.");
        }
    });
}
// YEH POORA NAYA FUNCTION ADD KAREIN
function renderAdminPayouts() {
    const contentArea = document.getElementById('admin-content-area');
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Vendor Payouts</h2>
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4 text-blue-600">Pending Payouts</h3>
            <p class="text-sm text-gray-500 mb-6">Yahan un vendors ki list hai jinke orders ke paise aapko dene hain. Paisa transfer karne ke baad 'Mark as Paid' par click karein.</p>
            <div id="payouts-container" class="space-y-4"><p>Loading pending payouts...</p></div>
        </div>
    `;

    const payoutsContainer = document.getElementById('payouts-container');

    // Firestore se woh saare orders laayein jinka payout baaki hai
    const pendingOrdersQuery = query(collection(db, "orders"), where("payoutStatus", "==", "Pending"));
    
    onSnapshot(pendingOrdersQuery, (snapshot) => {
        if (snapshot.empty) {
            payoutsContainer.innerHTML = '<p class="text-gray-500">No pending payouts found. Good job!</p>';
            return;
        }

        // Orders ko vendor ke hisaab se group karein
        const payoutsByVendor = snapshot.docs.reduce((acc, doc) => {
            const order = { id: doc.id, ...doc.data() };
            const vendorId = order.vendorId;

            if (!acc[vendorId]) {
                acc[vendorId] = {
                    vendorName: order.vendorName,
                    totalAmount: 0,
                    orderIds: [],
                    orderCount: 0
                };
            }
            
            acc[vendorId].totalAmount += order.total;
            acc[vendorId].orderIds.push(order.id);
            acc[vendorId].orderCount++;
            return acc;
        }, {});

        // Har vendor ke liye HTML banakar display karein
        payoutsContainer.innerHTML = Object.entries(payoutsByVendor).map(([vendorId, data]) => {
            const orderIdsJson = JSON.stringify(data.orderIds); // order IDs ko button mein store karne ke liye
            return `
                <div class="border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
                    <div>
                        <p class="font-bold text-lg">${data.vendorName}</p>
                        <p class="text-sm text-gray-600">Total Pending Orders: ${data.orderCount}</p>
                    </div>
                    <div class="flex items-center gap-4 w-full sm:w-auto">
                        <p class="font-semibold text-xl text-green-600">${formatPrice(data.totalAmount)}</p>
                        <button 
                            class="mark-as-paid-btn bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                            data-vendor-id="${vendorId}"
                            data-vendor-name="${data.vendorName}"
                            data-amount="${data.totalAmount}"
                            data-order-ids='${orderIdsJson}'
                        >
                            Mark as Paid
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    });

    // "Mark as Paid" button ke click ko handle karein
    payoutsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('mark-as-paid-btn')) {
            const button = e.target;
            const vendorName = button.dataset.vendorName;
            const amount = parseFloat(button.dataset.amount);
            const orderIds = JSON.parse(button.dataset.orderIds);

            if (confirm(`Are you sure you have paid ${formatPrice(amount)} to ${vendorName}?`)) {
                markOrdersAsPaid(orderIds, button);
            }
        }
    });
}
// YEH BHI NAYA FUNCTION ADD KAREIN
async function markOrdersAsPaid(orderIds, button) {
    button.disabled = true;
    button.textContent = 'Updating...';

    // Ek saath sabhi orders ko update karne ke liye promises banayein
    const updatePromises = orderIds.map(orderId => {
        const orderRef = doc(db, "orders", orderId);
        return updateDoc(orderRef, {
            payoutStatus: "Paid"
        });
    });

    try {
        await Promise.all(updatePromises);
        alert('Payout status updated successfully!');
        // Page automatically refresh ho jaayega kyunki onSnapshot laga hua hai
    } catch (error) {
        console.error("Error updating payout status: ", error);
        alert("Failed to update status. Please check the console.");
        button.disabled = false;
        button.textContent = 'Mark as Paid';
    }
}
// YEH POORA NAYA FUNCTION ADD KAREIN
function renderAdminPincodes(contentArea) {
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Manage Serviceable Pincodes</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h4 class="font-semibold mb-4 text-lg">Add New Pincode</h4>
                <form id="pincode-form" class="space-y-4">
                    <input type="number" id="pincode-number" placeholder="6-Digit Pincode" class="w-full border p-2 rounded" required>
                    <input type="text" id="pincode-city" placeholder="City Name (e.g., Sanawad)" class="w-full border p-2 rounded" required>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Add Pincode</button>
                </form>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h4 class="font-semibold mb-4 text-lg">Existing Pincodes</h4>
                <div id="pincodes-list" class="space-y-2 max-h-96 overflow-y-auto"></div>
            </div>
        </div>
    `;

    const pincodeForm = document.getElementById('pincode-form');
    const pincodesList = document.getElementById('pincodes-list');

    // Naya pincode add karne ka logic
    pincodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pincode = document.getElementById('pincode-number').value.trim();
        const cityName = document.getElementById('pincode-city').value.trim();
        if (pincode.length !== 6 || !cityName) {
            alert("Please enter a valid 6-digit pincode and city name.");
            return;
        }
        await setDoc(doc(db, "serviceable-pincodes", pincode), { cityName: cityName });
        alert('Pincode added successfully!');
        pincodeForm.reset();
    });

    // Pincodes ki list dikhane ka logic
    const q = query(collection(db, "serviceable-pincodes"), orderBy("cityName"));
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            pincodesList.innerHTML = '<p class="text-gray-500">No serviceable pincodes added yet.</p>';
            return;
        }
        pincodesList.innerHTML = snapshot.docs.map(doc => `
            <div class="flex justify-between items-center p-2 border rounded">
                <span><strong>${doc.id}</strong> - ${doc.data().cityName}</span>
                <button class="text-red-500 hover:text-red-700 text-2xl delete-pincode-btn" data-id="${doc.id}">&times;</button>
            </div>
        `).join('');
    });

    // Pincode delete karne ka logic
    pincodesList.addEventListener('click', async (e) => {
        if (e.target.matches('.delete-pincode-btn')) {
            const pincodeId = e.target.dataset.id;
            if (confirm(`Are you sure you want to delete pincode ${pincodeId}?`)) {
                await deleteDoc(doc(db, "serviceable-pincodes", pincodeId));
                alert('Pincode deleted.');
            }
        }
    });
}

// YEH POORA NAYA FUNCTION ADD KAREIN
function renderAdminHomepageSections(contentArea) {
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Manage Homepage Sections</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 id="section-form-title" class="text-xl font-semibold mb-4">Add New Section</h3>
                <form id="section-form" class="space-y-4">
                    <input type="hidden" id="section-id"> <div>
                        <label class="block text-sm font-medium">Section Title</label>
                        <input type="text" id="section-title" placeholder="e.g., RISING STARS" class="w-full border p-2 rounded mt-1" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Display Order</label>
                        <input type="number" id="section-order" placeholder="e.g., 1" class="w-full border p-2 rounded mt-1" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Section Type (Design)</label>
                        <select id="section-type" class="w-full border p-2 rounded mt-1" required>
                            <option value="">Select a Design</option>
                            <option value="hero_slider">Myntra Hero Slider</option>
                            <option value="promo_banner_with_scroll">Meesho #TRENDZ Banner</option>
                            <option value="promo_banner_with_bubbles">Meesho Gold Banner</option>
                            <option value="large_banner_slider">Rising Stars (Large Banners)</option>
                            <option value="small_brand_slider">Grand Brands (Small Banners)</option>
                        </select>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" id="section-is-active" class="h-4 w-4 text-pink-600" checked>
                        <label for="section-is-active" class="ml-2">Show this section on homepage</label>
                    </div>
                    <button type="submit" id="section-submit-btn" class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Add Section</button>
                    <button type="button" id="section-cancel-btn" class="w-full bg-gray-200 py-2 rounded-md hover:bg-gray-300 hidden">Cancel Edit</button>
                </form>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-4">Existing Sections</h3>
                <div id="sections-list" class="space-y-3"></div>
            </div>
        </div>
    `;

    const sectionForm = document.getElementById('section-form');
    const sectionsList = document.getElementById('sections-list');
    const formTitle = document.getElementById('section-form-title');
    const submitBtn = document.getElementById('section-submit-btn');
    const cancelBtn = document.getElementById('section-cancel-btn');
    const sectionIdInput = document.getElementById('section-id');

    // Form reset karne ke liye function
    const resetForm = () => {
        sectionForm.reset();
        sectionIdInput.value = '';
        formTitle.textContent = 'Add New Section';
        submitBtn.textContent = 'Add Section';
        cancelBtn.classList.add('hidden');
    }

    // Section Add/Update karne ka logic
    sectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sectionId = sectionIdInput.value;
        const sectionData = {
            title: document.getElementById('section-title').value,
            order: parseInt(document.getElementById('section-order').value),
            type: document.getElementById('section-type').value,
            isActive: document.getElementById('section-is-active').checked
        };

        if (sectionId) { // Update existing section
            await updateDoc(doc(db, "homepage-sections", sectionId), sectionData);
            alert('Section updated successfully!');
        } else { // Add new section
            sectionData.items = []; // Naye section mein items array khaali hoga
            await addDoc(collection(db, "homepage-sections"), sectionData);
            alert('Section added successfully!');
        }
        resetForm();
    });
    
    cancelBtn.addEventListener('click', resetForm);

    // Sections ki list dikhane ka logic
    const q = query(collection(db, "homepage-sections"), orderBy("order"));
    onSnapshot(q, (snapshot) => {
        sectionsList.innerHTML = snapshot.docs.map(doc => {
            const section = { id: doc.id, ...doc.data() };
            return `
                <div class="border p-3 rounded flex justify-between items-center">
                    <div>
                        <p class="font-bold">${section.order}. ${section.title}</p>
                        <p class="text-sm text-gray-500">${section.type}</p>
                    </div>
                    <div>
                        <button class="text-blue-500 hover:text-blue-700 mr-2 edit-section-btn" data-id="${section.id}">Edit</button>
                        <button class="text-green-500 hover:text-green-700 mr-2 edit-items-btn" data-id="${section.id}">Edit Items</button>
                        <button class="text-red-500 hover:text-red-700 delete-section-btn" data-id="${section.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    });

    // Edit/Delete buttons ka logic
    sectionsList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.matches('.delete-section-btn')) {
            if (confirm('Are you sure you want to delete this section?')) {
                await deleteDoc(doc(db, "homepage-sections", id));
            }
        } else if (e.target.matches('.edit-section-btn')) {
            const docSnap = await getDoc(doc(db, "homepage-sections", id));
            const section = docSnap.data();
            sectionIdInput.value = id;
            document.getElementById('section-title').value = section.title;
            document.getElementById('section-order').value = section.order;
            document.getElementById('section-type').value = section.type;
            document.getElementById('section-is-active').checked = section.isActive;
            
            formTitle.textContent = 'Edit Section';
            submitBtn.textContent = 'Save Changes';
            cancelBtn.classList.remove('hidden');
        } else if (e.target.matches('.edit-items-btn')) {
            alert("Yeh feature hum agle step mein banayenge. Abhi items ko manually Firestore se manage karein.");
            // Bhavishya mein yahan modal kholne ka code aayega
        }
    });
}
// Function for the Promo Codes page (/admin/promo-codes)
function renderAdminPromoCodes() {
    const contentArea = document.getElementById('admin-content-area');
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Manage Promo Codes</h2>
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 id="promo-form-title" class="font-semibold mb-4 text-lg">Add/Update Code</h4>
                    <form id="promo-code-form" class="space-y-4">
                        <input type="text" id="promo-code-name" placeholder="Code Name (e.g., SAVE10)" class="w-full border p-2 rounded" required>
                        <select id="promo-code-type" class="w-full border p-2 rounded"><option value="percent">Percent (%)</option><option value="fixed">Fixed (₹)</option></select>
                        <input type="number" id="promo-code-value" placeholder="Value" class="w-full border p-2 rounded" required>
                        <div class="flex items-center"><input type="checkbox" id="promo-code-is-active" class="h-4 w-4 text-pink-600" checked><label for="promo-code-is-active" class="ml-2">Is Active</label></div>
                        <button type="submit" id="promo-submit-btn" class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Save Code</button>
                    </form>
                </div>
                <div>
                    <h4 class="font-semibold mb-4 text-lg">Existing Codes</h4>
                    <div id="promo-codes-list" class="space-y-2"></div>
                </div>
            </div>
        </div>
    `;
    
    // --- Yahan se JavaScript Logic Shuru Hota Hai ---

    const promoForm = document.getElementById('promo-code-form');
    const promoList = document.getElementById('promo-codes-list');
    const nameInput = document.getElementById('promo-code-name');
    const formTitle = document.getElementById('promo-form-title');
    const submitBtn = document.getElementById('promo-submit-btn');

    // Naya code save karne ke liye
    promoForm.addEventListener('submit', async e => {
        e.preventDefault();
        const codeName = nameInput.value.toUpperCase().trim();
        if (!codeName) return;
        
        const promoData = {
            type: document.getElementById('promo-code-type').value,
            value: parseFloat(document.getElementById('promo-code-value').value),
            isActive: document.getElementById('promo-code-is-active').checked
        };
        
        try {
            await setDoc(doc(db, 'promo-codes', codeName), promoData, { merge: true });
            alert(`Promo code '${codeName}' saved!`);
            promoForm.reset();
            nameInput.disabled = false;
            formTitle.textContent = 'Add/Update Code';
            submitBtn.textContent = 'Save Code';
        } catch (error) {
            console.error("Error saving promo code: ", error);
            alert("Could not save promo code.");
        }
    });
    
    // Maujooda codes ko database se laakar dikhane ke liye
    onSnapshot(query(collection(db, "promo-codes")), (snapshot) => {
        if (snapshot.empty) {
            promoList.innerHTML = '<p class="text-gray-500">No promo codes found.</p>';
            return;
        }
        promoList.innerHTML = snapshot.docs.map(doc => {
            const code = { id: doc.id, ...doc.data() };
            return `
                <div class="flex justify-between items-center p-2 border rounded">
                    <div>
                        <strong class="text-gray-800">${code.id}</strong>
                        <span class="text-sm text-gray-600">(${code.type === 'percent' ? `${code.value}%` : formatPrice(code.value)} off)</span>
                        <span class="text-xs font-semibold ${code.isActive ? 'text-green-600' : 'text-red-600'}">${code.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div>
                        <button class="text-blue-500 hover:text-blue-700 mr-2 edit-promo-btn" data-id="${code.id}">Edit</button>
                        <button class="text-red-500 hover:text-red-700 delete-promo-btn" data-id="${code.id}">Del</button>
                    </div>
                </div>
            `;
        }).join('');
    });

    // Edit aur Delete buttons ke liye
    promoList.addEventListener('click', async e => {
        const codeId = e.target.dataset.id;
        if (!codeId) return;

        if (e.target.matches('.delete-promo-btn')) {
            if (confirm(`Are you sure you want to delete '${codeId}'?`)) {
                await deleteDoc(doc(db, 'promo-codes', codeId));
                alert('Promo code deleted.');
            }
        } else if (e.target.matches('.edit-promo-btn')) {
            const codeDoc = await getDoc(doc(db, 'promo-codes', codeId));
            if (codeDoc.exists()) {
                const code = codeDoc.data();
                nameInput.value = codeId;
                nameInput.disabled = true;
                document.getElementById('promo-code-type').value = code.type;
                document.getElementById('promo-code-value').value = code.value;
                document.getElementById('promo-code-is-active').checked = code.isActive;
                formTitle.textContent = `Editing: ${codeId}`;
                submitBtn.textContent = 'Update Code';
            }
        }
    });
}

function renderAdminPocketFriendly(contentArea) {
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Manage Pocket-Friendly Section</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h3 id="pf-form-title" class="text-xl font-semibold mb-4">Add New Item</h3>
                <form id="pf-item-form" class="space-y-4">
                    <input type="hidden" id="pf-item-id">
                    <div><label class="block text-sm font-medium">Display Order</label><input type="number" id="pf-item-order" placeholder="e.g., 1, 2, 3..." class="w-full border p-2 rounded mt-1" required></div>
                    <div><label class="block text-sm font-medium">Image URL</label><input type="url" id="pf-item-image-url" placeholder="Paste image URL here" class="w-full border p-2 rounded mt-1" required></div>
                    <div><label class="block text-sm font-medium">Price Text</label><input type="text" id="pf-item-price-text" placeholder="e.g., UNDER ₹399" class="w-full border p-2 rounded mt-1" required></div>
                    <div><label class="block text-sm font-medium">Subtext</label><input type="text" id="pf-item-subtext" placeholder="e.g., BB & CC Creams" class="w-full border p-2 rounded mt-1" required></div>
                    <div><label class="block text-sm font-medium">Link URL</label><input type="text" id="pf-item-link-url" placeholder="e.g., /shop/Makeup" class="w-full border p-2 rounded mt-1" required></div>
                    <button type="submit" id="pf-submit-btn" class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Add Item</button>
                    <button type="button" id="pf-cancel-btn" class="w-full bg-gray-200 py-2 rounded-md hover:bg-gray-300 hidden">Cancel Edit</button>
                </form>
            </div>
            <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-4">Current Items</h3>
                <div id="pf-items-list" class="space-y-3"></div>
            </div>
        </div>
    `;

    const form = document.getElementById('pf-item-form');
    const itemList = document.getElementById('pf-items-list');
    const formTitle = document.getElementById('pf-form-title');
    const submitBtn = document.getElementById('pf-submit-btn');
    const cancelBtn = document.getElementById('pf-cancel-btn');
    const itemIdInput = document.getElementById('pf-item-id');
    const collectionRef = collection(db, "pocketFriendlyItems");

    const resetForm = () => {
        form.reset();
        itemIdInput.value = '';
        formTitle.textContent = 'Add New Item';
        submitBtn.textContent = 'Add Item';
        cancelBtn.classList.add('hidden');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemId = itemIdInput.value;
        const itemData = {
            order: parseInt(document.getElementById('pf-item-order').value),
            imageUrl: document.getElementById('pf-item-image-url').value,
            priceText: document.getElementById('pf-item-price-text').value,
            subtext: document.getElementById('pf-item-subtext').value,
            linkUrl: document.getElementById('pf-item-link-url').value,
        };

        if (itemId) {
            await updateDoc(doc(db, "pocketFriendlyItems", itemId), itemData);
            alert('Item updated!');
        } else {
            await addDoc(collectionRef, itemData);
            alert('Item added!');
        }
        resetForm();
    });

    cancelBtn.addEventListener('click', resetForm);

    const q = query(collectionRef, orderBy("order"));
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            itemList.innerHTML = '<p class="text-gray-500">No items added yet.</p>';
            return;
        }
        itemList.innerHTML = snapshot.docs.map(doc => {
            const item = { id: doc.id, ...doc.data() };
            return `
                <div class="border p-2 rounded flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <img src="${item.imageUrl}" class="w-12 h-16 object-cover rounded">
                        <div>
                            <p class="font-bold">${item.order}. ${item.subtext}</p>
                            <p class="text-sm text-gray-600">${item.priceText}</p>
                        </div>
                    </div>
                    <div>
                        <button class="text-blue-500 hover:text-blue-700 mr-3 edit-pf-item-btn" data-id="${item.id}">Edit</button>
                        <button class="text-red-500 hover:text-red-700 delete-pf-item-btn" data-id="${item.id}">Del</button>
                    </div>
                </div>
            `;
        }).join('');
    });

    itemList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.matches('.delete-pf-item-btn')) {
            if (confirm('Are you sure you want to delete this item?')) {
                await deleteDoc(doc(db, "pocketFriendlyItems", id));
            }
        } else if (e.target.matches('.edit-pf-item-btn')) {
            const docSnap = await getDoc(doc(db, "pocketFriendlyItems", id));
            if (docSnap.exists()) {
                const item = docSnap.data();
                itemIdInput.value = id;
                document.getElementById('pf-item-order').value = item.order;
                document.getElementById('pf-item-image-url').value = item.imageUrl;
                document.getElementById('pf-item-price-text').value = item.priceText;
                document.getElementById('pf-item-subtext').value = item.subtext;
                document.getElementById('pf-item-link-url').value = item.linkUrl;
                
                formTitle.textContent = 'Edit Item';
                submitBtn.textContent = 'Save Changes';
                cancelBtn.classList.remove('hidden');
                formTitle.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
}
// Function for the Site Settings page (/admin/site-settings)
function renderAdminSiteSettings() {
    const contentArea = document.getElementById('admin-content-area');
    contentArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-8">Site Settings</h2>
        <div class="bg-white p-6 rounded-lg shadow-md max-w-2xl">
            <h3 class="text-xl font-semibold mb-4">Manage Pop-up Banner</h3>
            <form id="popup-form" class="space-y-4">
                <div><label class="block text-sm font-medium">Banner Image URL</label><input type="text" id="popup-image-url" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                <div><label class="block text-sm font-medium">Title</label><input type="text" id="popup-title" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                <div><label class="block text-sm font-medium">Offer Text</label><input type="text" id="popup-offer-text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                <div><label class="block text-sm font-medium">Description</label><input type="text" id="popup-description" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                <div class="flex items-center"><input type="checkbox" id="popup-is-active" class="h-4 w-4 text-pink-600"><label for="popup-is-active" class="ml-2">Show Pop-up on site</label></div>
                <button type="submit" class="w-full bg-pink-600 text-white py-2 rounded-md hover:bg-pink-700">Save Banner Settings</button>
            </form>
        </div>
    `;
    
    // Site Settings Logic
    const popupForm = document.getElementById('popup-form');
    const bannerConfigRef = doc(db, 'site-config', 'popup-banner');

    getDoc(bannerConfigRef).then(docSnap => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('popup-image-url').value = data.imageUrl || '';
            document.getElementById('popup-title').value = data.title || '';
            document.getElementById('popup-offer-text').value = data.offerText || '';
            document.getElementById('popup-description').value = data.description || '';
            document.getElementById('popup-is-active').checked = data.isActive || false;
        }
    });

    popupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = {
            imageUrl: document.getElementById('popup-image-url').value,
            title: document.getElementById('popup-title').value,
            offerText: document.getElementById('popup-offer-text').value,
            description: document.getElementById('popup-description').value,
            isActive: document.getElementById('popup-is-active').checked
        };
        await setDoc(bannerConfigRef, settings, { merge: true });
        alert('Banner settings saved!');
    });
}

// ===================================================================
// END: NEW ADMIN SECTION CODE
// ===================================================================
    // <<<<<<<<<<<<< ISKI JAGAH YEH NAYA FUNCTION PASTE KAREIN >>>>>>>>>>>>>
// >>> IS POORE FUNCTION KO REPLACE KAREIN <<<
function setupStaticListeners() {
    // Helper function ko sabse upar define karein
    const safeAddListener = (id, event, func) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, func);
        } else {
            console.warn(`Warning: Element with ID "${id}" was not found.`);
        }
    };

    // Ab neeche is function ko use karein
    const navLinks = {
        'nav-home': '/', 'nav-home-desktop': '/', 'nav-home-mobile': '/',
        'nav-shop-desktop': '/shop', 'nav-shop-mobile': '/shop',
        'nav-about-desktop': '/about', 'nav-about-mobile': '/about',
        'nav-contact-desktop': '/contact', 'nav-contact-mobile': '/contact',
        'nav-wishlist-mobile': '/wishlist',
        'nav-login-desktop': '/login', 'nav-login-mobile': '/login',
        'nav-cart': '/cart',
        'nav-admin-desktop': '/admin', 'nav-admin-mobile': '/admin',
        'footer-logo': '/', 'footer-our-story': '/about',
    };

    for (const [id, path] of Object.entries(navLinks)) {
        safeAddListener(id, 'click', e => {
            e.preventDefault();
            navigateTo(path);
        });
    }
    
    ['footer-careers', 'footer-customer-service', 'footer-returns'].forEach(id => {
        safeAddListener(id, 'click', e => {
            e.preventDefault();
            alert(`${id.replace('footer-', '')} page coming soon!`);
        });
    });

    safeAddListener('logout-btn', 'click', () => signOut(auth));
    safeAddListener('mobile-menu-button', 'click', () => toggleMobileMenu());
    safeAddListener('search-button', 'click', handleSearch);
    safeAddListener('mobile-search-button', 'click', handleSearch);

    safeAddListener('search-input', 'keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    safeAddListener('mobile-search-input', 'keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    safeAddListener('mobile-back-btn', 'click', () => history.back());

    window.addEventListener('click', (e) => {
        if (e.target.id === 'nav-my-orders') {
            e.preventDefault();
            navigateTo('/my-orders');
        }
    });
}

    async function submitOrder(orderDetails) {
    const mainOrderId = 'PNS' + Date.now();

    // --- 1. Cart ke sabhi items ko vendor ke hisaab se group karein ---
    const ordersByVendor = orderDetails.cart.reduce((acc, item) => {
        const vendorId = item.vendorId || ADMIN_UID;
        if (!acc[vendorId]) {
            acc[vendorId] = {
                vendorId: vendorId,
                vendorName: item.vendorName || "Panwar&Son's",
                items: [],
                subtotal: 0,
            };
        }
        acc[vendorId].items.push(item);
        acc[vendorId].subtotal += item.price * item.quantity;
        return acc;
    }, {});

    // --- 2. Har vendor ke liye alag order document banakar Firestore mein save karein ---
    const firestorePromises = Object.values(ordersByVendor).map(vendorOrder => {
        return addDoc(collection(db, "orders"), {
            orderId: mainOrderId,
            vendorId: vendorOrder.vendorId,
            vendorName: vendorOrder.vendorName,
            customerUid: currentUser.uid,
            customerDetails: {
                fullName: orderDetails.fullName,
                email: orderDetails.email,
                address: orderDetails.address,
                city: orderDetails.city,
                state: orderDetails.state,
                zip: orderDetails.zip,
                phone: orderDetails.phone,
            },
            items: vendorOrder.items,
            total: vendorOrder.subtotal,
            status: 'Pending',
            payoutStatus: 'Pending', // <-- YEH NAYI LINE ZAROORI HAI
            createdAt: serverTimestamp(),
        });
    });

    try {
        await Promise.all(firestorePromises);

        // >>> NAYA CODE SHURU <<<
        // Order safalta se save hone ke baad, stock update karein
        const stockUpdatePromises = orderDetails.cart.map(item => {
            const productRef = doc(db, "products", item.id);
            // increment() atomically stock ko kam kar dega
            return updateDoc(productRef, {
                stock: increment(-item.quantity)
            });
        });
        await Promise.all(stockUpdatePromises);
        renderThankYou(mainOrderId);
    } catch (error) {
        console.error("CRITICAL: Failed to save order to Firestore:", error);
        alert('There was a critical error placing your order. Please try again.');
        return;
    }

    // --- 3. Google Sheet mein background mein data bhejein ---
    const formEndpoint = 'https://script.google.com/macros/s/AKfycbwbojGnpFoVfEXnfL5Z0-HXZLvPYmYMS_mdqT-PjvUheMwxd82ztLhZ33l1aUOR7_pGCA/exec';
    const submissionData = {
        'Order ID': mainOrderId,
        'Customer Name': orderDetails.fullName,
        'Email': orderDetails.email,
        'Phone': orderDetails.phone,
        'Shipping Address': `${orderDetails.address}, ${orderDetails.city}, ${orderDetails.state} - ${orderDetails.zip}`,
        'Payment Method': orderDetails.paymentMethod,
        'Total Amount': formatPrice(orderDetails.total),
        'Items': orderDetails.cart.map(item => `- ${item.name} (Qty: ${item.quantity})`).join('\n'),
    };

    fetch(formEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(submissionData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.result === 'success') {
                console.log('Order successfully synced to Google Sheet.');
            } else {
                console.warn('Order sync to Google Sheet failed.', data);
            }
        })
        .catch(error => {
            console.error('Error syncing order to Google Sheet:', error);
        });
}

    const offerModal = document.getElementById('offer-modal');
    const closeModalBtn = document.getElementById('offer-modal-close-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalShopNowBtn = document.getElementById('modal-shop-now-btn');
    const popupBannerImage = document.getElementById('popup-banner-image');
    const popupBannerTitle = document.getElementById('popup-banner-title');
    const popupBannerOfferText = document.getElementById('popup-banner-offer-text');
    const popupBannerDescription = document.getElementById('popup-banner-description');
    const popupBannerPromoCode = document.getElementById('popup-banner-promo-code');

    const showOfferModal = async () => {
        if (sessionStorage.getItem('offerShown')) return;

        try {
            const bannerConfigRef = doc(db, 'site-config', 'popup-banner');
            const docSnap = await getDoc(bannerConfigRef);
            if (docSnap.exists() && docSnap.data().isActive) {
                const bannerData = docSnap.data();
                popupBannerImage.src = bannerData.imageUrl;
                popupBannerTitle.textContent = bannerData.title;
                popupBannerOfferText.textContent = bannerData.offerText;
                popupBannerDescription.textContent = bannerData.description;
                popupBannerPromoCode.textContent = bannerData.promoCode || '';

                modalShopNowBtn.onclick = (e) => {
                    e.preventDefault();
                    hideOfferModal();
                    renderShop(null); // Simple navigation to shop page
                };
                setTimeout(() => {
                    offerModal.classList.remove('hidden');
                    sessionStorage.setItem('offerShown', 'true');
                }, 2000);
            }
        } catch (error) {
            console.error("Error fetching pop-up config:", error);
        }
    };

    const hideOfferModal = () => offerModal.classList.add('hidden');
    closeModalBtn.addEventListener('click', hideOfferModal);
    modalOverlay.addEventListener('click', hideOfferModal);

    onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
            currentUser = { uid: user.uid, email: user.email, ...userDocSnap.data() };
        } else {
            // Yahan par admin ke liye ek special check joda gaya hai
            let newUserProfile;
            if (user.uid === ADMIN_UID) {
                newUserProfile = { email: user.email, role: "admin", shopName: "Panwar&Son's Admin" };
            } else {
                newUserProfile = { email: user.email, role: "customer", shopName: user.email.split('@')[0] };
            }
            await setDoc(doc(db, "users", user.uid), newUserProfile);
            currentUser = { uid: user.uid, ...newUserProfile };
        }
    } else {
        currentUser = null;
    }
    updateUserDisplay(currentUser);
});
// =======================================================
// START: LAZY LOADING AUR SCROLL ANIMATION KA NAYA LOGIC
// =======================================================

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible-on-scroll');
        }
    });
});

// Helper function jise hum har render function mein call karenge
function applyScrollAnimations() {
    const hiddenElements = document.querySelectorAll('.hidden-on-load');
    hiddenElements.forEach((el) => observer.observe(el));
}
    async function initializeApp() {
    setupStaticListeners();      // For header/footer elements that never change
    setupDynamicEventListeners(); // Our new function for the main content area!
    //await fetchAllCategories();
    await fetchAllProducts();
    handleLocation(window.location.pathname); // Use handleLocation for initial load
    showOfferModal();
}

    initializeApp();

</script>