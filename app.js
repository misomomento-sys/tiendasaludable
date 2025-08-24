/* ================================
   Helpers + estado global
================================ */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const fmt = n => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
}).format(n);

let PRODUCTS = [];
const CART = new Map(); // id -> qty

// Envíos
const FREE_SHIPPING_MIN = 5000;
const SHIPPING_FEE      = 800;

// WhatsApp de la tienda (sin espacios ni signos, con prefijo 549)
const STORE_WA = '5492235551421';


/* ================================
   Carga de productos
================================ */

async function loadProducts(){
  try {
    const res = await fetch('./products.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('El JSON raíz no es un array');
    PRODUCTS = data;
  } catch (err) {
    console.error('❌ No se pudo cargar products.json:', err);
    PRODUCTS = [];
  }
}


/* ================================
   Carrito - helpers
================================ */
function updateCart() {
  const itemsContainer = $('#cartItems');
  const summarySubtotal = $('#subtotal');
  const summaryShipping = $('#shippingLabel');
  const summaryDiscount = $('#discount');
  const summaryTotal = $('#total');
  const cartCount = $('#cartCount');

  if (!itemsContainer) return;

  itemsContainer.innerHTML = '';
  let subtotal = 0;

  CART.forEach((qty, id) => {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return;

    subtotal += product.price * qty;

    const item = document.createElement('div');
    item.className = 'cart-item';
    item.innerHTML = `
      <div class="ci-title">${product.title}</div>
      <div class="ci-controls">
        <button onclick="setQty('${id}', ${qty - 1})">-</button>
        <input type="number" value="${qty}" min="1" onchange="setQty('${id}', this.value)">
        <button onclick="setQty('${id}', ${qty + 1})">+</button>
        <span>${fmt(product.price * qty)}</span>
        <button onclick="setQty('${id}', 0)">Quitar</button>
      </div>
    `;
    itemsContainer.appendChild(item);
  });

  // Calcular envío y descuentos
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_MIN ? SHIPPING_FEE : 0;
  const discount = 0; // (si querés agregar después lógica de descuentos)

  const total = subtotal + shipping - discount;

  // Actualizar resumen
  summarySubtotal.textContent = fmt(subtotal);
  summaryShipping.textContent = shipping > 0 ? fmt(shipping) : '—';
  summaryDiscount.textContent = fmt(discount);
  summaryTotal.textContent = fmt(total);

  // Actualizar contador de carrito
  cartCount.textContent = CART.size;
}


function setQty(id, qty){
  qty = Number(qty);
  if (!qty || qty < 1) {
    CART.delete(id);
  } else {
    CART.set(id, qty);
  }
  updateCart();
}

function removeFromCart(id){
  CART.delete(id);
  updateCart();
}

function clearCart(){
  CART.clear();
  updateCart();
}

function openCart(){ $('#cartDrawer')?.classList.add('open'); }
function closeCart(){ $('#cartDrawer')?.classList.remove('open'); }


/* ================================
   Render de productos
================================ */

function resolveImagePath(filename){
  if (!filename) return '';
  // si ya viene con http/https o assets/ lo dejo
  if (/^https?:\/\//i.test(filename) || filename.startsWith('assets/')) return filename;
  // si viene sólo el nombre, prefijo assets/
  return `assets/${filename}`;
}

function renderProducts(){
  const grid = $('#productGrid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0){
    grid.innerHTML = `<p style="padding:16px">No hay productos para mostrar.</p>`;
    return;
  }

  PRODUCTS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    // guardo el id para los botones
    card.dataset.id = p.id;

    const imgSrc = resolveImagePath(p.image);

    card.innerHTML = `
      <div class="img-wrap">
        <img src="${imgSrc}" alt="${p.title}">
      </div>
      <h3 class="title">${p.title}</h3>
      <p class="sku">SKU: ${p.sku}</p>

      <div class="price-row">
        <strong class="price">${fmt(p.price)}</strong>
        <div class="qty">
          <button class="qty-dec" aria-label="Menos">−</button>
          <input class="qty-input" type="number" min="1" value="1">
          <button class="qty-inc" aria-label="Más">+</button>
        </div>
      </div>

      <button class="btn btn-add">Agregar</button>
    `;

    grid.appendChild(card);
  });
}


/* ================================
   Event delegation en la grilla
================================ */

function attachGridEvents(){
  const grid = $('#productGrid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;

    // + / -
    if (e.target.classList.contains('qty-inc')) {
      const input = card.querySelector('.qty-input');
      input.value = Number(input.value || 1) + 1;
    }
    if (e.target.classList.contains('qty-dec')) {
      const input = card.querySelector('.qty-input');
      const next = Math.max(1, Number(input.value || 1) - 1);
      input.value = next;
    }

    // Agregar
    if (e.target.classList.contains('btn-add')) {
      const input = card.querySelector('.qty-input');
      const qty = Number(input.value || 1);
      addToCart(id, qty);
      // no abrimos el cajón para no “bloquear” la compra continua
      // openCart(); // <- si alguna vez querés que se abra, descomentá
    }
  });
}


/* ================================
   Totales carrito
================================ */

function updateCart(){
  // items
  const itemsWrap = $('#cartItems');
  if (itemsWrap) {
    itemsWrap.innerHTML = '';
    let html = '';

    CART.forEach((qty, id) => {
      const p = PRODUCTS.find(x => x.id === id);
      if (!p) return;
      html += `
        <div class="cart-item" data-id="${id}">
          <div class="title">${p.title}</div>
          <div class="qty">
            <button class="qty-dec">−</button>
            <input class="qty-input" type="number" min="1" value="${qty}">
            <button class="qty-inc">+</button>
          </div>
          <div class="line">${fmt(p.price * qty)}</div>
          <button class="btn btn-outline btn-remove">Quitar</button>
        </div>
      `;
    });

    itemsWrap.innerHTML = html || '<p>Todavía no agregaste productos.</p>';

    // listeners dentro del cajón (delegation simple)
    itemsWrap.addEventListener('click', (e) => {
      const row = e.target.closest('.cart-item');
      if (!row) return;
      const id = row.dataset.id;

      if (e.target.classList.contains('qty-inc')) {
        const input = row.querySelector('.qty-input');
        input.value = Number(input.value || 1) + 1;
        setQty(id, input.value);
      }
      if (e.target.classList.contains('qty-dec')) {
        const input = row.querySelector('.qty-input');
        const next = Math.max(1, Number(input.value || 1) - 1);
        input.value = next;
        setQty(id, input.value);
      }
      if (e.target.classList.contains('btn-remove')) {
        removeFromCart(id);
      }
    });

    // cambios manuales en qty
    itemsWrap.addEventListener('change', (e) => {
      const row = e.target.closest('.cart-item');
      if (!row) return;
      if (e.target.classList.contains('qty-input')) {
        const id = row.dataset.id;
        setQty(id, e.target.value);
      }
    });
  }

  // totales
  let subtotal = 0;
  CART.forEach((qty, id) => {
    const p = PRODUCTS.find(x => x.id === id);
    if (p) subtotal += p.price * qty;
  });

  const delivery = document.querySelector('input[name="delivery"]:checked')?.value || 'envio';
  const shipping = (delivery === 'envio' && subtotal > 0 && subtotal < FREE_SHIPPING_MIN) ? SHIPPING_FEE : 0;
  const discount = 0; // si luego quieres aplicar algún descuento, acá

  const total = subtotal + shipping - discount;

  $('#subtotal')?.(el => el.textContent = fmt(subtotal)) ?? null;
  $('#shippingLabel')?.(el => el.textContent = shipping ? fmt(shipping) : '—') ?? null;
  $('#discount')?.(el => el.textContent = fmt(discount)) ?? null;
  $('#total')?.(el => el.textContent = fmt(total)) ?? null;

  // badge del header
  const totalQty = Array.from(CART.values()).reduce((a,b) => a + b, 0);
  const badge = $('#cartCount');
  if (badge) badge.textContent = totalQty;
}


/* ================================
   Checkout por WhatsApp
================================ */

function checkout(){
  if (CART.size === 0){ openCart(); return; }

  const name  = $('#buyerName')?.value.trim() || '';
  const phone = $('#buyerPhone')?.value.trim() || '';

  if (!name || !phone){
    alert('Completá nombre y WhatsApp');
    return;
  }

  const lines = [];
  lines.push('*Pedido Ixoye*', '');

  CART.forEach((qty, id) => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    lines.push(`• ${p.title} x${qty} = ${fmt(p.price * qty)}`);
  });

  lines.push('');
  lines.push(`Subtotal: ${$('#subtotal')?.textContent || ''}`);
  lines.push(`Envío: ${$('#shippingLabel')?.textContent || ''}`);
  lines.push(`Total: ${$('#total')?.textContent || ''}`);
  lines.push('');
  lines.push(`Nombre: ${name}`);
  lines.push(`WhatsApp: ${phone}`);

  const msg = encodeURIComponent(lines.join('\n'));
  const url = `https://wa.me/${STORE_WA}?text=${msg}`;

  window.open(url, '_blank');
}


/* ================================
   Listeners y arranque
================================ */

window.addEventListener('DOMContentLoaded', async () => {
  // 1) cargar productos primero
  await loadProducts();

  // 2) render, eventos de grilla y totales
  renderProducts();
  attachGridEvents();
  updateCart();

  // 3) listeners globales del carrito
  $('#checkout')?.addEventListener('click', checkout);
  $('#clearCart')?.addEventListener('click', clearCart);
  $('#openCart')?.addEventListener('click', openCart);
  $('#closeCart')?.addEventListener('click', closeCart);

  // recalcular totales si cambia entrega o pago
  $$('input[name="delivery"]').forEach(r => r.addEventListener('change', updateCart));
  $('#payMethod')?.addEventListener('change', updateCart);
});
