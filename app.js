/* ===========================
   Helpers y estado
=========================== */
let PRODUCTS = [];
const CART = new Map(); // clave: sku o id -> { product, qty }

const $ = (sel, ctx=document) => ctx.querySelector(sel);
const fmt = n => `$ ${Number(n||0).toLocaleString('es-AR')}`;

/* ===========================
   Carga de productos
=========================== */
async function loadProducts() {
  const url = '/products.json?v=' + Date.now(); // anti-cache
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('No pude leer products.json');
  const items = await res.json();

  // Normalización mínima por si hay name/title, image con/ sin assets/
  PRODUCTS = (items || []).map(p => {
    const title = p.name ?? p.title ?? 'Producto';
    let image  = p.image ?? '';
    if (image && !image.startsWith('assets/')) image = 'assets/' + image;
    return {
      id:  p.id ?? p.sku ?? title,
      sku: p.sku ?? p.id ?? title,
      title,
      price: Number(p.price) || 0,
      image
    };
  });
}

/* ===========================
   Render de productos
=========================== */
function renderProducts() {
  const grid = $('#productGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) {
    grid.innerHTML = `<p style="padding:16px">No hay productos para mostrar.</p>`;
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
          <button class="btn qty-dec">−</button>
          <input class="qty-input" type="number" min="1" value="1">
          <button class="btn qty-inc">+</button>
        </div>
      </div>

      <button class="btn btn-primary btn-add">Agregar</button>
    `;

    const qtyInput = $('.qty-input', card);
    $('.qty-dec', card).onclick = () => qtyInput.value = Math.max(1, (+qtyInput.value||1)-1);
    $('.qty-inc', card).onclick = () => qtyInput.value = (+qtyInput.value||1)+1;

    $('.btn-add', card).onclick = () => {
      addToCart(p.sku, +qtyInput.value||1);
      openCart();
    };

    grid.appendChild(card);
  });
}

/* ===========================
   Carrito
=========================== */
function addToCart(key, qty) {
  const product = PRODUCTS.find(x => x.sku === key || x.id === key);
  if (!product) return;

  if (!CART.has(key)) CART.set(key, { product, qty: 0 });
  CART.get(key).qty += qty;

  updateCart();
}

function setQty(key, qty) {
  if (!CART.has(key)) return;
  CART.get(key).qty = Math.max(1, Number(qty)||1);
  updateCart();
}

function updateCart() {
  const count = [...CART.values()].reduce((a, i) => a + i.qty, 0);
  $('#cartCount').textContent = count;

  const wrap = $('#cartItems');
  wrap.innerHTML = '';

  CART.forEach(({product, qty}, key) => {
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <div class="price-row">
        <div>
          <div class="title">${product.title}</div>
          <div class="sku">SKU: ${product.sku}</div>
        </div>
        <strong>${fmt(product.price * qty)}</strong>
      </div>
      <div class="qty">
        <button class="btn dec">−</button>
        <input class="qty-input" type="number" min="1" value="${qty}">
        <button class="btn inc">+</button>
        <button class="btn btn-outline rm" style="margin-left:auto">Quitar</button>
      </div>
    `;

    const input = $('.qty-input', row);
    $('.dec', row).onclick = () => { input.value = Math.max(1,(+input.value||1)-1); setQty(key, input.value); };
    $('.inc', row).onclick = () => { input.value = (+input.value||1)+1; setQty(key, input.value); };
    $('.rm',  row).onclick = () => { CART.delete(key); updateCart(); };
    input.onchange          = () => setQty(key, input.value);

    wrap.appendChild(row);
  });

  // Totales simples
  const subtotal = [...CART.values()].reduce((a,i)=> a + i.product.price*i.qty, 0);
  const envioGratisDesde = 5000;
  const shipping = subtotal === 0 ? 0 : (subtotal >= envioGratisDesde ? 0 : 800);
  const payMethod = $('#payMethod')?.value || 'Transferencia';
  const discount = (payMethod === 'Efectivo') ? Math.round(subtotal * 0.10) : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  $('#subtotal').textContent      = fmt(subtotal);
  $('#shippingLabel').textContent = shipping ? fmt(shipping) : 'Gratis';
  $('#discount').textContent      = fmt(discount);
  $('#total').textContent         = fmt(total);
}

/* ===========================
   Abrir/cerrar
=========================== */
function clearCart(){ 
  CART.clear(); 
  updateCart(); 
}

function openCart(){ 
  $('#cartDrawer').classList.add('open'); 
  document.body.classList.add('no-scroll');   // 👈 evita que el fondo scrollee
}

function closeCart(){ 
  $('#cartDrawer').classList.remove('open'); 
  document.body.classList.remove('no-scroll'); // 👈 vuelve a habilitar scroll
}

/* ===========================
   Checkout a WhatsApp fijo
=========================== */
function checkout() {
  if (CART.size === 0) { openCart(); return; }

  const name  = $('#buyerName').value.trim();
  const phone = $('#buyerPhone').value.trim();
  if (!name || !phone) { alert('Completá nombre y WhatsApp'); return; }

  const lines = [];
  lines.push('*Pedido Tienda Saludable Ixoye*');
  lines.push('');

  CART.forEach(({product, qty}) => {
    lines.push(`✅ ${product.title} x${qty} = ${fmt(product.price * qty)}`);
  });

  lines.push('');
  lines.push(`Subtotal: ${$('#subtotal').textContent}`);
  lines.push(`Envío: ${$('#shippingLabel').textContent}`);
  lines.push(`Descuento: ${$('#discount').textContent}`);
  lines.push(`*Total: ${$('#total').textContent}*`);
  lines.push('');
  lines.push(`👤 Nombre: ${name}`);
  lines.push(`📱 WhatsApp: ${phone}`);

  const shopNumber = '5492235551421';
  const url = `https://wa.me/${shopNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank');
}

/* ===========================
   Init
=========================== */
async function init(){
  try {
    await loadProducts();
  } catch (e) {
    console.error(e);
    PRODUCTS = [];
  }

  renderProducts();
  updateCart();

  $('#openCart').onclick  = openCart;
  $('#closeCart').onclick = closeCart;
  $('#clear').onclick     = clearCart;
  $('#checkout').onclick  = checkout;
  $('#payMethod')?.addEventListener('change', updateCart);
  document.querySelectorAll('input[name="delivery"]').forEach(r => r.addEventListener('change', updateCart));
}

document.addEventListener('DOMContentLoaded', init);

 
