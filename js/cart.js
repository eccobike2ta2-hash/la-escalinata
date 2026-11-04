/* ============================================
   LA ESCALINATA — cart.js
   Estado y render del carrito
   ============================================ */

// 1. FUNCIÓN PUENTE GLOBAL PRIMERO (Para que las tarjetas la encuentren siempre)
window.agregarAlCarrito = function(id) {
  if (!window.ESCALINATA_PRODUCTS) {
    console.warn("Los productos de Google Sheets aún no se han cargado en la memoria.");
    return;
  }

  const producto = window.ESCALINATA_PRODUCTS.find(p => p.id === id);

  if (!producto) {
    console.error("No se encontró ningún producto con el ID:", id);
    return;
  }

  window.EscalinataCart.add(producto);

  if (typeof window.mostrarToast === 'function') {
    window.mostrarToast(`${producto.name} agregado`);
  } else {
    console.log(`Agregado con éxito: ${producto.name}`);
  }
};


// 2. MOTOR DEL CARRITO (MÓDULO INTERNO)
window.EscalinataCart = (function() {
  let items = [];

  // Costo fijo de envío, se cobra en todos los pedidos sin importar la zona
  const SHIPPING_COST = 7;
  const STORAGE_KEY = 'escalinata_cart_items';

  function getItems() { return items; }

  function getSubtotal() {
    return items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function getShipping() {
    return items.length === 0 ? 0 : SHIPPING_COST;
  }

  function getTotal() {
    return getSubtotal() + getShipping();
  }

  function getCount() {
    return items.reduce((sum, i) => sum + i.qty, 0);
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
  }

  function add(product) {
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty++;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        imgUrl: product.imgUrl,
        qty: 1
      });
    }
    render();
    updateBadge();
    const btn = document.getElementById('cartToggle');
    if (btn) { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
    save();
  }

  function remove(id) {
    items = items.filter(i => i.id !== id);
    render();
    updateBadge();
    save();
  }

  function changeQty(id, delta) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { remove(id); return; }
    render();
    updateBadge();
    save();
  }

  function clear() {
    items = [];
    render();
    updateBadge();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function updateBadge() {
    const count = getCount();
    const badge = document.getElementById('cartCount');
    if (!badge) return;
    badge.textContent = count;
    count > 0 ? badge.classList.add('visible') : badge.classList.remove('visible');
  }

  // Botones de cada tarjeta de producto:
  // "+" si el producto no está en el carrito, "− n +" si ya está.
  function syncCards() {
    document.querySelectorAll('.card-action').forEach(box => {
      const id   = Number(box.dataset.id);
      const item = items.find(i => i.id === id);
      const qty  = item ? item.qty : 0;
      if (box.dataset.qty === String(qty)) return;
      box.dataset.qty = qty;
      box.innerHTML = qty > 0
        ? `<div class="card-qty">
             <button class="cq-btn" data-act="minus" aria-label="Quitar uno">−</button>
             <span class="cq-num">${qty}</span>
             <button class="cq-btn" data-act="plus" aria-label="Agregar uno">+</button>
           </div>`
        : `<button class="add-btn" data-act="plus" aria-label="Agregar al carrito">+</button>`;
    });
  }

  // Un solo listener para todos los botones + / − de las tarjetas
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.card-action [data-act]');
    if (!btn) return;
    const id = Number(btn.closest('.card-action').dataset.id);
    if (btn.dataset.act === 'plus') window.agregarAlCarrito(id);
    else changeQty(id, -1);
  });

  function render() {
    const container  = document.getElementById('cartItems');
    const footer     = document.getElementById('cartFooter');
    const empty      = document.getElementById('cartEmpty');
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl    = document.getElementById('cartTotal');

    syncCards();

    if (!container) return;

    container.querySelectorAll('.cart-item').forEach(el => el.remove());

    if (items.length === 0) {
      empty.style.display = 'flex';
      footer.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    footer.style.display = 'block';

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.dataset.id = item.id;

      el.innerHTML = `
        <div class="ci-img-preview">
          <img src="${item.imgUrl || 'https://via.placeholder.com/50'}" alt="${item.name}" style="width:40px; height:40px; object-fit:cover; border-radius:8px;">
        </div>
        <div class="ci-info">
          <div class="ci-name">${item.name}</div>
          <div class="ci-price">$${(item.price * item.qty).toFixed(2)} <small>/ ${item.unit || 'ud'}</small></div>
        </div>
        <div class="ci-controls">
          <button class="qty-btn" data-action="minus" data-id="${item.id}" aria-label="Quitar uno">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" data-action="plus"  data-id="${item.id}" aria-label="Agregar uno">+</button>
        </div>
        <button class="ci-remove" data-id="${item.id}" aria-label="Eliminar">✕</button>
      `;
      container.appendChild(el);
    });

    if (subtotalEl) subtotalEl.textContent = '$' + getSubtotal().toFixed(2);
    if (shippingEl) shippingEl.textContent = '$' + getShipping().toFixed(2);
    if (totalEl)    totalEl.textContent    = '$' + getTotal().toFixed(2);

    container.querySelectorAll('.qty-btn').forEach(btn => {
      btn.onclick = () => changeQty(Number(btn.dataset.id), btn.dataset.action === 'plus' ? 1 : -1);
    });
    container.querySelectorAll('.ci-remove').forEach(btn => {
      btn.onclick = () => remove(Number(btn.dataset.id));
    });

    // Checkout por WhatsApp (con validación de nombre y dirección)
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (checkoutBtn) {
      checkoutBtn.onclick = (e) => {
        e.preventDefault();
        if (items.length === 0) return;

        const nameInput    = document.getElementById('cartName');
        const addressInput = document.getElementById('cartAddress');
        const nombreRecibe = nameInput ? nameInput.value.trim() : "";
        const address      = addressInput ? addressInput.value.trim() : "";

        [nameInput, addressInput].forEach(i => i && i.classList.remove('error'));

        if (nombreRecibe === "") {
          if (nameInput) { nameInput.classList.add('error'); nameInput.focus(); }
          if (window.mostrarToast) window.mostrarToast("⚠️ Escribe el nombre de quien recibe");
          return;
        }

        if (address === "") {
          if (addressInput) { addressInput.classList.add('error'); addressInput.focus(); }
          if (window.mostrarToast) window.mostrarToast("⚠️ Escribe la dirección de entrega");
          return;
        }

        // Número de WhatsApp de La Escalinata
        const TELEFONO = "5353462071";

        let mensaje = `👋 ¡Hola La Escalinata! Me gustaría realizar el siguiente pedido:\n\n`;
        mensaje += `🙋 *Recibe:* ${nombreRecibe}\n`;
        mensaje += `📍 *Dirección de Entrega:* ${address}\n🏙️ Manzanillo, Granma, Cuba\n\n`;
        mensaje += `=========================\n`;

        items.forEach(item => {
          const subtotalItem = item.price * item.qty;
          mensaje += `▪️ ${item.qty}x ${item.name}\n`;
          mensaje += `   Precio (mercado local): $${item.price.toFixed(2)} / Subtotal: $${subtotalItem.toFixed(2)}\n\n`;
        });

        mensaje += `=========================\n`;
        mensaje += `Subtotal productos: $${getSubtotal().toFixed(2)}\n`;
        mensaje += `ℹ️ _Precios de mercado local, sujetos a disponibilidad del día._\n\n`;
        mensaje += `🛵 *Envío: $${getShipping().toFixed(2)}*\n`;
        mensaje += `💰 *Total a pagar: $${getTotal().toFixed(2)}*\n\n`;
        mensaje += `🛵 _Pedido listo para procesar en Manzanillo, Granma, Cuba._`;

        const urlWhatsApp = `https://api.whatsapp.com/send?phone=${TELEFONO}&text=${encodeURIComponent(mensaje)}`;

        if (nameInput) nameInput.value = "";
        if (addressInput) addressInput.value = "";
        clear();

        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        if (sidebar && overlay) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        }
        document.body.style.overflow = '';

        window.open(urlWhatsApp, '_blank');
      };
    }
  }

  function init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) items = JSON.parse(saved);
    } catch (e) { items = []; }

    // El borde rojo de error se quita en cuanto la persona empieza a escribir
    ['cartName', 'cartAddress'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => el.classList.remove('error'));
    });

    render();
    updateBadge();
  }

  setTimeout(init, 50);

  return { getItems, getSubtotal, getShipping, getTotal, getCount, add, remove, changeQty, clear, render, syncCards };
})();
