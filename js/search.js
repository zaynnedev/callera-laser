// assets/js/search.js
(async function () {
  const input = document.getElementById("searchInput");
  const drop  = document.getElementById("searchResults");
  if (!input || !drop) return;

  const supa = window.SUPA;
  const fmt  = (n)=> Number(n||0).toLocaleString("pt-BR",
                  {minimumFractionDigits:2, maximumFractionDigits:2});

  let t = null;
  const debounce = (fn, ms=150) => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };

  function closeDrop(){ drop.hidden = true; drop.innerHTML = ""; }
  function openDrop(){ drop.hidden = false; }

  async function run(qRaw){
    const q = (qRaw || "").trim();
    if (q.length < 1) { closeDrop(); return; }

    const { data, error } = await supa
      .from("products")
      .select("id,name,price,on_sale,promo_price,installments_enabled,installments_count,installment_value,image_url")
      .ilike("name", `%${q}%`)
      .limit(12);

    if (error) { closeDrop(); return; }

    if (!data || !data.length){
      drop.innerHTML = `<div class="search-empty">Não encontramos nada para “${q}”.</div>`;
      openDrop();
      return;
    }

    drop.innerHTML = data.map(p => {
      const hasInst = !!p.installments_enabled && +p.installments_count > 0 && p.installment_value != null;
      const base    = (p.on_sale && p.promo_price != null) ? p.promo_price : p.price;
      const price   = base != null ? `R$ ${fmt(base)}` : "—";
      const inst    = hasInst ? `<div class="sr-inst">${p.installments_count}x R$ ${fmt(p.installment_value)}</div>` : "";

      return `
        <a class="sr-item" href="product.html?id=${encodeURIComponent(p.id)}">
          <img src="${p.image_url || 'assets/images/placeholder.png'}" alt="">
          <div class="sr-txt">
            <strong class="sr-name">${p.name}</strong>
            <div class="sr-price">${price}</div>
            ${inst}
          </div>
        </a>`;
    }).join("");

    openDrop();
  }

  /* ---- Eventos cobertos para mobile/desktop ---- */
  // digitação comum
  input.addEventListener("input", () => debounce(() => run(input.value), 120));

  // alguns navegadores móveis disparam 'search' no botão de teclado/lupa
  input.addEventListener("search", () => run(input.value));

  // tecla Enter em alguns teclados virtuais
  input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") run(input.value);
  });

  // ao focar, se já tiver texto, reabre resultados
  input.addEventListener("focus", () => {
    if ((input.value || "").trim().length) run(input.value);
  });

  // fecha ao tocar fora
  document.addEventListener("click", (e)=>{
    if (!drop.contains(e.target) && e.target !== input) closeDrop();
  }, { passive:true });
})();
