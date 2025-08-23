# Mini Tienda Ixoye — Checkout por WhatsApp

Sitio estático (HTML/CSS/JS) para mostrar productos, sumar al carrito y finalizar la compra por WhatsApp.

## 🚀 Cómo usar
1. **Descargá** este ZIP y descomprimí.
2. Editá `app.js`:
   - `storeWhatsapp`: tu número en formato internacional sin `+`.
   - `storeName`, promos y costos.
   - Lista `PRODUCTS` (podés pegar tus productos reales).
3. (Opcional) Cargá productos desde un endpoint o archivo `products.json` propio si querés.
4. Subí la carpeta a **Vercel / Netlify / GitHub Pages** como sitio estático.

## ✨ Qué hace
- Grid de productos con cantidad.
- Carrito persistido en `localStorage`.
- Envío gratis desde $5.000 y 10% OFF en efectivo (configurable).
- Checkout que abre WhatsApp con el pedido prellenado (ítems, totales y datos del cliente).
- Campo opcional de **link de pago por producto** (Mercado Pago u otros).

## 🧩 Dónde cargo mis productos
En `app.js`, constante `PRODUCTS`. Ejemplo:

```js
const PRODUCTS = [
  { id: "avena-500", name: "Avena 500 g", price: 2200, sku: "AV-500", image: "URL", paymentLink: "" },
  // ...
];
```

## 🧪 Pruebas locales
Abrí `index.html` en tu navegador. No necesita backend.

## 🔒 Notas
- Este template **no procesa pagos** ni recopila datos sensibles; solo prepara un mensaje para WhatsApp.
- Verificá reglas de envío/zonas en tu texto de WhatsApp si aplican.

¡Listo!