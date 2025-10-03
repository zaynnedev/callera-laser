/* Supabase (sessão persiste) */
window.SUPABASE_URL = "https://rvwciizwcgnbqnhpbroq.supabase.co";
/* COLE A SUA ANON KEY EXATA ENTRE ASPAS ABAIXO */
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2d2NpaXp3Y2duYnFuaHBicm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjM1MjQsImV4cCI6MjA3Mzc5OTUyNH0.S5Hahp_dx-JNw7fDHPOqHVYZOClyNlLY9m4IdPnd87g";

window.SUPA = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

/* Helpers */
window.money = {
  fmtBRL(v){
    const n = Number(String(v).replace(/[^\d,.\-]/g,'').replace(/\./g,'').replace(',', '.')) || 0;
    return n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  },
  parseBRL(v){
    if(typeof v === 'number') return v;
    const clean = String(v).replace(/[^\d,.\-]/g,'').replace(/\./g,'').replace(',', '.');
    return Number(clean||0);
  }
};
window.whenBR = (iso)=> {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
};
