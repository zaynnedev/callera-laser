(async function loadPartials(){
  const zones = document.querySelectorAll("[data-partial]");
  for (const z of zones) {
    const url = z.getAttribute("data-partial");
    try{
      const res = await fetch(url, {cache:"no-store"});
      z.innerHTML = await res.text();
    }catch(e){ console.error("Falha ao carregar parcial:", url, e); }
  }
  document.dispatchEvent(new Event('partials:ready')); // header/sacola prontos
  requestAnimationFrame(bindUI);
})();

function bindUI(){
  // MENU
  const sidebar  = document.getElementById("sidebar");
  const backdrop = document.getElementById("backdrop");
  const btnOpen  = document.getElementById("btnOpenMenu");
  const btnClose = document.getElementById("btnCloseMenu");
  const openMenu = ()=>{ sidebar?.classList.add("open"); backdrop?.removeAttribute("hidden"); };
  const closeMenu = ()=>{ sidebar?.classList.remove("open"); backdrop?.setAttribute("hidden","true"); };
  btnOpen?.addEventListener("click", openMenu);
  btnClose?.addEventListener("click", closeMenu);
  backdrop?.addEventListener("click", closeMenu);
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeMenu(); });

  // SACOLA
  const drawer   = document.getElementById("cartDrawer");
  const bd       = document.getElementById("cartBackdrop");
  const openCart = document.getElementById("btnOpenCart");
  const closeCart= document.getElementById("btnCloseCart");
  const showCart = ()=>{ drawer?.classList.add("show"); drawer?.setAttribute("aria-hidden","false"); };
  const hideCart = ()=>{ drawer?.classList.remove("show"); drawer?.setAttribute("aria-hidden","true"); };
  openCart?.addEventListener("click",(e)=>{ e.preventDefault(); showCart(); });
  closeCart?.addEventListener("click", hideCart);
  bd?.addEventListener("click", hideCart);
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape" && drawer?.classList.contains("show")) hideCart(); });
}
// ==== CHECKOUT -> grava no Supabase e depois abre o WhatsApp ====
// ==== CHECKOUT -> grava no Supabase e depois abre o WhatsApp (número fixo) ====
(function () {
  const supa = window.SUPA;

  function getCartItems() {
    if (window.CART?.items?.length) {
      return window.CART.items.map(i => ({
        id: i.id || null,
        name: i.name,
        qty: Number(i.qty || 1),
        price: i.price ?? null
      }));
    }
    const nodes = Array.from(document.querySelectorAll("#cartItems .cd-item"));
    return nodes.map(n => {
      const name = n.querySelector(".cd-name")?.textContent?.trim() || "Item";
      const qty = Number(n.querySelector("[data-qty]")?.value || 1);
      const priceTxt = n.querySelector(".cd-price")?.textContent || "";
      const price = Number(String(priceTxt).replace(/[^\d,.-]/g,"").replace(/\./g,"").replace(",", ".")) || null;
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
    const name  = (document.getElementById("orderName")?.value || "").trim();
    const phone = (document.getElementById("orderPhone")?.value || "").replace(/\D/g,""); // só guardamos
    const items = getCartItems();

    if (!name || !items.length) { alert("Informe seu nome e adicione itens."); return; }

    try {
      await saveOrder({ name, phone, items });

      const destinoFixo = "5592993242367"; // <- WhatsApp fixo
      const lista = items.map(i => `${i.qty}× ${i.name}`).join(", ");
      const msg = encodeURIComponent(`Olá, sou ${name}. Quero finalizar meu pedido: ${lista}`);
      window.open(`https://wa.me/${destinoFixo}?text=${msg}`, "_blank");

      const t = document.createElement("div");
      t.className = "toast ok show"; t.textContent = "Pedido enviado e registrado!";
      document.getElementById("toast")?.appendChild(t);
      setTimeout(()=> t.remove(), 2400);
    } catch (err) {
      console.error("Falha ao salvar pedido:", err);
      alert("Não foi possível registrar o pedido agora. Verifique sua conexão e tente novamente.");
    }
  });
})();


