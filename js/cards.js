// assets/js/cards.js – Home (Mais desejados)
(async function(){
  const supa = window.SUPA;
  const root = document.getElementById("featuredCards");
  const empty= document.getElementById("featuredEmpty");
  if(!root) return;

  const fmt = (n)=> Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2});

  function addToCartSafe(item){
    if(window.Cart?.add){ window.Cart.add(item); return; }
    const cart = JSON.parse(localStorage.getItem("cart")||"[]")||[];
    const i = cart.findIndex(c=>c.id===item.id);
    if(i>=0) cart[i].qty = (cart[i].qty||1) + 1;
    else cart.push({...item, qty:1});
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
  }

  function cardHTML(p){
    const hasInst  = !!p.installments_enabled && +p.installments_count>0 && p.installment_value!=null;
    const base     = (p.on_sale && p.promo_price!=null) ? p.promo_price : p.price;
    const showBase = base!=null && !(hasInst && (p.price==null || Number(p.price)===0));

    const de = (p.on_sale && p.promo_price!=null && p.price!=null)
      ? `<div class="c-de">R$ ${fmt(p.price)}</div>` : "";

    const por = showBase
      ? `<div class="c-por"><span class="rs">R$</span><span class="num">${fmt(base)}</span></div>` : "";

    const par = hasInst
      ? `<div class="c-inst"><span class="qty">${p.installments_count}x</span> <span class="rs">R$</span> <span class="num">${fmt(p.installment_value)}</span></div>`
      : "";

    return `
      <div class="mini-card" role="listitem">
        <div class="c-img">
          <img src="${p.image_url || 'assets/images/placeholder.png'}" alt="">
        </div>

        <h3 class="c-title">${p.name}</h3>

        <div class="c-price">
          ${de}${por}${par}
        </div>

        <div class="c-actions">
          <a class="pill pill-outline" href="product.html?id=${encodeURIComponent(p.id)}">Saber mais</a>
          <button class="pill pill-gold" data-add="${p.id}">
            <img class="pill-ico" src="assets/icons/sacola-1.svg" alt="" width="10" height="10">
            Adicionar
          </button>
        </div>
      </div>`;
  }

  try{
    const { data, error } = await supa
      .from("products")
      .select("id,name,image_url,price,on_sale,promo_price,installments_enabled,installments_count,installment_value,created_at")
      .eq("featured", true)
      .order("created_at",{ascending:false})
      .limit(10);

    if(error) throw error;

    if(!data?.length){ if(empty) empty.hidden=false; return; }

    root.innerHTML = data.map(cardHTML).join("");

    root.addEventListener("click",(e)=>{
      const btn = e.target.closest("[data-add]");
      if(!btn) return;
      const p = data.find(x=>x.id===btn.dataset.add);
      if(!p) return;

      const hasInst  = !!p.installments_enabled && +p.installments_count>0 && p.installment_value!=null;
      const base     = (p.on_sale && p.promo_price!=null) ? p.promo_price : p.price;
      const showBase = base!=null && !(hasInst && (p.price==null || Number(p.price)===0));

      addToCartSafe({
        id: p.id,
        name: p.name,
        price: showBase ? Number(base) : null,
        image: p.image_url || "assets/images/placeholder.png",
        installments: hasInst ? { count:Number(p.installments_count), value:Number(p.installment_value) } : null
      });
    });
  }catch(err){
    if(empty){ empty.hidden=false; empty.textContent="Não foi possível carregar os destaques."; }
    console.error("featured:", err);
  }
})();
