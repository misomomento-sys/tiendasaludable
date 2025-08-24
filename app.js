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
   Render de productos (con eventos)
================================ */
function renderProducts () {
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
        <img src="${p.image}" alt="${p.title}">
      </div>

      <h3 class="title">${p.title}</h3>
      <p class="sku">SKU: ${p.sku}</p>

      <div class="price-row">
        <strong class="price">${fmt(p.price)}</strong>
        <div class="qty">
          <button class="qty-dec" type="button">-</button>
          <input class="qty-input" type="number" min="1" value="1">
          <button class="qty-inc" type="button">+</button>
        </div>
      </div>

      <button class="btn btn-add" type="button" data-id="${p.id}">
        Agregar
      </button>
    `;

    // 🔗 Conectar eventos de esta tarjeta
    const qtyInput = card.querySelector('.qty-input');
    const btnInc   = card.querySelector('.qty-inc');
    const btnDec   = card.querySelector('.qty-dec');
    const btnAdd   = card.querySelector('.btn-add');

    btnInc.addEventListener('click', () => {
      qtyInput.value = Number(qtyInput.value || 1) + 1;
    });

    btnDec.addEventListener('click', () => {
      qtyInput.value = Math.max(1, Number(qtyInput.value || 1) - 1);
    });

    btnAdd.addEventListener('click', () => {
      const qty = Number(qtyInput.value || 1);
      addToCart(p.id, qty);     // <- ya actualiza totales adentro
      // Si querés que NO se abra el cajón, no llames openCart() acá.
      // openCart();  // déjalo comentado si no querés bloquear la vista
    });

    grid.appendChild(card);
  });
}


/* ================================
   Eventos de la grilla (delegación)
================================ */
function attachGridEvents(){
  const grid = $('#productGrid');
  if (!grid) return;

  // Evitá registrarlo más de una vez
  if (grid.dataset.listeners === '1') return;

  grid.addEventListener('click', (e) => {
    // +/- cantidad
    const dec = e.target.closest('.qty-dec');
    const inc = e.target.closest('.qty-inc');
    const add = e.target.closest('.btn-add');

    if (dec || inc){
      const wrap = e.target.closest('.qty');
      if (!wrap) return;
      const input = wrap.querySelector('.qty-input');
      let val = Number(input.value) || 1;
      if (dec) val = Math.max(1, val - 1);
      if (inc) val = val + 1;
      input.value = val;
      return;
    }

    // Agregar al carrito
    if (add){
      const id = add.dataset.id;
      // Busco la qty que está justo antes del botón
      const wrap = add.previousElementSibling?.closest('.price-row')?.querySelector('.qty')
               || add.parentElement.querySelector('.qty');
      const qty = wrap ? (Number(wrap.querySelector('.qty-input').value) || 1) : 1;

      addToCart(id, qty);   // ya NO abre el cajón
      // si querés que abra el cajón, descomentá:
      // openCart();
    }
  });

  grid.dataset.listeners = '1';
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
  // 1) Cargar productos antes de renderizar
  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) {
    await loadProducts();
  }

  // 2) Render y totales
  renderProducts();   // ← esto ya pinta las tarjetas y les conecta los botones
  updateCart();

  // 3) Listeners globales (dejanos estos)
  $('#checkout')?.addEventListener('click', checkout);
  $('#clearCart')?.addEventListener('click', clearCart);
  $('#openCart')?.addEventListener('click', openCart);
  $('#closeCart')?.addEventListener('click', closeCart);

  // Recalcular si cambia entrega o método de pago
  $$('input[name="delivery"]').forEach(r =>
    r.addEventListener('change', updateCart)
  );
  $('#payMethod')?.addEventListener('change', updateCart);
});
/* =========================================
   Listeners delegados para la grilla
========================================= */
function attachGridEvents () {
  const grid = $('#productGrid');
  if (!grid) return;

  // Evitamos duplicar listeners si alguien llama de nuevo
  if (grid._eventsBound) return;
  grid._eventsBound = true;

  grid.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;

    const qtyInput = card.querySelector('.qty-input');

    // + / -
    if (e.target.classList.contains('qty-inc')) {
      qtyInput.value = Number(qtyInput.value || 1) + 1;
    }
    if (e.target.classList.contains('qty-dec')) {
      qtyInput.value = Math.max(1, Number(qtyInput.value || 1) - 1);
    }

    // Agregar
    if (e.target.classList.contains('btn-add')) {
      const id = e.target.dataset.id;
      const qty = Number(qtyInput.value || 1);
      addToCart(id, qty);
      // TIP: si NO querés abrir el carrito automáticamente, no hagas nada acá
      // openCart();  // <-- dejalo comentado para que no bloquee la vista
    }
  });
}


