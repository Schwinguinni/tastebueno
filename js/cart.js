/* TasteBueno cart — localStorage, Stripe Checkout on submit */

const Cart = (() => {
  const STORAGE_KEY = 'tb_cart';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    renderCart();
    updateCount();
  }

  function add(item) {
    const items = load();
    const existing = items.find(i => i.id === item.id && i.optKey === item.optKey);
    if (existing) {
      existing.qty = Math.min(existing.qty + item.qty, 99);
    } else {
      items.push(item);
    }
    save(items);
  }

  function remove(id, optKey) {
    save(load().filter(i => !(i.id === id && i.optKey === optKey)));
  }

  function updateQty(id, optKey, qty) {
    const items = load();
    const item = items.find(i => i.id === id && i.optKey === optKey);
    if (item) { item.qty = Math.max(1, Math.min(99, qty)); save(items); }
  }

  function total() { return load().reduce((s, i) => s + i.price * i.qty, 0); }
  function count() { return load().reduce((s, i) => s + i.qty, 0); }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    renderCart();
    updateCount();
  }

  function updateCount() {
    const n = count();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = n;
      el.classList.toggle('visible', n > 0);
    });
  }

  function renderCart() {
    const items     = load();
    const itemsEl   = document.getElementById('cartItems');
    const emptyEl   = document.getElementById('cartEmpty');
    const subtotalEl= document.getElementById('cartSubtotal');
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (!itemsEl) return;

    if (!items.length) {
      itemsEl.innerHTML = '';
      emptyEl  && (emptyEl.style.display = 'flex');
      subtotalEl && (subtotalEl.textContent = '$0.00');
      checkoutBtn && (checkoutBtn.disabled = true);
      return;
    }
    emptyEl  && (emptyEl.style.display = 'none');
    checkoutBtn && (checkoutBtn.disabled = false);

    itemsEl.innerHTML = items.map(item => `
      <div class="cart-item">
        <div class="cart-item-img">
          ${item.image ? `<img src="${item.image}" alt="${item.name}">` : item.emoji || '🎨'}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          ${item.opts ? `<div class="cart-item-opts">${item.opts}</div>` : ''}
          <div class="cart-item-bottom">
            <div class="cart-item-qty">
              <button data-qty-change data-id="${item.id}" data-opt="${item.optKey||''}" data-delta="-1">−</button>
              <span>${item.qty}</span>
              <button data-qty-change data-id="${item.id}" data-opt="${item.optKey||''}" data-delta="1">+</button>
            </div>
            <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
          </div>
          <button class="cart-item-remove" data-remove data-id="${item.id}" data-opt="${item.optKey||''}">Remove</button>
        </div>
      </div>
    `).join('');

    subtotalEl && (subtotalEl.textContent = '$' + total().toFixed(2));
  }

  async function checkout() {
    const items = load();
    if (!items.length) return;
    const btn = document.getElementById('cartCheckoutBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Redirecting...'; }
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      alert('Checkout error: ' + err.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Checkout'; }
    }
  }

  function openDrawer() {
    document.getElementById('cartDrawer')?.classList.add('open');
    document.getElementById('cartOverlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    document.getElementById('cartDrawer')?.classList.remove('open');
    document.getElementById('cartOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function init() {
    renderCart();
    updateCount();

    document.getElementById('cartOverlay')?.addEventListener('click', closeDrawer);
    document.getElementById('cartCloseBtn')?.addEventListener('click', closeDrawer);
    document.getElementById('cartCheckoutBtn')?.addEventListener('click', checkout);
    document.querySelectorAll('[data-cart-open]').forEach(el =>
      el.addEventListener('click', openDrawer)
    );

    // Event delegation — handles dynamically rendered products too
    document.addEventListener('click', e => {
      // Add to cart
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        const d = addBtn.dataset;
        Cart.add({
          id:      d.productId,
          optKey:  d.optKey || '',
          name:    d.name,
          price:   parseFloat(d.price),
          priceId: d.priceId || '',
          qty:     1,
          opts:    d.opts || '',
          image:   d.image || '',
          emoji:   d.emoji || '🎨',
        });
        addBtn.textContent = '✓ Added';
        addBtn.classList.add('added');
        setTimeout(() => { addBtn.textContent = 'Add to Cart'; addBtn.classList.remove('added'); }, 2000);
        openDrawer();
        return;
      }

      // Qty change (in cart drawer)
      const qtyBtn = e.target.closest('[data-qty-change]');
      if (qtyBtn) {
        const items = load();
        const item  = items.find(i => i.id === qtyBtn.dataset.id && i.optKey === qtyBtn.dataset.opt);
        if (item) updateQty(item.id, item.optKey, item.qty + parseInt(qtyBtn.dataset.delta));
        return;
      }

      // Remove (in cart drawer)
      const removeBtn = e.target.closest('[data-remove]');
      if (removeBtn) {
        remove(removeBtn.dataset.id, removeBtn.dataset.opt);
      }
    });
  }

  return { add, remove, updateQty, clear, count, total, load, openDrawer, closeDrawer, checkout, init };
})();

document.addEventListener('DOMContentLoaded', Cart.init);
