/* js/product.js */
(async function () {
  const supa = window.SUPA;
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const cont = document.getElementById("prodView");
  if (!id || !cont) return;

  // helpers
  const fmt = (n) =>
    (Number(n || 0)).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const escapeHTML = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  try {
    // lê o produto
    const { data, error } = await supa
      .from("products")
      .select(
        "id,name,description,price,on_sale,promo_price,image_url,installments_enabled,installments_count,installment_value"
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      cont.innerHTML = '<p class="muted">Produto não encontrado.</p>';
      return;
    }

    // preço base (se promo tiver, usa promo no "por")
    const base =
      data.on_sale && data.promo_price != null
        ? Number(data.promo_price)
        : data.price != null
        ? Number(data.price)
        : null;

    // parcelas válidas
    const hasInst =
      !!data.installments_enabled &&
      !!data.installments_count &&
      data.installment_value != null;

    // blocos do preço
    const de =
      data.on_sale && data.promo_price != null && data.price != null
        ? `<div class="de">R$ ${fmt(data.price)}</div>`
        : "";

    const por =
      base != null
        ? `<div class="por"><span class="rs">R$</span><span class="num">${fmt(
            base
          )}</span></div>`
        : "";

    const parcelas = hasInst
      ? `<div class="install"><span class="qty">${Number(
          data.installments_count
        )}x</span> <span class="rs">R$</span> <span class="num">${fmt(
          data.installment_value
        )}</span></div>`
      : "";

    // descrição (escape + quebra de linha segura)
    const descHTML = data.description
      ? escapeHTML(data.description).replace(/\n/g, "<br>")
      : "";

    // render
    cont.innerHTML = `
      <div class="pv-media">
        <img src="${data.image_url || "assets/images/placeholder.png"}" alt="">
      </div>

      <div class="pv-info">
        <h1 class="pv-title">${escapeHTML(data.name)}</h1>

        <div class="pv-price">
          ${de}
          ${por}
          ${parcelas}
        </div>

        ${
          descHTML
            ? `<p id="pvDesc" class="pv-desc">${descHTML}</p>
               <button id="btnMore" class="pv-more" hidden>Ver mais</button>`
            : ""
        }

        <div class="pv-actions">
          <button class="btn btn-solid" id="btnAdd">Adicionar à sacola</button>
          <a class="btn btn-outline" href="javascript:history.back()">Voltar</a>
        </div>
      </div>
    `;

    // “Ver mais” — só aparece se houver overflow
    const descEl = document.getElementById("pvDesc");
    const btnMore = document.getElementById("btnMore");
    if (descEl && btnMore) {
      requestAnimationFrame(() => {
        const needMore = descEl.scrollHeight > descEl.clientHeight + 2;
        btnMore.hidden = !needMore;
      });
      btnMore.addEventListener("click", () => {
        descEl.classList.toggle("expanded");
        btnMore.textContent = descEl.classList.contains("expanded")
          ? "Ver menos"
          : "Ver mais";
      });
    }

    // Adicionar ao carrinho — quando tem parcelado, não grava price (evita R$0,00)
    const addToCart = (item) => {
      try {
        const cart = JSON.parse(localStorage.getItem("cart") || "[]") || [];
        const i = cart.findIndex((x) => x.id === item.id);
        if (i >= 0) cart[i].qty = (cart[i].qty || 1) + 1;
        else cart.push({ ...item, qty: 1 });
        localStorage.setItem("cart", JSON.stringify(cart));
        document.dispatchEvent(new Event("cart:updated"));
      } catch (e) {
        console.error(e);
      }
    };

    document.getElementById("btnAdd")?.addEventListener("click", () => {
      const payload = {
        id: data.id,
        name: data.name,
        image: data.image_url || "assets/images/placeholder.png",
        price: hasInst ? null : base != null ? Number(base) : null,
        installments: hasInst
          ? {
              count: Number(data.installments_count),
              value: Number(data.installment_value),
            }
          : null,
      };
      addToCart(payload);
    });
  } catch (e) {
    console.error(e);
    cont.innerHTML = `<p class="muted">Falha ao carregar o produto.</p>`;
  }
})();

