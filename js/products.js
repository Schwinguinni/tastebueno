/* Load products.json and render product cards */
const Products = (() => {
  let cache = null;

  async function load() {
    if (cache) return cache;
    const res = await fetch('/products.json');
    const data = await res.json();
    cache = data.products || [];
    return cache;
  }

  function cardHTML(p) {
    const imgEl = p.images?.[0]
      ? `<img src="${p.images[0]}" alt="${p.name}" loading="lazy">`
      : `<span style="font-size:3rem">${p.emoji || '🎨'}</span>`;
    const badge = p.badge ? `<span class="product-badge">${p.badge}</span>` : '';

    // Variant products — whole card links to product page for option selection
    if (p.variants?.length) {
      const minPrice = Math.min(...p.variants.map(v => v.price));
      return `
        <div class="product-card" data-cat="${p.category}">
          <a href="/product.html?id=${p.id}" style="display:contents;color:inherit;text-decoration:none;" tabindex="-1" aria-hidden="true">
            <div class="product-card-img">${imgEl}${badge}</div>
          </a>
          <div class="product-card-body">
            <a href="/product.html?id=${p.id}" style="color:inherit;text-decoration:none;">
              <div class="product-card-name">${p.name}</div>
            </a>
            <div class="product-card-desc">${p.shortDesc || ''}</div>
            <div class="product-card-footer">
              <div class="product-price"><span style="font-size:.75em;font-weight:500">from</span> $${minPrice.toFixed(2)}</div>
              <a href="/product.html?id=${p.id}" class="add-to-cart-btn">View Options</a>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="product-card" data-cat="${p.category}">
        <a href="/product.html?id=${p.id}" style="display:block;color:inherit;text-decoration:none;">
          <div class="product-card-img">${imgEl}${badge}</div>
        </a>
        <div class="product-card-body">
          <a href="/product.html?id=${p.id}" style="color:inherit;text-decoration:none;">
            <div class="product-card-name">${p.name}</div>
          </a>
          <div class="product-card-desc">${p.shortDesc || ''}</div>
          <div class="product-card-footer">
            <div class="product-price">$${p.price.toFixed(2)}</div>
            <button class="add-to-cart-btn"
              data-add-to-cart
              data-product-id="${p.id}"
              data-opt-key="default"
              data-name="${p.name.replace(/"/g, '&quot;')}"
              data-price="${p.price}"
              data-price-id="${p.stripePrice || ''}"
              data-emoji="${p.emoji || '🎨'}"
              data-image="${p.images?.[0] || ''}"
            >Add to Cart</button>
          </div>
        </div>
      </div>`;
  }

  async function renderShop() {
    const products = await load();
    const categories = ['stencils', 'prints', 'originals', 'stickers', 'spray'];

    categories.forEach(cat => {
      const section = document.getElementById(cat);
      if (!section) return;
      const grid = section.querySelector('.products-grid');
      if (!grid) return;
      const items = products.filter(p => p.category === cat);
      grid.innerHTML = items.length
        ? items.map(cardHTML).join('')
        : `<p style="color:var(--text-muted);padding:1rem 0;">No products in this category yet.</p>`;
    });
  }

  async function renderFeatured(gridEl) {
    if (!gridEl) return;
    const products = await load();
    const featured = products.filter(p => p.featured && p.inStock !== false).slice(0, 4);
    gridEl.innerHTML = featured.length
      ? featured.map(cardHTML).join('')
      : products.slice(0, 4).map(cardHTML).join('');
  }

  return { load, cardHTML, renderShop, renderFeatured };
})();
