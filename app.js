/* ===========================
   Estado & helpers
=========================== */
let PRODUCTS = [];
const CART = new Map(); // id -> {product, qty}

const el = (sel, ctx=document) => ctx.querySelector(sel);
const fmt = n => `$ ${n.toLocaleString('es-AR')}`;

/* ===========================
   Render de productos
=========================== */
function renderProducts(list){
  const grid = el('#productGrid');
  grid.innerHTML = '';

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="img-wrap">
        <img src="assets/${p.image}" alt="${p.title}" onerror="this.src='assets/portada-ixoye.png'">
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

    // qty controls
    const input = el('.qty-input', card);
    el('.qty-dec', card).onclick = () => input.value = Math.max(1, (+input.value||1) - 1);
    el('.qty-inc', card).onclick = () => input.value = (+input.value||1) + 1;

    // add
    el('.btn-add', card).onclick = () => {
      addToCart(p.id, +input.value || 1);
      openCart();
    };

    grid.appendChild(card);
  });
}

/* ===========================
   Carrito
=========================== */
function addToCart(id, qty){
  const product = PRODUCTS.find(x => x.id === id);
  if(!product) return;

  if(!CART.has(id)) CART.set(id, { product, qty:0 });
  CART.get(id).qty += qty;

  updateCart();
}

function updateCart(){
  // contar
  const count = [...CART.values()].reduce((a, i) => a + i.qty, 0);
  el('#cartCount').textContent = count;

  // items
  const wrap = el('#cartItems');
  wrap.innerHTML = '';

  CART.forEach(({product, qty}) => {
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
    const input = el('.qty-input', row);
    el('.dec', row).onclick = () => { input.value = Math.max(1,(+input.value||1)-1); setQty(product.id,+input.value); };
    el('.inc', row).onclick = () => { input.value = (+input.value||1)+1; setQty(product.id,+input.value); };
    el('.rm', row).onclick  = () => { CART.delete(product.id); updateCart(); };

    input.onchange = () => setQty(product.id, +input.value||1);

    wrap.appendChild(row);
  });

  // totales
  const subtotal = [...CART.values()].reduce((a,i)=>a + i.product.price*i.qty,0);
  const envioGratisDesde = 5000;
  const shipping = subtotal === 0 ? 0 : (subtotal >= envioGratisDesde ? 0 : 800);
  const payMethod = el('#payMethod')?.value || 'Transferencia';
  const discount = (payMethod === 'Efectivo') ? Math.round(subtotal * 0.10) : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  el('#subtotal').textContent     = fmt(subtotal);
  el('#shippingLabel').textContent= shipping ? fmt(shipping) : 'Gratis';
  el('#discount').textContent     = fmt(discount);
  el('#total').textContent        = fmt(total);
}

function setQty(id, qty){
  if(!CART.has(id)) return;
  CART.get(id).qty = Math.max(1, qty);
  updateCart();
}

function clearCart(){
  CART.clear();
  updateCart();
}

function openCart(){ el('#cartDrawer').classList.add('open'); }
function closeCart(){ el('#cartDrawer').classList.remove('open'); }

/* ================================
   Checkout WhatsApp
================================ */
function checkout() {
  if (CART.size === 0) { 
    openCart(); 
    return; 
  }

  const name = el('#buyerName').value.trim();
  const phone = el('#buyerPhone').value.trim();
  if (!name || !phone) { 
    alert('Completá nombre y WhatsApp'); 
    return; 
  }

  // Helper: buscar producto por SKU
  function getProductBySku(sku) {
    if (Array.isArray(PRODUCTS)) {
      return PRODUCTS.find(p => p.sku === sku);
    }
    return PRODUCTS.get ? PRODUCTS.get(sku) : PRODUCTS[sku];
  }

  const lines = [];
  lines.push('*Pedido Tienda Saludable Ixoye*');
  lines.push('');

  CART.forEach((qty, sku) => {
    const p = getProductBySku(sku);
    const title = p?.name || p?.title || sku;   // fallback: muestra el SKU
    const price = Number(p?.price) || 0;

    lines.push(`- ${title} x${qty} = $${fmt(price * qty)}`);
  });

  lines.push('');
  lines.push(`Subtotal: ${el('#subtotal').textContent}`);
  lines.push(`Envío: ${el('#shippingLabel').textContent}`);
  lines.push(`Descuento: ${el('#discount').textContent}`);
  lines.push(`*Total: ${el('#total').textContent}*`);
  lines.push('');
  lines.push(`👤 Nombre: ${name}`);
  lines.push(`📱 WhatsApp: ${phone}`);

  // Abrir WhatsApp de la tienda directamente
  const msg = encodeURIComponent(lines.join('\n'));
  const shopNumber = "5492235551421"; // número de tu tienda
  const url = `https://wa.me/${shopNumber}?text=${msg}`;
  window.open(url, '_blank');
}

/* ===========================
   Init
=========================== */
async function init(){
  try{
    const res = await fetch('products.json', {cache:'no-store'});
    PRODUCTS = await res.json();
  }catch(e){
    console.error('No se pudo leer products.json', e);
    PRODUCTS = [];
  }

  renderProducts(PRODUCTS);
  updateCart();

  // eventos carrito
  el('#openCart').onclick  = openCart;
  el('#closeCart').onclick = closeCart;
  el('#clear').onclick     = clearCart;
  el('#checkout').onclick  = checkout;
  el('#payMethod').onchange= updateCart;
  document.querySelectorAll('input[name="delivery"]').forEach(r => r.onchange = updateCart);
}

document.addEventListener('DOMContentLoaded', init);
