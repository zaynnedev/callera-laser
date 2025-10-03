/* search.js – robusto para header via partial em qualquer página
   - Aguarda SUPABASE, header e inputs existirem
   - Liga somente uma vez (evita duplicidade entre páginas)
   - Funciona em todas as telas que usam partials/header.html
*/
(function () {
  // ---- helpers de espera ---------------------------------------------------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(cond, { tries = 60, interval = 100 } = {}) {
    // tenta por até ~6s no total
    for (let i = 0; i < tries; i++) {
      const val = typeof cond === "function" ? cond() : null;
      if (val) return val;
      await wait(interval);
    }
    return null;
  }

  // procura input/drop dentro do header
  function findNodes() {
    const input = document.getElementById("searchInput");
    const drop  = document.getElementById("searchResults");
    return input && drop ? { input, drop } : null;
  }

  // evita ligar duas vezes
  function isBound(input) {
    return !!input?.dataset?.searchBound;
  }
  function markBound(input) {
    if (input) input.dataset.searchBound = "1";
  }

  // ---- lógica de UI --------------------------------------------------------
  function bindSearch({ input, drop }) {
    if (!input || !drop || isBound(input)) return;

    const supa = window.SUPA;
    if (!supa) {
      console.warn("[search] SUPA ausente ao bind – abortando.");
      return;
    }

    const fmt = (n) =>
      Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let t = null;
    const debounce = (fn, ms = 150) => {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };

    function closeDrop() {
      drop.hidden = true;
      drop.innerHTML = "";
    }
    function openDrop() {
      drop.hidden = false;
    }

    async function run(qRaw) {
      const q = (qRaw || "").trim();
      if (q.length < 1) {
        closeDrop();
        return;
      }

      try {
        const { data, error } = await supa
          .from("products")
          .select(
            "id,name,price,on_sale,promo_price,installments_enabled,installments_count,installment_value,image_url"
          )
          .ilike("name", `%${q}%`)
          .limit(12);

        if (error) throw error;

        if (!data || !data.length) {
          drop.innerHTML = `<div class="search-empty">Não encontramos nada para “${q}”.</div>`;
          openDrop();
          return;
        }

        drop.innerHTML = data
          .map((p) => {
            const hasInst =
              !!p.installments_enabled && +p.installments_count > 0 && p.installment_value != null;
            const base = p.on_sale && p.promo_price != null ? p.promo_price : p.price;
            const price = base != null ? `R$ ${fmt(base)}` : "—";
            const inst = hasInst
              ? `<div class="sr-inst">${p.installments_count}x R$ ${fmt(p.installment_value)}</div>`
              : "";
            const img = p.image_url || "assets/images/placeholder.png";

            return `
              <a class="sr-item" href="product.html?id=${encodeURIComponent(p.id)}">
                <img src="${img}" alt="" width="48" height="48" loading="lazy">
                <div class="sr-txt">
                  <strong class="sr-name">${p.name}</strong>
                  <div class="sr-price">${price}</div>
                  ${inst}
                </div>
              </a>`;
          })
          .join("");

        openDrop();
      } catch (e) {
        console.error("[search] erro na consulta:", e);
        closeDrop();
      }
    }

    // ---- Eventos cobrem mobile/desktop ----
    const onInput = () => debounce(() => run(input.value), 120);
    const onSearch = () => run(input.value);
    const onKeyUp = (e) => {
      if (e.key === "Enter") run(input.value);
    };
    const onFocus = () => {
      if ((input.value || "").trim().length) run(input.value);
    };
    const onDocClick = (e) => {
      if (!drop.contains(e.target) && e.target !== input) closeDrop();
    };

    input.addEventListener("input", onInput, { passive: true });
    input.addEventListener("search", onSearch);
    input.addEventListener("keyup", onKeyUp);
    input.addEventListener("focus", onFocus);

    document.addEventListener("click", onDocClick, { passive: true });

    // marca como ligado
    markBound(input);
  }

  // ---- inicialização resiliente -------------------------------------------
  async function init() {
    // aguarda SUPA, header e nós
    await waitFor(() => window.SUPA);
    let nodes = findNodes();

    if (!nodes) {
      // tenta após os partials
      let readyOnce = false;

      const tryBind = () => {
        const found = findNodes();
        if (found && !isBound(found.input)) {
          bindSearch(found);
          readyOnce = true;
        }
      };

      // 1) se seu layout.js emite 'partials:ready'
      document.addEventListener("partials:ready", tryBind, { once: true });

      // 2) também ouvimos cada 'partial:loaded' (caso o header chegue depois)
      document.addEventListener("partial:loaded", (ev) => {
        tryBind();
        // opcional: se quiser garantir que remove o listener depois do primeiro bind
        if (readyOnce) document.removeEventListener("partials:ready", tryBind);
      });

      // 3) fallback: MutationObserver (se eventos não dispararem)
      const mo = new MutationObserver(() => {
        tryBind();
        if (readyOnce) mo.disconnect();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });

      // 4) timeout de segurança: tenta por polling leve
      for (let i = 0; i < 40 && !readyOnce; i++) {
        await wait(100);
        tryBind();
      }

      return;
    }

    // se já existem, liga agora
    bindSearch(nodes);
  }

  // dispara quando possível
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
