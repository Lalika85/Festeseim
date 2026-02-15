// INIT & DATA LOADING
let projects=[], shopItems=[], profile={}, savedQuotes=[], favorites=[];

try {
    // Load data
    projects = JSON.parse(localStorage.getItem('fn129_projects')) || JSON.parse(localStorage.getItem('fn127_projects')) || [];
    shopItems = JSON.parse(localStorage.getItem('fn129_shop')) || JSON.parse(localStorage.getItem('fn127_shop')) || [];
    profile = JSON.parse(localStorage.getItem('fn129_profile')) || JSON.parse(localStorage.getItem('fn127_profile')) || {name:'',address:'',tax:'',phone:'',email:'',bank:'',logo:null};
    savedQuotes = JSON.parse(localStorage.getItem('fn129_quotes')) || [];
    favorites = JSON.parse(localStorage.getItem('fn129_favs')) || ["Ragasztó", "Festék", "Gipszkarton", "Csavar", "Kábel", "Profil"];
} catch(e) { console.error("Load error:", e); }

let quoteItems = [];
let currentDetailId = null;
let tempShopImage = null;
let currentCalendarDate = new Date();
const calColors = ["#1a237e", "#c62828", "#2e7d32", "#f57f17", "#00838f", "#6a1b9a", "#ad1457", "#283593", "#4e342e", "#455a64"];
function getProjectColor(id) { return calColors[id % calColors.length]; }

window.onload = function() {
    renderDashboard();
    updateShopSelect();
    updateProfilePreview();
    renderSavedQuotes();
    document.getElementById('quote-date').valueAsDate = new Date();
    renderCalcInputs();
    renderCalendar(currentCalendarDate);
};

// --- NAVIGATION ---
function switchTab(id) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById('view-'+id).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    if(document.getElementById('btn-'+id)) document.getElementById('btn-'+id).classList.add('active');
    if(id === 'calendar') document.getElementById('btn-cal').classList.add('active');
    
    document.getElementById('header-share-btn').style.display = (id === 'shop') ? 'block' : 'none';
    if(id==='projects') filterProjects(); 
    if(id==='shop') renderShop(); 
    if(id==='calendar') renderCalendar(currentCalendarDate);
}
function showToast(msg) { const t=document.getElementById("toast"); t.innerText=msg; t.className="show"; setTimeout(()=>t.className="",3000); }

// --- CORE FUNCTIONS (FIXED) ---
function openDetail(id){ 
    currentDetailId = id; 
    const p = projects.find(x => x.id == id); 
    if(!p) return showToast('Hiba: Ügyfél nem található');
    
    document.getElementById('d-client').innerText = p.client || 'Névtelen'; 
    document.getElementById('d-address').innerText = p.address || '-'; 
    
    let badge = '';
    const st = p.status || 'active';
    if(st === 'active') badge = '<span class="badge bg-active">Elkezdett</span>';
    if(st === 'suspend') badge = '<span class="badge bg-suspend">Felfüggesztve</span>';
    if(st === 'done') badge = '<span class="badge bg-done">Befejezett</span>';
    document.getElementById('d-status-badge').innerHTML = badge;

    const btnCall=document.getElementById('btn-call'); 
    p.phone ? (btnCall.href='tel:'+p.phone,btnCall.style.opacity=1) : (btnCall.href='#',btnCall.style.opacity=0.5);
    
    const btnMail=document.getElementById('btn-mail'); 
    p.email ? (btnMail.href='mailto:'+p.email,btnMail.style.opacity=1) : (btnMail.href='#',btnMail.style.opacity=0.5);
    
    const mapLink = document.getElementById('map-link');
    // JAVÍTOTT LINK
    if(p.address){
        mapLink.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.address);
        mapLink.style.display = 'flex';
    } else {
        mapLink.style.display = 'none';
    }
    
    document.getElementById('d-rooms').innerHTML = (p.rooms||[]).map(r=>`<span class="room-tag">${r} <i class="fas fa-times" onclick="deleteRoom('${r}')" style="margin-left:5px;cursor:pointer;"></i></span>`).join(''); 
    
    renderDetailList(); 
    renderDocsList();
    
    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById('view-detail').style.display = 'flex'; 
}

function filterProjects() {
    const val = (document.getElementById('search-input').value || '').toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    
    const filtered = projects.filter(p => {
        if (statusFilter !== 'all' && (p.status||'active') !== statusFilter) return false;
        if (!val) return true;
        
        const c = (p.client||'').toLowerCase(); 
        const a = (p.address||'').toLowerCase(); 
        const ph = (p.phone||'').toLowerCase(); 
        const e = (p.email||'').toLowerCase();
        const n = (p.note||'').toLowerCase();
        
        return c.includes(val) || a.includes(val) || ph.includes(val) || e.includes(val) || n.includes(val);
    });
    
    document.getElementById('projects-list').innerHTML = filtered.map(p => {
        let badge = '';
        const st = p.status || 'active';
        if(st === 'active') badge = '<span class="badge bg-active">Elkezdett</span>';
        if(st === 'suspend') badge = '<span class="badge bg-suspend">Felfügg.</span>';
        if(st === 'done') badge = '<span class="badge bg-done">Befejezett</span>';
        return `<div class="card" onclick="openDetail(${p.id})" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
            <div>${badge}<div style="font-weight:bold; font-size:16px; color:var(--primary);">${p.client}</div><div style="font-size:13px; color:#78909c;">${p.address||'Nincs cím'}</div></div>
            <i class="fas fa-chevron-right" style="color:#cfd8dc;"></i>
        </div>`;
    }).join('');
}

// --- NEW PROJECT (EMPTY FORM) ---
function openNewProject() { 
    document.getElementById('inp-client').value=''; 
    document.getElementById('inp-phone').value=''; 
    document.getElementById('inp-email').value=''; 
    document.getElementById('inp-address').value=''; 
    document.getElementById('inp-note').value=''; 
    document.getElementById('inp-start').value=''; 
    document.getElementById('inp-end').value=''; 
    openModal('new-project-box'); 
}

function saveProject(){ 
    const n = document.getElementById('inp-client').value; 
    if(!n) return showToast('Név kötelező!'); 
    
    const status = document.getElementById('inp-status') ? document.getElementById('inp-status').value : 'active'; 
    
    projects.unshift({
        id: Date.now(),
        client: n,
        phone: document.getElementById('inp-phone').value,
        email: document.getElementById('inp-email').value,
        address: document.getElementById('inp-address').value,
        note: document.getElementById('inp-note').value,
        start: document.getElementById('inp-start').value,
        end: document.getElementById('inp-end').value, 
        status: status, 
        rooms: [], 
        docs: []
    }); 
    
    localStorage.setItem('fn129_projects', JSON.stringify(projects)); 
    closeModal(); 
    renderDashboard(); 
    switchTab('projects'); 
    updateShopSelect(); 
    showToast('Ügyfél létrehozva'); 
}

// --- CALENDAR ---
function changeMonth(delta) { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta); renderCalendar(currentCalendarDate); }
function renderCalendar(date) {
    const container = document.getElementById('calendar-days'); const monthNameEl = document.getElementById('cal-month-name'); const eventListEl = document.getElementById('calendar-event-list');
    container.innerHTML = ''; eventListEl.innerHTML = '';
    const year = date.getFullYear(); const month = date.getMonth();
    const monthNames = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
    monthNameEl.innerText = `${year} ${monthNames[month]}`;
    const firstDay = new Date(year, month, 1).getDay() || 7; const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for(let i=1; i<firstDay; i++) { container.innerHTML += `<div class="cal-day empty"></div>`; }
    for(let i=1; i<=daysInMonth; i++) {
        const currentDateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        let dayProjects = [];
        projects.forEach(p => { if(p.start && p.end && currentDateStr >= p.start && currentDateStr <= p.end) dayProjects.push(p); });
        let cls = 'cal-day'; if(new Date().toDateString() === new Date(year, month, i).toDateString()) cls += ' today';
        let dotsHtml = ''; if(dayProjects.length > 0) { dotsHtml = '<div class="cal-dots">'; dayProjects.forEach(dp => { dotsHtml += `<div class="cal-dot" style="background:${getProjectColor(dp.id)}"></div>`; }); dotsHtml += '</div>'; }
        container.innerHTML += `<div class="${cls}">${i}${dotsHtml}</div>`;
    }
    const mStart = `${year}-${String(month+1).padStart(2,'0')}-01`; const mEnd = `${year}-${String(month+1).padStart(2,'0')}-${daysInMonth}`;
    const relevantProjects = projects.filter(p => { if(!p.start || !p.end) return false; return (p.start <= mEnd && p.end >= mStart); });
    if(relevantProjects.length === 0) eventListEl.innerHTML = '<div style="text-align:center; color:#999; padding:10px;">Nincs munka.</div>';
    else relevantProjects.forEach(p => { let col = getProjectColor(p.id); eventListEl.innerHTML += `<div class="list-item" onclick="openDetail(${p.id})"><div><span style="display:inline-block;width:10px;height:10px;background:${col};border-radius:50%;margin-right:5px;"></span><b>${p.client}</b><br><small>${p.start} - ${p.end}</small></div><i class="fas fa-chevron-right" style="color:#ccc;"></i></div>`; });
}

// --- QUOTE LOGIC (NET/GROSS/VAT) ---
function addQuoteItem(){ 
    const n=document.getElementById('q-item-name').value; const q=parseFloat(document.getElementById('q-item-qty').value); const pInput=parseFloat(document.getElementById('q-item-price').value); const u=document.getElementById('q-item-unit').value; 
    const layers = document.getElementById('q-item-layers').value;
    const priceType = document.getElementById('q-price-type').value; 
    const vatRate = parseFloat(document.getElementById('q-vat-rate').value);

    if(!n||!q||!pInput)return showToast('Hiányos adatok!'); 
    
    let netPrice, grossPrice;
    if(priceType === 'net') {
        netPrice = pInput;
        grossPrice = pInput * (1 + vatRate/100);
    } else {
        grossPrice = pInput;
        netPrice = pInput / (1 + vatRate/100);
    }

    const totalNet = netPrice * q;
    const totalGross = grossPrice * q;

    quoteItems.push({
        name:n, qty:q, unit:u, layers: layers, 
        netPrice: netPrice, grossPrice: grossPrice, vatRate: vatRate,
        totalNet: totalNet, totalGross: totalGross
    }); 
    
    document.getElementById('q-item-name').value=''; document.getElementById('q-item-qty').value=''; document.getElementById('q-item-price').value=''; document.getElementById('q-item-layers').value='';
    renderQuoteItems(); 
}

function renderQuoteItems(){ 
    const c=document.getElementById('quote-items-container'); c.innerHTML=''; 
    let tNet=0, tGross=0; 
    
    quoteItems.forEach((i,x)=>{
        tNet += i.totalNet;
        tGross += i.totalGross;
        
        let layerInfo = i.layers ? ` <small style="color:#666;">(${i.layers} rtg.)</small>` : '';
        let vatLabel = i.vatRate === 0 ? "AAM/0%" : i.vatRate+"%";

        c.innerHTML+=`
        <div class="quote-row">
            <div style="flex:2"><b>${i.name}</b>${layerInfo}<br><small>${i.qty} ${i.unit}</small></div>
            <div style="flex:1; font-size:12px; text-align:right;">
                N: ${Math.round(i.netPrice).toLocaleString()}<br>
                B: ${Math.round(i.grossPrice).toLocaleString()}
            </div>
            <div style="flex:1; text-align:right; font-weight:bold;">${Math.round(i.totalGross).toLocaleString()} Ft</div>
            <i class="fas fa-times" style="color:red;margin-left:10px; cursor:pointer;" onclick="quoteItems.splice(${x},1);renderQuoteItems()"></i>
        </div>`;
    }); 
    
    document.getElementById('quote-grand-total').innerHTML = `
        <div style="font-size:14px; color:#666;">Nettó: ${Math.round(tNet).toLocaleString()} Ft</div>
        <div style="font-size:14px; color:#666;">ÁFA: ${Math.round(tGross - tNet).toLocaleString()} Ft</div>
        <div style="font-size:18px; color:var(--primary); font-weight:bold;">Bruttó: ${Math.round(tGross).toLocaleString()} Ft</div>
    `;
}

// --- SHOP & MISC ---
function addDocument(input) { if (input.files && input.files[0]) { const file = input.files[0]; if(file.size > 15000000) { alert("Max 15MB!"); return; } const reader = new FileReader(); reader.onload = function(e) { const p = projects.find(x => x.id == currentDetailId); if (!p.docs) p.docs = []; p.docs.push({ name: file.name, data: e.target.result, type: file.type }); localStorage.setItem('fn129_projects', JSON.stringify(projects)); renderDocsList(); showToast("Feltöltve!"); }; reader.readAsDataURL(file); } }
function renderDocsList() { const p = projects.find(x => x.id == currentDetailId); const list = document.getElementById('d-docs-list'); list.innerHTML = ''; if (!p.docs || p.docs.length === 0) { list.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;">Nincs dokumentum.</div>'; return; } p.docs.forEach((doc, idx) => { let icon = 'fa-file'; if(doc.type.includes('image')) icon = 'fa-file-image'; if(doc.type.includes('pdf')) icon = 'fa-file-pdf'; list.innerHTML += `<div class="doc-item"><i class="fas ${icon} doc-icon"></i><div class="doc-name">${doc.name}</div><a href="${doc.data}" download="${doc.name}" style="color:var(--primary); margin-right:15px;"><i class="fas fa-download"></i></a><i class="fas fa-trash" style="color:var(--danger); cursor:pointer;" onclick="deleteDoc(${idx})"></i></div>`; }); }
function deleteDoc(idx) { if(!confirm("Törlöd?")) return; const p = projects.find(x => x.id == currentDetailId); p.docs.splice(idx, 1); localStorage.setItem('fn129_projects', JSON.stringify(projects)); renderDocsList(); }

// Standard Utility Functions
function renderDashboard(){ document.getElementById('dashboard-list').innerHTML=projects.slice(0,3).map(p=>`<div class="card" onclick="openDetail(${p.id})" style="cursor:pointer;"><b>${p.client}</b></div>`).join(''); }
function addRoom(){ const v=document.getElementById('new-room-input').value; const s=document.getElementById('new-room-size').value; if(!v)return; const p=projects.find(x=>x.id==currentDetailId); if(!p.rooms)p.rooms=[]; p.rooms.push(s?`${v} (${s}m²)`:v); localStorage.setItem('fn129_projects',JSON.stringify(projects)); document.getElementById('new-room-input').value=''; openDetail(currentDetailId); }
function deleteRoom(r){ if(!confirm('Törlöd?'))return; const p=projects.find(x=>x.id==currentDetailId); p.rooms=p.rooms.filter(x=>x!==r); localStorage.setItem('fn129_projects',JSON.stringify(projects)); openDetail(currentDetailId); }
function deleteCurrentProject(){ if(!confirm('Törlöd?'))return; projects=projects.filter(x=>x.id!=currentDetailId); localStorage.setItem('fn129_projects',JSON.stringify(projects)); closeModal(); renderProjects(); renderDashboard(); }

// --- EDIT PROJECT (FIXED) ---
function openEditModal(){ 
    const p=projects.find(x=>x.id==currentDetailId); 
    openModal('detail-edit'); 
    document.getElementById('edit-client').value=p.client; 
    document.getElementById('edit-phone').value=p.phone||''; 
    document.getElementById('edit-email').value=p.email||''; 
    document.getElementById('edit-address').value=p.address||''; 
    document.getElementById('edit-note').value=p.note||''; 
    document.getElementById('edit-status').value=p.status||'active'; 
    document.getElementById('edit-start').value=p.start||''; 
    document.getElementById('edit-end').value=p.end||'';
}

function saveEdit(){ 
    const p=projects.find(x=>x.id==currentDetailId); 
    p.client=document.getElementById('edit-client').value; 
    p.phone=document.getElementById('edit-phone').value; 
    p.email=document.getElementById('edit-email').value; 
    p.address=document.getElementById('edit-address').value; 
    p.note=document.getElementById('edit-note').value; 
    p.status=document.getElementById('edit-status').value; 
    p.start=document.getElementById('edit-start').value; 
    p.end=document.getElementById('edit-end').value; 
    localStorage.setItem('fn129_projects',JSON.stringify(projects)); 
    closeModal(); 
    openDetail(currentDetailId); 
    showToast('Mentve'); 
}

function updateShopSelect() { const s=document.getElementById('shop-project-select'); s.innerHTML='<option value="">-- Raktár --</option>'+projects.map(p=>`<option value="${p.id}">${p.client}</option>`).join(''); }
function updateRoomSelectInShop() { const pid=document.getElementById('shop-project-select').value; const s=document.getElementById('shop-room-select'); s.innerHTML='<option value="">(Nincs)</option>'; if(pid){const p=projects.find(x=>x.id==pid);if(p&&p.rooms)s.innerHTML+=p.rooms.map(r=>`<option value="${r}">${r}</option>`).join('');} }
function goToShopForCurrentProject() { if(!currentDetailId) return; switchTab('shop'); setTimeout(()=>{const s=document.getElementById('shop-project-select'); if(s){s.value=currentDetailId; updateRoomSelectInShop();}},100); closeModal(); }
function addShopItem() { const txt=document.getElementById('shop-input').value; if(!txt)return showToast('Mit?'); const pId = document.getElementById('shop-project-select').value || null; const rId = document.getElementById('shop-room-select').value || null; shopItems.unshift({id:Date.now(),text:txt,qty:document.getElementById('shop-qty').value,code:document.getElementById('shop-code').value,note:document.getElementById('shop-note').value,image:tempShopImage,projectId: pId, room: rId, done:false}); localStorage.setItem('fn129_shop',JSON.stringify(shopItems)); document.getElementById('shop-input').value=''; document.getElementById('shop-photo-prev').style.display='none'; tempShopImage=null; showToast('Rögzítve'); renderShop(); }
function renderShop() { document.getElementById('shop-list').innerHTML=shopItems.map(i=>{let pTag='';if(i.projectId){const p=projects.find(x=>x.id==i.projectId);if(p)pTag=`<div style="font-size:11px;color:#1a237e;margin-top:2px;font-weight:bold;">${p.client} ${i.room?'• '+i.room:''}</div>`;}return `<div class="list-item ${i.done?'item-done':''}"><div style="display:flex;align-items:center;flex:1;"><div class="check-circle" onclick="toggleShop(${i.id})"><i class="fas fa-check" style="font-size:12px;"></i></div><div><div class="item-text" style="font-weight:bold;">${i.qty}x ${i.text} ${i.image?'📷':''}</div><div style="font-size:13px;color:#78909c;">${i.code||''} ${i.note||''}</div>${pTag}</div></div><i class="fas fa-trash" style="color:#cfd8dc;padding:10px;" onclick="delShop(${i.id})"></i></div>`;}).join(''); }
function toggleShop(id) { const i=shopItems.find(x=>x.id==id); i.done=!i.done; localStorage.setItem('fn129_shop',JSON.stringify(shopItems)); renderShop(); if(document.getElementById('view-detail').style.display === 'flex') renderDetailList(); }
function delShop(id) { shopItems=shopItems.filter(x=>x.id!=id); localStorage.setItem('fn129_shop',JSON.stringify(shopItems)); renderShop(); if(document.getElementById('view-detail').style.display === 'flex') renderDetailList(); }
function handleShopPhoto(i) { if(i.files&&i.files[0]){const r=new FileReader();r.onload=e=>{tempShopImage=e.target.result;document.getElementById('shop-photo-prev').src=tempShopImage;document.getElementById('shop-photo-prev').style.display='block';};r.readAsDataURL(i.files[0]);} }

// Modal & PDF
function openClientSelector() { document.getElementById('modal-overlay').style.display='block'; document.getElementById('client-selector-box').style.display='flex'; renderClientSelector(''); }
function renderClientSelector(filter) { const list = document.getElementById('client-selector-list'); list.innerHTML = ''; const f = filter.toLowerCase(); const matches = projects.filter(p => p.client.toLowerCase().includes(f)); matches.forEach(p => { list.innerHTML += `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="selectClientForQuote(${p.id})"><b>${p.client}</b><br><small>${p.address||''}</small></div>`; }); }
function selectClientForQuote(id) { const p = projects.find(x => x.id == id); document.getElementById('quote-client-name').value = p.client; document.getElementById('quote-client-address').value = p.address || ''; closeModal(); showToast('Ügyfél beillesztve!'); }
function handleLogoUpload(input) { if (input.files && input.files[0]) { const reader = new FileReader(); reader.onload = function(e) { profile.logo = e.target.result; localStorage.setItem('fn129_profile', JSON.stringify(profile)); updateProfilePreview(); }; reader.readAsDataURL(input.files[0]); } }
function saveProfile(){ profile.name=document.getElementById('prof-name').value; profile.address=document.getElementById('prof-address').value; profile.tax=document.getElementById('prof-tax').value; profile.phone=document.getElementById('prof-phone').value; profile.email=document.getElementById('prof-email').value; profile.bank=document.getElementById('prof-bank').value; localStorage.setItem('fn129_profile',JSON.stringify(profile)); updateProfilePreview(); closeModal(); showToast('Mentve'); }
function updateProfilePreview(){ const p=document.getElementById('quote-company-preview'); let html=profile.name?`<b>${profile.name}</b><br>${profile.phone}`:'<i>Nincs adat.</i>'; if(profile.logo){html=`<img src="${profile.logo}" style="max-height:40px;margin-bottom:5px;"><br>`+html; document.getElementById('logo-preview').src=profile.logo; document.getElementById('logo-preview-container').style.display='block';} p.innerHTML=html; }
function loadProfileInputs(){ document.getElementById('prof-name').value=profile.name; document.getElementById('prof-address').value=profile.address; document.getElementById('prof-tax').value=profile.tax; document.getElementById('prof-phone').value=profile.phone; document.getElementById('prof-email').value=profile.email; document.getElementById('prof-bank').value=profile.bank; if(profile.logo){document.getElementById('logo-preview').src=profile.logo; document.getElementById('logo-preview-container').style.display='block';} }

function createPDF(title,table,isQ,client){ 
    if(!profile.name)return showToast('Cégadat!'); 
    const {jsPDF}=window.jspdf; const doc=new jsPDF(); let y=20; 
    if(profile.logo){try{doc.addImage(profile.logo,'JPEG',14,15,30,30);y=55;}catch(e){}} 
    
    doc.setFillColor(26,35,126); doc.setFontSize(22); doc.setTextColor(26,35,126); doc.text(title,196,25,{align:'right'}); 
    doc.setTextColor(0,0,0); doc.setFontSize(10); doc.text("KIÁLLÍTÓ:",14,y); y+=5; 
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.text(profile.name,14,y); y+=5; 
    doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.text(profile.address,14,y); y+=5; 
    if(profile.tax){doc.text("Adószám: "+profile.tax,14,y);y+=5;} if(profile.phone){doc.text("Tel: "+profile.phone,14,y);y+=5;} if(profile.email){doc.text("Email: "+profile.email,14,y);y+=5;} if(profile.bank){doc.text("Bank: "+profile.bank,14,y);y+=5;} 
    
    if(client&&client.name){let cy=y-25; doc.text("MEGRENDELŐ:",120,cy); cy+=5; doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.text(client.name,120,cy); cy+=5; doc.setFont("helvetica","normal"); doc.setFontSize(10); if(client.address)doc.text(client.address,120,cy); if(client.date){cy+=10;doc.text("Dátum: "+client.date,120,cy);}} y=Math.max(y,100); 
    
    if(isQ) {
        const headers = [['Tétel', 'Menny.', 'Nettó Egységár', 'ÁFA', 'Bruttó Egységár', 'Bruttó Össz.']];
        const body = quoteItems.map(i => { let name = i.name + (i.layers ? ` (${i.layers} rtg.)` : ''); return [name, `${i.qty} ${i.unit}`, Math.round(i.netPrice).toLocaleString(), (i.vatRate === 0 ? "AAM" : i.vatRate + "%"), Math.round(i.grossPrice).toLocaleString(), Math.round(i.totalGross).toLocaleString()]; });
        doc.autoTable({startY:y, head:headers, body:body, theme:'grid', headStyles:{fillColor:[26,35,126]}}); 
        
        let finalY = doc.lastAutoTable.finalY + 10;
        const tNet = quoteItems.reduce((a,b)=>a+b.totalNet,0); const tGross = quoteItems.reduce((a,b)=>a+b.totalGross,0); const tVat = tGross - tNet;
        
        doc.setFontSize(10); 
        doc.text(`Nettó részösszeg: ${Math.round(tNet).toLocaleString()} Ft`, 196, finalY, {align:'right'}); 
        doc.text(`ÁFA tartalom: ${Math.round(tVat).toLocaleString()} Ft`, 196, finalY+5, {align:'right'}); 
        doc.setFontSize(14); doc.setFont("helvetica","bold"); 
        doc.text(`FIZETENDŐ VÉGÖSSZEG (BRUTTÓ): ${Math.round(tGross).toLocaleString()} Ft`, 196, finalY+12, {align:'right'});
    } else {
        doc.autoTable({startY:y,head:client.customHeaders?[client.customHeaders]:[['Anyag','Menny.','Infó']],body:table,theme:'grid',headStyles:{fillColor:[26,35,126]}}); 
    } 
    doc.save(title+".pdf"); showToast('Letöltve'); 
}

function generateProQuote(){ if(!quoteItems.length)return; createPDF("ÁRAJÁNLAT",quoteItems.map(i=>[i.name,i.qty+" "+i.unit,i.price,i.total]),true,{name:document.getElementById('quote-client-name').value,address:document.getElementById('quote-client-address').value,date:document.getElementById('quote-date').value}); }
function generateProjectPDF(){ if(!currentDetailId)return; const p=projects.find(x=>x.id==currentDetailId); const i=shopItems.filter(x=>x.projectId==currentDetailId); if(!i.length)return showToast('Üres'); createPDF("ANYAGLISTA",i.map(x=>[x.text,x.qty+" db",x.room||'-',x.code||'-']),false,{name:p.client,address:p.address,date:new Date().toLocaleDateString('hu-HU'),customHeaders:['Anyag','Menny.','Hely','Kód']}); }
function saveCurrentQuote(){ if(!quoteItems.length)return; const c=document.getElementById('quote-client-name').value||'Névtelen'; savedQuotes.unshift({id:Date.now(),client:c,date:document.getElementById('quote-date').value,total:quoteItems.reduce((a,b)=>a+b.totalGross,0),items:[...quoteItems]}); localStorage.setItem('fn129_quotes',JSON.stringify(savedQuotes)); renderSavedQuotes(); showToast('Mentve'); }
function renderSavedQuotes(){ document.getElementById('saved-quotes-list').innerHTML=savedQuotes.map(q=>`<div class="list-item"><div><b>${q.client}</b> ${Math.round(q.total).toLocaleString()} Ft</div><div><button onclick="loadQuote(${q.id})" style="border:none;background:none;color:var(--primary);"><i class="fas fa-upload"></i></button><button onclick="deleteQuote(${q.id})" style="border:none;background:none;color:var(--danger);"><i class="fas fa-trash"></i></button></div></div>`).join(''); }
function loadQuote(id){ const q=savedQuotes.find(x=>x.id==id); if(!q)return; quoteItems=[...q.items]; document.getElementById('quote-client-name').value=q.client; renderQuoteItems(); showToast('Betöltve'); }
function deleteQuote(id){ if(!confirm('?'))return; savedQuotes=savedQuotes.filter(x=>x.id!=id); localStorage.setItem('fn129_quotes',JSON.stringify(savedQuotes)); renderSavedQuotes(); }
function handleFavoriteClick(){const v=document.getElementById('shop-input').value;if(v&&!favorites.includes(v)){favorites.push(v);localStorage.setItem('fn129_favs',JSON.stringify(favorites));showToast('Kedvenc!');}else{document.getElementById('fav-list-container').innerHTML=favorites.map(f=>`<div style="padding:10px;" onclick="document.getElementById('shop-input').value='${f}';closeModal()">${f}</div>`).join('');openModal('fav-box');}}
function openItemEdit(id){const i=shopItems.find(x=>x.id==id);openModal('item-edit-box');document.getElementById('item-edit-id').value=i.id;document.getElementById('item-edit-text').value=i.text;document.getElementById('item-edit-qty').value=i.qty;document.getElementById('item-edit-code').value=i.code||'';document.getElementById('item-edit-note').value=i.note||'';}
function saveItemEdit(){const id=document.getElementById('item-edit-id').value;const i=shopItems.find(x=>x.id==id);i.text=document.getElementById('item-edit-text').value;i.qty=document.getElementById('item-edit-qty').value;i.code=document.getElementById('item-edit-code').value;i.note=document.getElementById('item-edit-note').value;localStorage.setItem('fn129_shop',JSON.stringify(shopItems));closeModal();renderShop();if(currentDetailId)renderDetailList();}
function closeModal(){document.querySelectorAll('.modal-box').forEach(e=>e.style.display='none');document.getElementById('modal-overlay').style.display='none';}
function openModal(id){document.getElementById('modal-overlay').style.display='block';document.getElementById(id).style.display='flex';if(id==='profile-box')loadProfileInputs();}
async function shareText(title, text) { if (navigator.share) { try { await navigator.share({ title: title, text: text }); return; } catch (err) {} } try { window.location.href = "intent:#Intent;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=" + encodeURIComponent(text) + ";end"; return; } catch (e) {} try { window.location.href = "median://share?text=" + encodeURIComponent(text); return; } catch(e){} const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert("Másolva!"); }
function shareShopList() { let t="BEVÁSÁRLÓLISTA:\n\n"; shopItems.forEach(i=>{if(!i.done)t+=`[ ] ${i.qty}x ${i.text} ${i.code?'('+i.code+')':''}\n`;}); shareText("Bevásárlólista",t); }
function shareProjectList() { const p=projects.find(x=>x.id==currentDetailId); const i=shopItems.filter(x=>x.projectId==currentDetailId); let t=`${p.client.toUpperCase()} - ANYAGOK:\n\n`; i.forEach(x=>t+=`- ${x.qty}x ${x.text} ${x.code?'('+x.code+')':''}\n`); shareText("Anyaglista",t); }
function renderCalcInputs() { const type = document.getElementById('calc-type').value; const c = document.getElementById('calc-inputs-container'); let html = `<div class="input-group"><label>Falfelület ($m^2$)</label><input type="number" id="calc-area" placeholder="Pl. 50"></div>`; if(type === 'paint') { html += `<div class="input-group"><label>Rétegek</label><input type="number" id="calc-layers" value="2"></div><div class="input-group"><label>Kiadósság ($m^2$/Liter)</label><input type="number" id="calc-coverage" value="10"></div><div class="input-group"><label>Kiszerelés (Liter)</label><input type="number" id="calc-pack" value="10"></div>`; } else { let thickDef="3", consDef="1.5", packDef="25", tLbl="Vastagság (mm)"; if(type==='adhesive'){thickDef="4";consDef="1.4";} if(type==='screed'){thickDef="50";consDef="2";} html += `<div class="input-group"><label>${tLbl}</label><input type="number" id="calc-thick" value="${thickDef}"></div><div class="input-group"><label>Anyagigény (kg / $m^2$ / 1mm)</label><input type="number" id="calc-cons" value="${consDef}"></div><div class="input-group"><label>Zsák mérete (kg)</label><input type="number" id="calc-pack" value="${packDef}"></div>`; } c.innerHTML = html; document.getElementById('calc-result-box').style.display='none'; }
function calculateMaterial() { const t=document.getElementById('calc-type').value; const a=parseFloat(document.getElementById('calc-area').value); const p=parseFloat(document.getElementById('calc-pack').value); if(!a||!p)return showToast('Minden mező kell!'); let res=0, unit=''; if(t==='paint') { const l=parseFloat(document.getElementById('calc-layers').value), c=parseFloat(document.getElementById('calc-coverage').value); res=(a*l)/c; unit="Liter"; } else { const th=parseFloat(document.getElementById('calc-thick').value), c=parseFloat(document.getElementById('calc-cons').value); res=a*th*c; unit="Kg"; } document.getElementById('calc-result-num').innerText = Math.ceil(res/p)+" db"; document.getElementById('calc-result-desc').innerText = `Össz: ${Math.ceil(res)} ${unit} (${p} ${unit}/csomag)`; document.getElementById('calc-result-box').style.display='block'; }
function exportData(){const d=JSON.stringify({p:projects,s:shopItems,pr:profile,q:savedQuotes});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:'text/json'}));a.download='festonaplo_backup.json';a.click();}
function importData(el){const fr=new FileReader();fr.onload=e=>{try{const d=JSON.parse(e.target.result);if(d.p){projects=d.p;shopItems=d.s;profile=d.pr;savedQuotes=d.q;localStorage.setItem('fn129_projects',JSON.stringify(projects));localStorage.setItem('fn129_shop',JSON.stringify(shopItems));localStorage.setItem('fn129_profile',JSON.stringify(profile));localStorage.setItem('fn129_quotes',JSON.stringify(savedQuotes));location.reload();}}catch(e){alert('Hiba!');}};fr.readAsText(el.files[0]);}
    </script>
</body>
</html>
