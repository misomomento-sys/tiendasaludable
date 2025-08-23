// Configuración de la tienda
const CONFIG = {
  storeName: "Ixoye — Tienda Saludable",
  storeWhatsapp: "5492235551421",
  currency: "ARS",
  cashDiscount: { enabled: true, percent: 10 },
  freeShipping: { enabled: true, threshold: 5000, label: "Envío gratis en zona" },
  defaultShippingCost: 1200
};

// Productos de referencia (editá o reemplazá por products.json)
const PRODUCTS = [
  {
    id: "avena-500",
    name: "Avena Tradicional 500 g",
    price: 2200,
    sku: "AV-500",
    image: "https://images.unsplash.com/photo-1505575972945-338c3fddeaa0?q=80&w=800&auto=format&fit=crop",
    paymentLink: ""
  },
  {
    id: "waf-prot",
    name: "Waffles Proteicos (pack)",
    price: 4200,
    sku: "WF-PRO",
    image: "https://images.unsplash.com/photo-1514514771769-000022c4a0a3?q=80&w=800&auto=format&fit=crop",
    paymentLink: ""
  },
  {
    id: "te-jamaica",
    name: "Té de Jamaica 100 g",
    price: 3500,
    sku: "TE-JA-100",
    image: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?q=80&w=800&auto=format&fit=crop",
    paymentLink: ""
  }
];

// Helpers
const money = (n) => new Intl.NumberFormat("es-AR",{style:"currency",currency:CONFIG.currency}).format(n||0);
const qs = (s,el=document)=>el.querySelector(s);
const qsa=(s,el=document)=>[...el.querySelectorAll(s)];
const load = (k,fallback)=>{ try{const v=localStorage.getItem(k); return v?JSON.parse(v):fallback}catch{ return fallback }};
const save = (k,v)=>localStorage.setItem(k,JSON.stringify(v));

// Estado carrito
let CART = load("ixoye_cart", []);
const saveCart = ()=>save("ixoye_cart", CART);

// Render productos
const grid = qs("#productGrid");
const tpl = qs("#productCardTpl");

function renderProducts(list=PRODUCTS){
  grid.innerHTML = "";
  list.forEach(p=>{
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".card");
    card.querySelector("img").src = p.image;
    card.querySelector("img").alt = p.name;
    card.querySelector(".title").textContent = p.name;
    card.querySelector(".sku").textContent = `SKU: ${p.sku}`;
    card.querySelector(".price").textContent = money(p.price);
    const input = card.querySelector(".qty-input");
    card.querySelector(".qty-inc").onclick = ()=>input.value = (+input.value||1)+1;
    card.querySelector(".qty-dec").onclick = ()=>input.value = Math.max(1,(+input.value||1)-1);
    card.querySelector(".btn-add").onclick = ()=> addToCart(p, +input.value||1);
    grid.appendChild(node);
  });
}

function addToCart(p, qty=1){
  const idx = CART.findIndex(i=>i.id===p.id);
  if(idx>=0){ CART[idx].qty += qty; }
  else{ CART.push({ id:p.id, name:p.name, price:p.price, sku:p.sku, image:p.image, paymentLink:p.paymentLink||"", qty }); }
  saveCart();
  updateBadge();
  openCart();
  renderCart();
}

function setQty(id, qty){
  CART = CART.map(i => i.id===id ? {...i, qty: Math.max(1, qty)} : i);
  saveCart(); renderCart(); updateBadge();
}
function removeItem(id){
  CART = CART.filter(i=>i.id!==id);
  saveCart(); renderCart(); updateBadge();
}
function clearCart(){
  if(confirm("¿Vaciar el carrito?")){ CART=[]; saveCart(); renderCart(); updateBadge(); }
}

function subtotal(){ return CART.reduce((a,i)=>a+i.price*i.qty,0); }

// Drawer
const drawer = qs("#cartDrawer");
function openCart(){ drawer.classList.add("open"); }
function closeCart(){ drawer.classList.remove("open"); }

// UI refs
const cartItems = qs("#cartItems");
const subtotalEl = qs("#subtotal");
const shippingLabel = qs("#shippingLabel");
const discountEl = qs("#discount");
const totalEl = qs("#total");
const cartCount = qs("#cartCount");
const payLinksBox = qs("#paymentLinks");

function updateBadge(){ cartCount.textContent = CART.reduce((a,i)=>a+i.qty,0); }

function renderCart(){
  cartItems.innerHTML = "";
  if(!CART.length){
    cartItems.innerHTML = '<p class="small">Todavía no agregaste productos.</p>';
  }else{
    CART.forEach(it=>{
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <img src="${it.image}" alt="${it.name}">
        <div class="flex-1">
          <div class="name">${it.name}</div>
          <div class="price">${money(it.price)} c/u</div>
          <div class="qty" style="margin-top:6px">
            <button class="qty-dec">−</button>
            <input class="qty-input" type="number" min="1" value="${it.qty}">
            <button class="qty-inc">+</button>
            <button class="btn-link" style="margin-left:8px;color:#e11d48" data-remove>Eliminar</button>
          </div>
        </div>
        <div><strong>${money(it.price*it.qty)}</strong></div>
      `;
      const input = row.querySelector(".qty-input");
      row.querySelector(".qty-inc").onclick = ()=>{ input.value=(+input.value||1)+1; setQty(it.id,+input.value) };
      row.querySelector(".qty-dec").onclick = ()=>{ input.value=Math.max(1,(+input.value||1)-1); setQty(it.id,+input.value) };
      input.onchange = ()=> setQty(it.id, +input.value||1);
      row.querySelector("[data-remove]").onclick = ()=> removeItem(it.id);
      cartItems.appendChild(row);
    });
  }

  // Totales
  const sub = subtotal();
  let wantsShipping = document.querySelector('input[name="delivery"][value="envio"]').checked;
  const ship = wantsShipping ? ((CONFIG.freeShipping.enabled && sub>=CONFIG.freeShipping.threshold) ? 0 : CONFIG.defaultShippingCost) : 0;
  const payMethod = qs("#payMethod").value;
  const discount = (CONFIG.cashDiscount.enabled && payMethod==="Efectivo") ? (sub*CONFIG.cashDiscount.percent/100) : 0;
  const total = Math.max(0, sub - discount) + ship;

  subtotalEl.textContent = money(sub);
  shippingLabel.textContent = wantsShipping ? (ship===0 ? "Gratis" : money(ship)) : "Retiro";
  discountEl.textContent = discount ? `- ${money(discount)}` : money(0);
  totalEl.textContent = money(total);

  // Links de pago por producto si existen
  const links = CART.filter(i=>i.paymentLink).map(i=>`<li><a href="${i.paymentLink}" target="_blank">${i.name}</a></li>`).join("");
  if(links){
    payLinksBox.classList.remove("hidden");
    payLinksBox.innerHTML = `<div class="label">Links de pago por producto</div><ul>${links}</ul>`;
  }else{
    payLinksBox.classList.add("hidden");
    payLinksBox.innerHTML = "";
  }
}

// WhatsApp link
function waLinkFromOrder({ items, buyer, payMethod, shippingCost, discount, total, subtotal }){
  const lines = items.map(it=>`• ${it.name} x${it.qty} — ${money(it.price*it.qty)}`).join("%0A");
  const linkList = items.filter(it=>it.paymentLink).map(it=>`- ${it.name}: ${it.paymentLink}`).join("%0A");
  const address = [buyer.address,buyer.neighborhood,buyer.city].filter(Boolean).join(", ");
  const header = `Hola! Quiero hacer esta compra en *${CONFIG.storeName}*: %0A`;
  const body = `${lines}%0A%0ASubtotal: ${money(subtotal)}%0A${discount ? `Descuento ${CONFIG.cashDiscount.percent}% (${payMethod}): -${money(discount)}%0A`:""}${shippingCost?`Envío: ${money(shippingCost)}%0A`:""}Total: *${money(total)}*%0A`;
  const data = `%0ADatos:%0ANombre: ${encodeURIComponent(buyer.name||"")} %0ATeléfono: ${encodeURIComponent(buyer.phone||"")} %0ADirección: ${encodeURIComponent(address||"")} %0AMétodo de pago: ${encodeURIComponent(payMethod)} %0ANotas: ${encodeURIComponent(buyer.notes||"")} %0A`;
  const links = linkList ? `%0A${encodeURIComponent("Links de pago por producto (si aplica):")}%0A${encodeURIComponent(linkList)}%0A` : "";
  const text = `${header}${body}${data}${links}`;
  return `https://wa.me/${CONFIG.storeWhatsapp}?text=${text}`;
}

// Persistencia de datos del comprador
const buyer = {
  name: qs("#buyerName"),
  phone: qs("#buyerPhone"),
  address: qs("#buyerAddress"),
  neighborhood: qs("#buyerNeighborhood"),
  city: qs("#buyerCity"),
  notes: qs("#buyerNotes")
};
function loadBuyer(){
  const b = load("ixoye_buyer",{name:"",phone:"",address:"",neighborhood:"",city:"Mar del Plata",notes:""});
  buyer.name.value=b.name; buyer.phone.value=b.phone; buyer.address.value=b.address; buyer.neighborhood.value=b.neighborhood; buyer.city.value=b.city; buyer.notes.value=b.notes;
}
function saveBuyer(){
  const b={name:buyer.name.value,phone:buyer.phone.value,address:buyer.address.value,neighborhood:buyer.neighborhood.value,city:buyer.city.value,notes:buyer.notes.value};
  save("ixoye_buyer", b);
}

// Eventos UI
qs("#openCart").onclick = openCart;
qs("#closeCart").onclick = closeCart;
qs("#clear").onclick = clearCart;
qsa('input[name="delivery"]').forEach(r => r.onchange = renderCart);
qs("#payMethod").onchange = renderCart;

qs("#checkout").onclick = ()=>{
  if(!CART.length) return alert("El carrito está vacío");
  if(!buyer.name.value || !buyer.phone.value) return alert("Completá nombre y teléfono");
  saveBuyer();
  const wantsShipping = document.querySelector('input[name="delivery"][value="envio"]').checked;
  const sub = subtotal();
  const ship = wantsShipping ? ((CONFIG.freeShipping.enabled && sub>=CONFIG.freeShipping.threshold)?0:CONFIG.defaultShippingCost) : 0;
  const method = qs("#payMethod").value;
  const discount = (CONFIG.cashDiscount.enabled && method==="Efectivo") ? (sub*CONFIG.cashDiscount.percent/100) : 0;
  const total = Math.max(0, sub - discount) + ship;

  const url = waLinkFromOrder({
    items: CART,
    buyer: { name: buyer.name.value, phone: buyer.phone.value, address: buyer.address.value, neighborhood: buyer.neighborhood.value, city: buyer.city.value, notes: buyer.notes.value },
    payMethod: method,
    shippingCost: ship,
    discount, total, subtotal: sub
  });
  window.open(url, "_blank");
};

// Init
renderProducts();
updateBadge();
renderCart();
loadBuyer();
