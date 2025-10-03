/* =========================================================================
   layout.js
   - Carrega partials via [data-partial]
   - Garante execução de <script> internos (externos e inline), na ordem
   - Emite eventos:
       * partial:loaded (por parcial)
       * partials:ready (após todas)
   - Liga UI de menu e sacola
   - Checkout -> grava no Supabase e abre WhatsApp
   ========================================================================= */

/** Executa os <script> encontrados dentro de um host de partial, preservando a ordem. */
async function runPartialScripts(host, sourceUrl) {
  const scripts = Array.from(host.querySelectorAll("script"));

  for (const old of scripts) {
    // Clona atributos importantes
    const attrs = {
      type: old.getAttribute("type"),
      crossorigin: old.getAttribute("crossorigin"),
      referrerPolicy: old.getAttribute("referrerpolicy"),
      integrity: old.getAttribute("integrity"),
      nomodule: old.hasAttribute("nomodule"),
      async: old.hasAttribute("async"),
      defer: old.hasAttribute("defer")
    };

    // Externos: carregamos de forma encadeada (async=false) para manter ordem
    if (old.src) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        if (attrs.type) s.type = attrs.type;
        if (attrs.crossorigin) s.crossOrigin = attrs.crossorigin;
        if (attrs.referrerPolicy) s.referrerPolicy = attrs.referrerPolicy;
        if (attrs.integrity) s.integrity = attrs.integrity;
        if (attrs.nomodule) s.noModule = true;

        // Forçar ordem: não usar async defer quando queremos sequência
        s.async = false;
        s.defer = false;

        // Mantém referência do partial de origem
        s.setAttribute("data-from-partial", sourceUrl);

        s.onload = () => resolve();
        s.onerror = (e) =>
          reject(new Error(`Falha ao carregar <script src="${old.src}"> do partial ${sourceUrl}: ${e?.message || e}`));

        s.src = old.src;
        document.body.appendChild(s);
      });
    } else {
      // Inline: executa imediatamente mantendo posição relativa (ordem)
      const s = document.createElement("script");
      if (attrs.type) s.type = attrs.type;
      if (attrs.nomodule) s.noModule = true;

      s.setAttribute("data-from-partial", sourceUrl);
      s.textContent = old.textContent || "";
      document.body.appendChild(s);
    }

    // Limpa o script antigo do host para evitar reexecuções acidentais
    old.remove();
  }
}

/** Carrega todas as partials e garante execução dos scripts internos. */
(async function loadPartials() {
  const zones = Array.from(document.querySelectorAll("[data-partial]"));
  for (const z of zones) {
    const url = z.getAttribute("data-partial");
    if (!url) continue;

    try {
      const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // Injeta o HTML da parcial
      z.innerHTML = html;

      // Executa quaisquer <script> existentes dentro da parcial (externos e inline)
      await runPartialScripts(z, url);

      // Emite evento por parcial carregada (útil se algo escuta esse ponto)
      document.dispatchEvent(new CustomEvent("partial:loaded", { detail: { url, host: z } }));
    } catch (e) {
      console.error("Falha ao carregar parcial:", url, e);
      z.innerHTML = "<!-- falha ao carregar parcial -->";
    }
  }

  // Todas as partials carregadas + scripts executados
  document.dispatchEvent(new Event("partials:ready"));

  // Liga interações de UI no próximo frame
  requestAnimationFrame(bindUI);
})();

/** Liga os controles do Menu lateral e da Sacola (drawer). */
function bindUI() {
  // ===== MENU =====
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("backdrop");
  const btnOpen = document.getElementById("btnOpenMenu");
  const btnClose = document.getElementById("btnCloseMenu");

  const openMenu = () => {
    sidebar?.classList.add("open");
    backdrop?.removeAttribute("hidden");
  };
  const closeMenu = () => {
    sidebar?.classList.remove("open");
    backdrop?.setAttribute("hidden", "true");
  };

  btnOpen?.addEventListener("click", openMenu);
  btnClose?.addEventListener("click", closeMenu);
  backdrop?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // ===== SACOLA (CART) =====
  const drawer = document.getElementById("cartDrawer");
  const bd = document.getElementById("cartBackdrop");
  const openCart = document.getElementById("btnOpenCart");
  const closeCart = document.getElementById("btnCloseCart");

  const showCart = () => {
    drawer?.classList.add("show");
    drawer?.setAttribute("aria-hidden", "false");
  };
  const hideCart = () => {
    drawer?.classList.remove("show");
    drawer?.setAttribute("aria-hidden", "true");
  };

  openCart?.addEventListener("click", (e) => {
    e.preventDefault();
    showCart();
  });
  closeCart?.addEventListener("click", hideCart);
  bd?.addEventListener("click", hideCart);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer?.classList.contains("show")) hideCart();
  });
}

/* =========================================================================
   CHECKOUT -> grava no Supabase e depois abre o WhatsApp (número fixo)
   ========================================================================= */
(function () {
  const supa = window.SUPA;

  function getCartItems() {
    if (window.CART?.items?.length) {
      return window.CART.items.map((i) => ({
        id: i.id || null,
        name: i.name,
        qty: Number(i.qty || 1),
        price: i.price ?? null
      }));
    }
    const nodes = Array.from(document.querySelectorAll("#cartItems .cd-item"));
    return nodes.map((n) => {
      const name = n.querySelector(".cd-name")?.textContent?.trim() || "Item";
      const qty = Number(n.querySelector("[data-qty]")?.value || 1);
      const priceTxt = n.querySelector(".cd-price")?.textContent || "";
      const price =
        Number(String(priceTxt).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || null;
      return { id: null, name, qty, price };
    });
  }

  async function saveOrder({ name, phone, items }) {
    const payload = {
      customer: name || null,
      phone: phone || null,
      items,
      status: "enviado",
      to_whatsapp: true
    };
    const { error } = await supa.from("orders").insert(payload);
    if (error) throw error;
  }

  document.getElementById("btnCheckout")?.addEventListener("click", async () => {
    const name = (document.getElementById("orderName")?.value || "").trim();
    const phone = (document.getElementById("orderPhone")?.value || "").replace(/\D/g, ""); // só guardamos dígitos
    const items = getCartItems();

    if (!name || !items.length) {
      alert("Informe seu nome e adicione itens.");
      return;
    }

    try {
      await saveOrder({ name, phone, items });

      const destinoFixo = "5592993242367"; // <- WhatsApp fixo
      const lista = items.map((i) => `${i.qty}× ${i.name}`).join(", ");
      const msg = encodeURIComponent(`Olá, sou ${name}. Quero finalizar meu pedido: ${lista}`);
      window.open(`https://wa.me/${destinoFixo}?text=${msg}`, "_blank");

      const t = document.createElement("div");
      t.className = "toast ok show";
      t.textContent = "Pedido enviado e registrado!";
      document.getElementById("toast")?.appendChild(t);
      setTimeout(() => t.remove(), 2400);
    } catch (err) {
      console.error("Falha ao salvar pedido:", err);
      alert("Não foi possível registrar o pedido agora. Verifique sua conexão e tente novamente.");
    }
  });
})();
