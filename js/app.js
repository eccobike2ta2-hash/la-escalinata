/* ==========================================================================
   LA ESCALINATA — app.js
   ========================================================================== */

const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR23mntdtU-lIvdRc_RfN1xoacbophCeiRTcR0ohJ10Fw5l8--KHk2SY9IZpHwWP7rbQFRW6npcQjUh/pub?gid=606259516&single=true&output=tsv";

const CATEGORIA_EMOJIS = {
  "carnes":             "🥩",
  "cárnes":             "🥩",
  "despensa":           "🫘",
  "bebidas":            "🥤",
  "enlatados":          "🥫",
  "aseo":               "🧴",
  "lácteos":            "🥛",
  "lacteos":            "🥛",
  "alimentos":          "🛍️",
  "combos":             "📦",
  "frutas":             "🍎",
  "verduras":           "🥦",
  "panadería":          "🍞",
  "panaderia":          "🍞",
  "electrodomésticos":  "📺",
  "electrodomesticos":  "📺",
  "café":               "☕",
  "otros":              "🏷️",
};

// ── FILTRO ──
// filtro 'encargo' muestra toda categoría que contenga "encargo" (encargo, por encargo, productos por encargo)
window.filtrarCategoria = function(filtro, elClicado) {
  document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
  elClicado.classList.add('active');
  let visibles = 0;
  document.querySelectorAll('.product-card').forEach(tarjeta => {
    const cat = tarjeta.dataset.category || '';
    const mostrar = filtro === 'todos' || cat === filtro || (filtro === 'encargo' && cat.includes('encargo'));
    tarjeta.classList.toggle('oculto', !mostrar);
    if (mostrar) visibles++;
  });
  const vacio = document.getElementById('encargoVacio');
  if (vacio) vacio.hidden = !(filtro === 'encargo' && visibles === 0);
};

// ── CARGA DESDE GOOGLE SHEETS ──
async function cargarProductosDesdeSheets() {
  try {
    const respuesta = await fetch(`${GOOGLE_SHEETS_URL}&t=${Date.now()}`, { cache: "no-store" });
    const textoTSV  = await respuesta.text();
    const filas     = textoTSV.split("\n").slice(1);

    window.ESCALINATA_PRODUCTS = filas.map(fila => {
      if (!fila.trim()) return null;
      const col = fila.split("\t");
      if (col.length < 6) return null;

      const visibleRaw = col[8] ? col[8].trim().toLowerCase() : "si";
      return {
        id:       parseInt(col[0].trim(), 10) || Date.now(),
        category: col[1] ? col[1].trim().toLowerCase() : "otros",
        imgUrl:   col[2] ? col[2].trim() : "",
        name:     col[3] ? col[3].replace(/"/g, "").trim() : "Producto sin nombre",
        desc:     col[4] ? col[4].replace(/"/g, "").trim() : "",
        price:    col[5] ? parseFloat(col[5].trim()) : 0.00,
        unit:     col[6] ? col[6].trim() : "unidad",
        badge:    col[7] ? col[7].trim() : "",
        visible:  visibleRaw !== "no",
      };
    }).filter(Boolean);

    renderizarCategorias();
    renderizarCatalogo();
    document.dispatchEvent(new CustomEvent('productosCargados'));
    quitarLoader();

  } catch (error) {
    console.error("Error cargando inventario:", error);
    quitarLoader();
  }
}

// ── CATEGORÍAS ──
function renderizarCategorias() {
  const grid = document.querySelector('.categories-grid');
  if (!grid) return;

  const todasLasCategorias = [...new Set(
    window.ESCALINATA_PRODUCTS.filter(p => p.visible).map(p => p.category)
  )].filter(c => !c.includes('encargo'));

  const categorias = [
    ...todasLasCategorias.filter(c => c !== "otros"),
    ...todasLasCategorias.filter(c => c === "otros")
  ];

  const html = `
    <div class="cat-card active" onclick="filtrarCategoria('todos', this)">
      <div class="cat-emoji">🔍</div>
      <span>Todos</span>
    </div>
    <div class="cat-card cat-encargo" onclick="filtrarCategoria('encargo', this)">
      <div class="cat-emoji">🎂</div>
      <span>Productos por encargo</span>
    </div>
    ${categorias.map(cat => {
      const emoji  = CATEGORIA_EMOJIS[cat] || "🏷️";
      const nombre = cat.charAt(0).toUpperCase() + cat.slice(1);
      return `
        <div class="cat-card" onclick="filtrarCategoria('${cat}', this)">
          <div class="cat-emoji">${emoji}</div>
          <span>${nombre}</span>
        </div>`;
    }).join('')}
  `;

  grid.innerHTML = html;
}

// ── CATÁLOGO ──
const TELEFONO_WA = "5353462071";

function renderizarCatalogo() {
  const grid = document.getElementById('productsGrid') || document.querySelector('.products-grid');
  if (!grid) return;

  const productosVisibles = window.ESCALINATA_PRODUCTS.filter(p => p.visible);

  const tarjetas = productosVisibles.map(producto => {
    const esEncargo = producto.category.includes('encargo');
    const sinPrecio = !(producto.price > 0);
    const nota      = esEncargo ? ' · por encargo' : ' · mercado local';

    // Sin precio en la hoja → "Consultar precio" y el botón abre WhatsApp con el nombre del producto
    const msg = encodeURIComponent(`Hola La Escalinata, quiero encargar: ${producto.name}`);
    const precioHTML = sinPrecio
      ? `<span class="product-price"><small>Consultar precio</small></span>`
      : `<span class="product-price">$${producto.price.toFixed(2)} <small>/ ${producto.unit}</small><small class="price-note">${nota}</small></span>`;
    const botonHTML = sinPrecio
      ? `<a class="add-btn add-wa" href="https://wa.me/${TELEFONO_WA}?text=${msg}" target="_blank" rel="noopener" aria-label="Encargar por WhatsApp"><svg width="20" height="20"><use href="#wa"/></svg></a>`
      : `<button class="add-btn" onclick="agregarAlCarrito(${producto.id})">+</button>`;

    return `
    <div class="product-card" data-category="${producto.category}">
      <div class="product-img">
        ${producto.badge ? `<span class="product-badge">${producto.badge}</span>` : ''}
        <img src="${producto.imgUrl || 'https://via.placeholder.com/150'}" alt="${producto.name}" loading="lazy">
      </div>
      <div class="product-info">
        <h3 class="product-name">${producto.name}</h3>
        <p class="product-desc">${producto.desc}</p>
        <div class="product-footer">
          ${precioHTML}
          ${botonHTML}
        </div>
      </div>
    </div>`;
  }).join('');

  const vacio = `
    <div id="encargoVacio" class="encargo-vacio" hidden>
      <strong>Pronto tendremos productos por encargo aquí.</strong>
      <p>Cuéntanos qué necesitas (tortas, dulces y más) y lo preparamos para ti.</p>
      <a class="encargo-wa" href="https://wa.me/${TELEFONO_WA}?text=${encodeURIComponent('Hola La Escalinata, quiero hacer un encargo: ')}" target="_blank" rel="noopener">
        <svg width="18" height="18"><use href="#wa"/></svg> Encargar por WhatsApp
      </a>
    </div>`;

  grid.innerHTML = tarjetas + vacio;
}

// ── LOADER ──
function quitarLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 300);
  }
}

// ── MENÚ MÓVIL ──
function configurarMenuMovil() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.onclick = () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
    };
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.onclick = () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
      };
    });
  }
}

// ── LOGO ANIMADO (escalera ⇄ bolsa de mercado) ──
function configurarLogoAnimado() {
  const brand = document.querySelector('.nav-inner .brand');
  if (!brand) return;

  const ESCALERA_HTML = `
    <span class="brand-lockup">
      <svg width="34" height="17" viewBox="0 0 112 55" fill="#000">
        <rect x="75" y="0" width="37" height="9"/><rect x="56" y="11.5" width="56" height="9"/>
        <rect x="37" y="23" width="75" height="9"/><rect x="19" y="34.5" width="93" height="9"/>
        <rect x="0" y="46" width="112" height="9"/>
      </svg>
      <span class="brand-text-light">LA ESCALINATA</span>
    </span>`;

  const BOLSA_HTML = `
    <span class="brand-lockup">
      <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
        <path d="M13 15 V11 a7 7 0 0 1 14 0 V15" stroke="#000" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M6 15 H34 L36 35 a3 3 0 0 1 -3 3 H7 a3 3 0 0 1 -3 -3 Z" fill="#000"/>
        <rect x="21" y="22" width="9" height="2.6" fill="#fff"/><rect x="17" y="27" width="13" height="2.6" fill="#fff"/><rect x="13" y="32" width="17" height="2.6" fill="#fff"/>
      </svg>
      <span class="brand-text-bold">La Escalinata</span>
    </span>`;

  const estados = [ESCALERA_HTML, BOLSA_HTML];
  let i = 0;

  setInterval(() => {
    i = (i + 1) % estados.length;
    brand.style.opacity = '0';
    brand.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      brand.innerHTML = estados[i];
      brand.style.opacity = '1';
      brand.style.transform = 'translateY(0)';
    }, 300);
  }, 3000);
}

// ── BUSCADOR + ENCARGO POR WHATSAPP ──
function configurarBuscador() {
  const inputBuscar = document.getElementById('searchInput');
  const linkEncargo = document.getElementById('encargoWa');
  if (!inputBuscar) return;

  const TELEFONO = "5353462071";

  inputBuscar.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase().trim();
    const vacio = document.getElementById('encargoVacio');
    if (vacio) vacio.hidden = true;

    document.querySelectorAll('.product-card').forEach(tarjeta => {
      const nombre = tarjeta.querySelector('.product-name')?.textContent.toLowerCase() || '';
      const desc   = tarjeta.querySelector('.product-desc')?.textContent.toLowerCase() || '';
      tarjeta.classList.toggle('oculto', !(nombre.includes(texto) || desc.includes(texto)));
    });

    // Lo que escribe la persona viaja en el mensaje de encargo
    if (linkEncargo) {
      const msg = `Hola La Escalinata, quiero encargar un producto: ${e.target.value.trim()}`;
      linkEncargo.href = `https://wa.me/${TELEFONO}?text=${encodeURIComponent(msg)}`;
    }
  });
}

// ── CARRITO SIDEBAR ──
function configurarAperturaCarrito() {
  const cartToggle  = document.getElementById('cartToggle');
  const cartClose   = document.getElementById('cartClose');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartSidebar = document.getElementById('cartSidebar');

  function abrirCarrito() {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('open');
    history.pushState({ carrito: true }, '');
  }

  function cerrarCarrito() {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('open');
  }

  if (cartToggle) cartToggle.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    abrirCarrito();
  };
  if (cartClose) cartClose.onclick = () => {
    cerrarCarrito();
    history.back();
  };
  if (cartOverlay) cartOverlay.onclick = () => {
    cerrarCarrito();
    history.back();
  };

  window.addEventListener('popstate', () => {
    if (cartSidebar.classList.contains('open')) cerrarCarrito();
  });
}

// ── TOAST ──
window.mostrarToast = function(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
};

// ── ARRANQUE ──
document.addEventListener('DOMContentLoaded', () => {
  configurarMenuMovil();
  configurarBuscador();
  configurarAperturaCarrito();
  cargarProductosDesdeSheets();
  configurarLogoAnimado();
});
