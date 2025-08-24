/* ===========================
   Helpers y estado global
=========================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const fmt = n =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

let PRODUCTS = [];
const CART   = new Map(); // id -> qty

// Envío
const FREE_SHIPPING_MIN = 5000;
const SHIPPING_FEE      = 800;

// WhatsApp de la tienda (sin espacios ni signos, con prefijo 54 y 9)
const STORE_WA = '5492235551421';

/* ===========================
   Cargar productos (sin cache)
=========================== */
async function loadProducts() {
  try {
    const res = await fetch('products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar products.json');
    PRODUCTS = await res.json();
  } catch (err) {
    console.error(err);
    PRODUCTS = [];
  }
}

/* ===========================
   Render de productos
=========================== */
function renderProducts() {
  const grid = $('#productGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) {
    grid.innerHTML = '<p style="padding:16px">No hay productos para mostrar.</p>';
    return;
  }

  PRODUCTS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
   card.innerHTML = `
  <div class="img-wrap">
    <img src="assets/${p.image}" alt="${p.title}">
  </div>

  <h3 class="title">${p.title}</h3>
  <p class="sku">SKU: ${p.sku}</p>

  <div class="price-row">
    <strong class="price">$ ${fmt(p.price)}</strong>
    <div class="qty">
      <button class="qty-dec" data-id="${p.id}">-</button>
      <input class="qty-input" type="number" min="1" value="1" data-id="${p.id}">
      <button class="qty-inc" data-id="${p.id}">+</button>
    </div>
  </div>

  <button class="btn btn-add" data-id="${p.id}">Agregar</button>
`;
grid.appendChild(card);

  // Delegamos eventos de +/– y Agregar
  grid.addEventListener('click', e => {
    const btn = e.target;

    // Cantidad +
    if (btn.classList.contains('qty-inc')) {
      const input = btn.closest('.price-row').querySelector('.qty-input');
      input.value = Math.max(1, (parseInt(input.value, 10) || 1) + 1);
      return;
    }

    // Cantidad –
    if (btn.classList.contains('qty-dec')) {
      const input = btn.closest('.price-row').querySelector('.qty-input');
      input.value = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
      return;
    }

    // Agregar
    if (btn.classList.contains('btn-add')) {
      const id = btn.getAttribute('data-id');
      const input = btn.closest('.card').querySelector('.qty-input');
      const qty = Math.max(1, parseInt(input.value, 10) || 1);
      addToCart(id, qty);   // ← NO abre el carrito
      updateCart();
    }
  }, { once: true }); // nos suscribimos una vez a la grilla
}

/* ===========================
   Carrito
=========================== */
function addToCart(prodId, qty = 1) {
  const current = CART.get(prodId) || 0;
  CART.set(prodId, current + qty);
}
function removeFromCart(prodId) {
  CART.delete(prodId);
}
function setQty(prodId, qty) {
  if (qty <= 0) {
    CART.delete(prodId);
  } else {
    CART.set(prodId, qty);
  }
}

function cartItemsList() {
  // Convierte CART (Map) a array con info de productos
  return [...CART.entries()].map(([id, qty]) => {
    const product = PRODUCTS.find(p => String(p.id) === String(id));
    if (!product) return null;
    return { product, qty };
  }).filter(Boolean);
}

function calcTotals() {
  const items = cartItemsList();
  const subtotal = items.reduce((acc, { product, qty }) => acc + product.price * qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_MIN || subtotal === 0 ? 0 : SHIPPING_FEE;
  const discount = 0; // si en el futuro querés aplicar descuentos, cámbialo acá
  const total = Math.max(0, subtotal + shipping - discount);
  const shippingLabel = shipping === 0 ? 'Envío gratis' : fmt(shipping);
  return { items, subtotal, shipping, discount, total, shippingLabel };
}

function updateCart() {
  const { items, subtotal, shipping, discount, total, shippingLabel } = calcTotals();

  // Badge del carrito
  const totalUnits = items.reduce((acc, it) => acc + it.qty, 0);
  const badge = $('#cartCount');
  if (badge) badge.textContent = totalUnits;

  // Totales en el cajón
  $('#subtotal')?.replaceChildren(document.createTextNode(fmt(subtotal)));
  $('#shippingLabel')?.replaceChildren(document.createTextNode(shippingLabel));
  $('#discount')?.replaceChildren(document.createTextNode(fmt(discount)));
  $('#total')?.replaceChildren(document.createTextNode(fmt(total)));

  // Lista de items en el cajón
  const list = $('#cartItems');
  if (list) {
    if (items.length === 0) {
      list.innerHTML = '<p style="padding:12px 0">Todavía no agregaste productos.</p>';
    } else {
      list.innerHTML = items.map(({ product, qty }) => `
        <div class="cart-row" data-id="${product.id}" style="display:flex;justify-content:space-between;align-items:center;margin:8px 0;">
          <div>
            <div style="font-weight:600">${product.title}</div>
            <div style="font-size:12px;color:#666">SKU: ${product.sku}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="c-dec" type="button">-</button>
            <input class="c-qty" type="number" min="1" value="${qty}" style="width:48px;text-align:center;">
            <button class="c-inc" type="button">+</button>
            <button class="c-del btn-link" type="button" title="Quitar">Quitar</button>
          </div>
        </div>
      `).join('');
    }

    // Delegación de eventos del cajón
    list.onclick = e => {
      const row = e.target.closest('.cart-row');
      if (!row) return;
      const id = row.getAttribute('data-id');

      if (e.target.classList.contains('c-inc')) {
        const input = row.querySelector('.c-qty');
        const v = Math.max(1, (parseInt(input.value, 10) || 1) + 1);
        input.value = v;
        setQty(id, v);
        updateCart();
      }
      if (e.target.classList.contains('c-dec')) {
        const input = row.querySelector('.c-qty');
        const v = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
        input.value = v;
        setQty(id, v);
        updateCart();
      }
      if (e.target.classList.contains('c-del')) {
        removeFromCart(id);
        updateCart();
      }
      if (e.target.classList.contains('c-qty')) {
        // Nada: el change se maneja abajo
      }
    };
    list.onchange = e => {
      const row = e.target.closest('.cart-row');
      if (!row) return;
      if (!e.target.classList.contains('c-qty')) return;
      const id = row.getAttribute('data-id');
      const v = Math.max(1, parseInt(e.target.value, 10) || 1);
      setQty(id, v);
      updateCart();
    };
  }
}

/* ===========================
   Abrir/cerrar cajón
=========================== */
function clearCart(){ CART.clear(); updateCart(); }
function openCart(){ $('#cartDrawer')?.classList.add('open'); }
function closeCart(){ $('#cartDrawer')?.classList.remove('open'); }

/* ===========================
   Checkout por WhatsApp
=========================== */
function checkout() {
  if (CART.size === 0) { openCart(); return; }

  const name  = $('#buyerName')?.value.trim();
  const phone = $('#buyerPhone')?.value.trim();
  if (!name || !phone) {
    alert('Completá nombre y WhatsApp');
    return;
  }

  const { items, subtotal, shipping, discount, total, shippingLabel } = calcTotals();

  const lines = [];
  lines.push('*Pedido Ixoye*');
  lines.push('');

  items.forEach(({ product, qty }) => {
    lines.push(`• ${product.title} x${qty} = ${fmt(product.price * qty)}`);
  });

  lines.push('');
  lines.push(`Subtotal: ${fmt(subtotal)}`);
  lines.push(`Envío: ${shippingLabel}`);
  if (discount > 0) lines.push(`Descuento: -${fmt(discount)}`);
  lines.push(`*Total: ${fmt(total)}*`);
  lines.push('');
  lines.push(`Nombre: ${name}`);
  lines.push(`WhatsApp: ${phone}`);

  // Envío por WhatsApp a la TIENDA
  const url = `https://wa.me/${STORE_WA}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank');
}

/* ===========================
   Listeners y arranque
=========================== */
window.addEventListener('DOMContentLoaded', async () => {
  // 1) Cargar productos antes de renderizar
  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) {
    await loadProducts();
  }

  // 2) Render y totales
  renderProducts();
  updateCart();

  // 3) Listeners globales
  $('#checkout')?.addEventListener('click', checkout);
  $('#clearCart')?.addEventListener('click', clearCart);
  $('#openCart')?.addEventListener('click', openCart);
  $('#closeCart')?.addEventListener('click', closeCart);

  // Recalcular si cambia entrega o método de pago (si lo usás)
  $$('input[name="delivery"]').forEach(r =>
    r.addEventListener('change', updateCart)
  );
  $('#payMethod')?.addEventListener('change', updateCart);
});
