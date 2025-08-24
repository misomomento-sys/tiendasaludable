// === Estado global ===
let PRODUCTS = []; // <- muy importante que sea "let", no "const".
 /* ===========================
   Helpers
=========================== */
const $  = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

/* Config tienda */
const STORE_WAPP = '5492235551421';      // WhatsApp destino
const SHIP_THRESHOLD = 5000;             // Envío gratis desde
const SHIP_COST = 800;                   // Envío estándar

/* Estado */
let PRODUCTS = window.PRODUCTS || [];
async function loadProducts(){
  try {
    const res = await fetch('products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar products.json');
    PRODUCTS = await res.json();
  } catch (err) {
    console.error(err);
    PRODUCTS = [];
  }

/* ===========================
   Render de productos
=========================== */
function renderProducts(){
  const grid = $('#productGrid');
  if(!grid) return;

  grid.innerHTML = '';

  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0){
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
      <p class="sku">SKU: <strong>${p.sku}</strong></p>

      <div class="price-row">
        <strong class="price">${fmt(p.price)}</strong>
        <div class="qty">
          <button class="qty-dec">-</button>
          <input id="qty-${p.sku}" class="qty-input" type="number" min="1" value="1">
          <button class="qty-inc">+</button>
        </div>
      </div>

      <button class="btn btn-primary btn-add">Agregar</button>
    `;

    // Eventos qty
    $('.qty-dec', card).onclick = () => {
      const input = $(`#qty-${p.sku}`, card);
      input.value = Math.max(1, (+input.value || 1) - 1);
    };
    $('.qty-inc', card).onclick = () => {
      const input = $(`#qty-${p.sku}`, card);
      input.value = (+input.value || 1) + 1;
    };

    // Agregar al carrito (NO abre el carrito)
    $('.btn-add', card).onclick = () => {
      const qty = +$(`#qty-${p.sku}`, card).value || 1;
      addToCart(p.sku, qty);
      flashAdded(p.title); // toast + latido
    };

    grid.appendChild(card);
  });
}

/* ===========================
   Carrito
=========================== */
function updateCart(){
  // contador
  $('#cartCount').textContent = [...CART.values()].reduce((a, i) => a + i.qty, 0);

  // render items
  const list = $('#cartItems');
  if (!list) return;
  list.innerHTML = '';

  let subtotal = 0;

  CART.forEach(({product, qty}) => {
    subtotal += product.price * qty;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="ci-title">${product.title}</div>
      <div class="ci-sku">SKU: ${product.sku}</div>

      <div class="ci-controls">
        <button class="qty-dec">-</button>
        <input class="qty-input" type="number" min="1" value="${qty}">
        <button class="qty-inc">+</button>
        <button class="btn btn-outline btn-remove">Quitar</button>
      </div>

      <div class="ci-price">${fmt(product.price * qty)}</div>
    `;

    const input = $('.qty-input', row);

    $('.qty-dec', row).onclick = () => {
      const v = Math.max(1, (+input.value || 1) - 1);
      input.value = v;
      setQty(product.sku, v);
    };
    $('.qty-inc', row).onclick = () => {
      const v = (+input.value || 1) + 1;
      input.value = v;
      setQty(product.sku, v);
    };
    $('.btn-remove', row).onclick = () => removeItem(product.sku);

    list.appendChild(row);
  });

  // cálculo de envío / descuento / total
  const delivery = (document.querySelector('input[name="delivery"]:checked')?.value || 'envio');
  let shipping = 0;
  let shippingLabel = '—';

  if (delivery === 'envio'){
    if (subtotal >= SHIP_THRESHOLD){
      shipping = 0;
      shippingLabel = 'Gratis';
    } else {
      shipping = SHIP_COST;
      shippingLabel = fmt(SHIP_COST);
    }
  } else {
    shipping = 0;
    shippingLabel = 'Retira';
  }

  const payMethod = $('#payMethod')?.value || 'transferencia';
  let discount = 0;
  if (payMethod === 'efectivo') {
    discount = Math.round(subtotal * 0.10);
  }

  const total = Math.max(0, subtotal + shipping - discount);

  // pintar resumen
  $('#subtotal').textContent = fmt(subtotal);
  $('#shippingLabel').textContent = shippingLabel;
  $('#discount').textContent = fmt(discount);
  $('#total').textContent = fmt(total);
}

function addToCart(sku, qty=1){
  const product = PRODUCTS.find(p => p.sku === sku);
  if (!product) return;

  const current = CART.get(sku);
  CART.set(sku, { product, qty: (current?.qty || 0) + qty });
  updateCart();
}

function setQty(sku, qty){
  const item = CART.get(sku);
  if (!item) return;
  item.qty = Math.max(1, +qty || 1);
  updateCart();
}

function removeItem(sku){
  CART.delete(sku);
  updateCart();
}

function clearCart(){
  CART.clear();
  updateCart();
}

function openCart(){ $('#cartDrawer')?.classList.add('open'); }
function closeCart(){ $('#cartDrawer')?.classList.remove('open'); }

/* ===========================
   Checkout WhatsApp
=========================== */
function checkout(){
  if (CART.size === 0){ openCart(); return; }

  const name  = $('#buyerName')?.value.trim();
  const phone = $('#buyerPhone')?.value.trim();
  if (!name || !phone){
    alert('Completá nombre y WhatsApp');
    return;
  }

  const delivery = document.querySelector('input[name="delivery"]:checked')?.value || 'envio';
  const pay = $('#payMethod')?.value || 'transferencia';

  const lines = [];
  lines.push('*Pedido Ixoye*');
  lines.push('');

  // Detalle
  CART.forEach(({product, qty}) => {
    lines.push(`• ${product.title} x${qty} = ${fmt(product.price*qty)}`);
  });

  lines.push('');

  // Resumen (leemos del DOM del resumen)
  lines.push(`Subtotal: ${$('#subtotal').textContent}`);
  lines.push(`Envío: ${$('#shippingLabel').textContent}`);
  lines.push(`Descuento: ${$('#discount').textContent}`);
  lines.push(`*Total: ${$('#total').textContent}*`);
  lines.push('');

  // Datos
  lines.push(`*Nombre:* ${name}`);
  lines.push(`*WhatsApp:* ${phone}`);
  lines.push(`*Entrega:* ${delivery === 'retira' ? 'Retira' : 'Envío'}`);
  lines.push(`*Pago:* ${pay}`);

  const msg = encodeURIComponent(lines.join('\n'));
  const url = `https://wa.me/${STORE_WAPP}?text=${msg}`;
  window.open(url, '_blank');
}

/* ===========================
   Toast + latido contador
=========================== */
function flashAdded(title){
  showToast(`✅ Agregado: ${title}`);

  const badge = $('#cartCount');
  if (badge){
    badge.classList.remove('pulse');
    void badge.offsetWidth; // reflow
    badge.classList.add('pulse');
  }
}

let _toastTimer = null;
function showToast(msg){
  const el = $('#toast');
  if (!el){ alert(msg); return; }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// Listeners y arranque
window.addEventListener('DOMContentLoaded', async () => {
  // Cargar productos antes de renderizar
  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) {
    await loadProducts();
  }

  // Render y carrito
  renderProducts();
  updateCart();

  // Listeners globales
  $('#checkout')?.addEventListener('click', checkout);
  $('#clearCart')?.addEventListener('click', clearCart);
  $('#openCart')?.addEventListener('click', openCart);
  $('#closeCart')?.addEventListener('click', closeCart);

  $$('input[name="delivery"]').forEach(r =>
    r.addEventListener('change', updateCart)
  );
  $('#payMethod')?.addEventListener('change', updateCart);
});


  // si cambian entrega o método de pago, recalculamos
  $$('input[name="delivery"]').forEach(r => r.addEventListener('change', updateCart));
  $('#payMethod')?.addEventListener('change', updateCart);
});
