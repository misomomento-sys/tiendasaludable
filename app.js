/* ================================
   Helpers y estado global
================================ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const fmt = n => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
}).format(n);

let PRODUCTS = [];            // catálogo cargado desde products.json
const CART = new Map();       // id -> qty

// Envío
const FREE_SHIPPING_MIN = 5000;
const SHIPPING_FEE      = 800;

// WhatsApp de la tienda (sin espacios ni signos)
const STORE_WA = '5492235551421';

/* ================================
   Carga de productos
================================ */
async function loadProducts(){
  try{
    const res = await fetch('products.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('No se pudo cargar products.json');
    PRODUCTS = await res.json();
  }catch(err){
    console.error(err);
    PRODUCTS = [];
  }
}

/* ================================
   Render de productos (grilla)
================================ */
function renderProducts(){
  const grid = $('#productGrid');
  if (!grid) return;

  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0){
    grid.innerHTML = '<p style="padding:16px">No hay productos para mostrar.</p>';
    return;
  }

  const html = PRODUCTS.map(p => `
    <div class="card" data-id="${p.id}">
      <div class="img-wrap">
        <img src="${p.image}" alt="${p.title}">
      </div>

      <h3 class="title">${p.title}</h3>
      <p class="sku">SKU: ${p.sku}</p>

      <div class="price-row">
        <strong>${fmt(p.price)}</strong>
        <div class="qty">
          <button type="button" class="qty-dec">−</button>
          <input class="qty-input" type="number" min="1" value="1">
          <button type="button" class="qty-inc">+</button>
        </div>
      </div>

      <button type="button" class="btn btn-primary btn-add" data-id="${p.id}">Agregar</button>
    </div>
  `).join('');

  grid.innerHTML = html;
}

/* =========================================
   Delegación de eventos en la grilla (UNA sola vez)
========================================== */
function attachGridEvents(){
  const grid = $('#productGrid');
  if (!grid) return;

  // evitamos duplicar listeners si alguien llama de nuevo
  if (grid.dataset.listeners === '1') return;
  grid.dataset.listeners = '1';

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const card  = btn.closest('.card');
    if (!card) return;

    const input = card.querySelector('.qty-input');
    let qty     = Number(input?.value || 1);

    // +/-
    if (btn.classList.contains('qty-inc')) {
      input.value = ++qty;
      return;
    }
    if (btn.classList.contains('qty-dec')) {
      input.value = Math.max(1, qty - 1);
      return;
    }

    // Agregar
    if (btn.classList.contains('btn-add')) {
      const id = btn.dataset.id || card.dataset.id;
      const toAdd = Number(input?.value || 1);
      addToCart(id, toAdd);     // NO abre el cajón; sólo actualiza totales
      return;
    }
  });

  // saneo de input manual
  grid.addEventListener('change', (ev) => {
    if (!ev.target.classList.contains('qty-input')) return;
    const v = Math.max(1, Number(ev.target.value || 1));
    ev.target.value = v;
  });
}

/* ================================
   Carrito - helpers
================================ */
function addToCart(id, qty = 1){
  const current = CART.get(id) || 0;
  CART.set(id, Math.max(1, current + qty));
  updateCart();
}

function setQty(id, qty){
  qty = Number(qty);
  if (!qty || qty < 1){
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

function openCart(){
  $('#cartDrawer')?.classList.add('open');
}

function closeCart(){
  $('#cartDrawer')?.classList.remove('open');
}

/* ================================
   Totales + render del cajón
================================ */
function updateCart(){
  // items del cajón
  const itemsWrap = $('#cartItems');
  if (itemsWrap){
    let html = '';

    CART.forEach((qty, id) => {
      const p = PRODUCTS.find(x => x.id === id);
      if (!p) return;

      html += `
        <div class="cart-item" data-id="${id}">
          <div class="title">${p.title}</div>

          <div class="qty">
            <button type="button" class="qty-dec">−</button>
            <input class="qty-input" type="number" min="1" value="${qty}">
            <button type="button" class="qty-inc">+</button>
          </div>

          <div class="line">${fmt(p.price * qty)}</div>
          <button type="button" class="btn btn-outline btn-remove">Quitar</button>
        </div>
      `;
    });

    itemsWrap.innerHTML = html || '<p>Todavía no agregaste productos.</p>';

    // listeners dentro del cajón (delegación)
    itemsWrap.onclick = (e) => {
      const row = e.target.closest('.cart-item');
      if (!row) return;
      const id = row.dataset.id;

      if (e.target.classList.contains('qty-inc')){
        const input = row.querySelector('.qty-input');
        const next  = Number(input.value || 1) + 1;
        input.value = next;
        setQty(id, next);
        return;
      }
      if (e.target.classList.contains('qty-dec')){
        const input = row.querySelector('.qty-input');
        const next  = Math.max(1, Number(input.value || 1) - 1);
        input.value = next;
        setQty(id, next);
        return;
      }
      if (e.target.classList.contains('btn-remove')){
        removeFromCart(id);
        return;
      }
    };

    itemsWrap.onchange = (e) => {
      const row = e.target.closest('.cart-item');
      if (!row) return;
      if (!e.target.classList.contains('qty-input')) return;
      const id = row.dataset.id;
      setQty(id, e.target.value);
    };
  }

  // totales
  let subtotal = 0;
  CART.forEach((qty, id) => {
    const p = PRODUCTS.find(x => x.id === id);
    if (p) subtotal += p.price * qty;
  });

  const delivery = document.querySelector('input[name="delivery"]:checked')?.value || 'envio';
  const shipping = (delivery === 'retiro') ? 0 : (subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE);
  const discount = 0; // si después querés aplicar descuento, hacerlo acá
  const total    = subtotal + shipping - discount;

  // pinta totales
  $('#subtotal')   ? $('#subtotal').textContent   = fmt(subtotal) : null;
  $('#shippingLabel') ? $('#shippingLabel').textContent = shipping ? fmt(shipping) : '—' : null;
  $('#discount')   ? $('#discount').textContent   = fmt(discount) : null;
  $('#total')      ? $('#total').textContent      = fmt(total)    : null;

  // badge del header
  const totalQty = Array.from(CART.values()).reduce((a,b)=>a+b,0);
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
  // 1) cargar catálogo antes de renderizar
  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0){
    await loadProducts();
  }

  // 2) render y totales
  renderProducts();
  attachGridEvents();   // ← conecta los botones de la grilla una sola vez
  updateCart();

  // 3) listeners globales
  $('#checkout')   ?.addEventListener('click', checkout);
  $('#clearCart')  ?.addEventListener('click', clearCart);
  $('#openCart')   ?.addEventListener('click', openCart);
  $('#closeCart')  ?.addEventListener('click', closeCart);

  $$('input[name="delivery"]').forEach(r =>
    r.addEventListener('change', updateCart)
  );
  $('#payMethod')  ?.addEventListener('change', updateCart);
});
