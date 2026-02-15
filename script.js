// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDtC-F2AoFspgfMZw35AJ_dKHzGqMWvTac",
    authDomain: "vallalkozoi-app.firebaseapp.com",
    projectId: "vallalkozoi-app",
    storageBucket: "vallalkozoi-app.firebasestorage.app",
    messagingSenderId: "636447035549",
    appId: "1:636447035549:web:86efa1a0ba9e86bb488474",
    measurementId: "G-KLG9X8ZVP4"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

var projects = [], shopItems = [], profile = {}, savedQuotes = [], favorites = [];
var currentDetailId = null;
var tempShopImage = null;
var currentCalendarDate = new Date();
var calColors = ["#1a237e", "#c62828", "#2e7d32", "#f57f17", "#00838f", "#6a1b9a", "#ad1457", "#283593", "#4e342e", "#455a64"];

function getProjectColor(id) { return calColors[id % calColors.length]; }

async function loadData() {
    try {
        console.log("Loading data from Firestore...");

        // Projects
        const projectsSnap = await getDocs(collection(db, "projects"));
        projects = [];
        projectsSnap.forEach(doc => projects.push(doc.data()));

        // MIGRATION CHECK: If Firestore is empty, try to load from localStorage and upload
        if (projects.length === 0) {
            console.log("Firestore empty. Checking localStorage for migration...");
            const localProjects = JSON.parse(localStorage.getItem('fn133_projects')) || JSON.parse(localStorage.getItem('fn131_projects'));
            if (localProjects && localProjects.length > 0) {
                console.log(`Migrating ${localProjects.length} projects...`);
                for (const p of localProjects) {
                    await setDoc(doc(db, "projects", String(p.id)), p);
                    projects.push(p);
                }
            }

            const localShop = JSON.parse(localStorage.getItem('fn133_shop')) || JSON.parse(localStorage.getItem('fn131_shop'));
            if (localShop && localShop.length > 0) {
                console.log(`Migrating ${localShop.length} shop items...`);
                for (const i of localShop) {
                    await setDoc(doc(db, "shopItems", String(i.id)), i);
                }
            }

            const localProfile = JSON.parse(localStorage.getItem('fn133_profile')) || JSON.parse(localStorage.getItem('fn131_profile'));
            if (localProfile) {
                console.log("Migrating profile...");
                await setDoc(doc(db, "settings", "profile"), localProfile);
            }

            const localQuotes = JSON.parse(localStorage.getItem('fn133_quotes'));
            if (localQuotes && localQuotes.length > 0) {
                console.log(`Migrating ${localQuotes.length} quotes...`);
                for (const q of localQuotes) {
                    await setDoc(doc(db, "quotes", String(q.id)), q);
                }
            }

            // Reload after migration to ensure consistent state
            if (projects.length > 0) window.showToast("Adatok migrálva!");
        }

        projects.sort((a, b) => b.id - a.id); // Descending ID sort (approx timestamp)

        // Shop Items
        const shopSnap = await getDocs(getUserRef("shopItems"));
        shopItems = [];
        shopSnap.forEach(doc => shopItems.push(doc.data()));
        shopItems.sort((a, b) => b.id - a.id);

        // Profile
        const profileSnap = await getDocs(getSettingsRef("profile")); // getDocs on a doc ref returns a query snapshot, need to adjust
        // Correct way to get a single document:
        const profileDoc = await getDocs(getSettingsRef("profile"));
        if (profileDoc.exists) profile = profileDoc.data();


        // Favorites
        const favDoc = await getDocs(getSettingsRef("favorites"));
        if (favDoc.exists) favorites = favDoc.data().items || [];

        // Quotes
        const quotesSnap = await getDocs(getUserRef("quotes"));
        savedQuotes = [];
        quotesSnap.forEach(doc => savedQuotes.push(doc.data()));
        savedQuotes.sort((a, b) => b.id - a.id);

        console.log("Data loaded");

        // Refresh UI after loading
        window.renderDashboard();
        window.updateShopSelect();
        window.updateProfilePreview();
        window.renderSavedQuotes();
        window.renderCalendar(currentCalendarDate);

    } catch (e) {
        console.error("Firestore loading error:", e);
        window.showToast("Hiba az adatok betöltésekor!");
    }
}

// --- Auth Functions ---
function loginWithEmail() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    if (!email || !pass) {
        errorDiv.innerText = "Kérlek töltsd ki mindkét mezőt!";
        errorDiv.style.display = 'block';
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            window.showToast("Sikeres bejelentkezés!");
            errorDiv.style.display = 'none';
        })
        .catch((error) => {
            console.error(error);
            let msg = "Hiba történt.";
            if (error.code === 'auth/wrong-password') msg = "Hibás jelszó.";
            if (error.code === 'auth/user-not-found') msg = "Nincs ilyen felhasználó.";
            if (error.code === 'auth/invalid-email') msg = "Érvénytelen email cím.";
            errorDiv.innerText = msg;
            errorDiv.style.display = 'block';
        });
}

function registerWithEmail() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    if (!email || !pass) {
        errorDiv.innerText = "Kérlek töltsd ki mindkét mezőt!";
        errorDiv.style.display = 'block';
        return;
    }
    if (pass.length < 6) {
        errorDiv.innerText = "A jelszó legalább 6 karakter legyen!";
        errorDiv.style.display = 'block';
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            window.showToast("Sikeres regisztráció!");
            errorDiv.style.display = 'none';
        })
        .catch((error) => {
            console.error(error);
            let msg = "Hiba történt.";
            if (error.code === 'auth/email-already-in-use') msg = "Ez az email már regisztrálva van.";
            if (error.code === 'auth/invalid-email') msg = "Érvénytelen email cím.";
            if (error.code === 'auth/weak-password') msg = "Túl gyenge jelszó.";
            errorDiv.innerText = msg;
            errorDiv.style.display = 'block';
        });
}

function logout() {
    firebase.auth().signOut().then(() => {
        window.showToast("Kijelentkezve.");
        window.location.reload(); // Reload to clear state
    }).catch((error) => console.error(error));
}estore loading error: ", e);
window.showToast("Hiba az adatok betöltésekor!");
    }
}

// --- Sync Functions (User Scoped) ---
const syncProject = async (p) => { try { if (currentUser) await setDoc(doc(getUserRef("projects"), String(p.id)), p); } catch (e) { console.error(e); } };
const syncShop = async (i) => { try { if (currentUser) await setDoc(doc(getUserRef("shopItems"), String(i.id)), i); } catch (e) { console.error(e); } };
const syncProfile = async () => { try { if (currentUser) await setDoc(getSettingsRef("profile"), profile); } catch (e) { console.error(e); } };
const syncFavorites = async () => { try { if (currentUser) await setDoc(getSettingsRef("favorites"), { items: favorites }); } catch (e) { console.error(e); } };
const syncQuote = async (q) => { try { if (currentUser) await setDoc(doc(getUserRef("quotes"), String(q.id)), q); } catch (e) { console.error(e); } };
const removeProject = async (id) => { try { if (currentUser) await deleteDoc(doc(getUserRef("projects"), String(id))); } catch (e) { console.error(e); } };
const removeShop = async (id) => { try { if (currentUser) await deleteDoc(doc(getUserRef("shopItems"), String(id))); } catch (e) { console.error(e); } };
const removeQuote = async (id) => { try { if (currentUser) await deleteDoc(doc(getUserRef("quotes"), String(id))); } catch (e) { console.error(e); } };


window.onload = function () {
    // UI Init
    bindEvents();
    if (document.getElementById('quote-date')) document.getElementById('quote-date').valueAsDate = new Date();
    window.renderCalcInputs();
    window.showToast("Napló v14.0 (Auth)");

    // Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Logged In
            currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-content').style.display = 'block';
            document.getElementById('user-display').innerText = user.email;
            await window.loadData();
        } else {
            // Logged Out
            currentUser = null;
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
        }
    });

    // Login/Register Buttons
    document.getElementById('btn-login-email').addEventListener('click', loginWithEmail);
    document.getElementById('btn-register-email').addEventListener('click', registerWithEmail);
};

function bindEvents() {
    // Header
    document.getElementById('header-share-btn').addEventListener('click', () => window.shareCurrentShopList());
    document.getElementById('header-backup-btn').addEventListener('click', () => window.openModal('backup-box'));
    document.getElementById('header-logout-btn').addEventListener('click', logout);

    // Navbar
    document.getElementById('btn-dash').addEventListener('click', () => window.switchTab('dashboard'));
    document.getElementById('btn-proj').addEventListener('click', () => window.switchTab('projects'));
    document.getElementById('fab-new-project').addEventListener('click', () => window.openNewProject());
    document.getElementById('btn-cal').addEventListener('click', () => window.switchTab('calendar'));
    document.getElementById('btn-quote').addEventListener('click', () => window.switchTab('quote'));
    document.getElementById('btn-shop').addEventListener('click', () => window.switchTab('shop'));

    // Dashboard
    document.getElementById('dash-card-quote').addEventListener('click', () => window.switchTab('quote'));
    document.getElementById('dash-card-calc').addEventListener('click', () => window.switchTab('calc'));

    // Calendar
    document.getElementById('sync-google-calendar').addEventListener('click', () => {
        window.open('http://192.168.10.36.nip.io:3000/auth', '_blank');
    });
}

window.switchTab = function (id) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById('view-' + id).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    if (document.getElementById('btn-' + id)) document.getElementById('btn-' + id).classList.add('active');
    if (id === 'calendar') document.getElementById('btn-cal').classList.add('active');

    const shareBtn = document.getElementById('header-share-btn');
    if (shareBtn) {
        if (id === 'shop') {
            shareBtn.classList.remove('hidden');
        } else {
            shareBtn.classList.add('hidden');
        }
    }
    if (id === 'projects') window.filterProjects();
    if (id === 'shop') window.renderShop();
    if (id === 'calendar') window.renderCalendar(currentCalendarDate);
};

window.showToast = function (msg) { const t = document.getElementById("toast"); t.innerText = msg; t.className = "show"; setTimeout(() => t.className = "", 3000); }

window.fetchGoogleCalendarEvents = async function () {
    try {
        const response = await fetch('http://192.168.10.36.nip.io:3000/events');
        if (!response.ok) {
            // Don't show an error toast, as the user might not be logged in
            console.error('Error fetching Google Calendar events:', response.statusText);
            return [];
        }
        const events = await response.json();
        return events;
    } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        return [];
    }
}

window.syncProjectToCalendar = async function (p) {
    if (!p.start || !p.end) return;

    const eventData = {
        summary: p.client + " (Munka)",
        description: `Cím: ${p.address || '-'}\nTel: ${p.phone || '-'}\nJegyzet: ${p.note || '-'}`,
        start: p.start,
        end: p.end
    };

    try {
        let url = 'http://192.168.10.36.nip.io:3000/events';
        let method = 'POST';

        if (p.googleEventId) {
            url += '/' + p.googleEventId;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });

        if (response.ok) {
            const data = await response.json();
            if (data.id && !p.googleEventId) {
                p.googleEventId = data.id;
                syncProject(p); // Save Google ID to Firestore
            }
            console.log("Calendar sync success:", method);
            window.showToast("Naptár szinkronizálva!");
        } else {
            console.error("Calendar sync failed");
        }
    } catch (e) {
        console.error("Calendar sync error:", e);
    }
}

window.openDetail = function (id) {
    currentDetailId = id;
    const p = projects.find(x => x.id == id);
    if (!p) return window.showToast('Hiba: Ügyfél nem található');

    document.getElementById('d-client').innerText = p.client || 'Névtelen';
    document.getElementById('d-address').innerText = p.address || '-';

    let badge = '';
    const st = p.status || 'active';
    if (st === 'active') badge = '<span class="badge bg-active">Elkezdett</span>';
    if (st === 'suspend') badge = '<span class="badge bg-suspend">Felfüggesztve</span>';
    if (st === 'done') badge = '<span class="badge bg-done">Befejezett</span>';
    document.getElementById('d-status-badge').innerHTML = badge;

    const btnCall = document.getElementById('btn-call');
    p.phone ? (btnCall.href = 'tel:' + p.phone, btnCall.style.opacity = 1) : (btnCall.href = '#', btnCall.style.opacity = 0.5);

    const btnMail = document.getElementById('btn-mail');
    p.email ? (btnMail.href = 'mailto:' + p.email, btnMail.style.opacity = 1) : (btnMail.href = '#', btnMail.style.opacity = 0.5);

    const mapLink = document.getElementById('map-link');
    // JAVÍTOTT TÉRKÉP LINK (Szabványos Google Maps URL)
    if (p.address) {
        mapLink.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.address);
        mapLink.style.display = 'flex';
    } else {
        mapLink.style.display = 'none';
    }

    document.getElementById('d-rooms').innerHTML = (p.rooms || []).map(r => `<span class="room-tag">${r} <i class="fas fa-times" onclick="window.deleteRoom('${r}')" style="margin-left:5px;cursor:pointer;"></i></span>`).join('');

    window.renderDetailList();
    window.renderDocsList();

    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById('view-detail').style.display = 'flex';
};

window.filterProjects = function () {
    const searchInput = document.getElementById('search-input');
    const val = (searchInput ? searchInput.value : '').toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;

    const filtered = projects.filter(p => {
        if (statusFilter !== 'all' && (p.status || 'active') !== statusFilter) return false;
        if (!val) return true;
        const c = (p.client || '').toLowerCase(); const a = (p.address || '').toLowerCase(); const ph = (p.phone || '').toLowerCase(); const e = (p.email || '').toLowerCase();
        return c.includes(val) || a.includes(val) || ph.includes(val) || e.includes(val);
    });

    document.getElementById('projects-list').innerHTML = filtered.map(p => {
        let badge = '';
        const st = p.status || 'active';
        if (st === 'active') badge = '<span class="badge bg-active">Elkezdett</span>';
        if (st === 'suspend') badge = '<span class="badge bg-suspend">Felfügg.</span>';
        if (st === 'done') badge = '<span class="badge bg-done">Befejezett</span>';
        return `<div class="card" onclick="window.openDetail(${p.id})">
                    <div>${badge}<div style="font-weight:bold; font-size:16px; color:var(--primary);">${p.client}</div><div style="font-size:13px; color:#78909c;">${p.address || 'Nincs cím'}</div></div>
                    <i class="fas fa-chevron-right" style="color:#cfd8dc;"></i>
                </div>`;
    }).join('');
};

window.openNewProject = function () {
    document.getElementById('inp-client').value = ''; document.getElementById('inp-phone').value = ''; document.getElementById('inp-email').value = ''; document.getElementById('inp-address').value = ''; document.getElementById('inp-note').value = ''; document.getElementById('inp-start').value = ''; document.getElementById('inp-end').value = ''; window.openModal('new-project-box');
};

window.saveProject = function () {
    const n = document.getElementById('inp-client').value;
    if (!n) return window.showToast('Név kötelező!');
    const status = document.getElementById('inp-status') ? document.getElementById('inp-status').value : 'active';
    const newProject = { id: Date.now(), client: n, phone: document.getElementById('inp-phone').value, email: document.getElementById('inp-email').value, address: document.getElementById('inp-address').value, note: document.getElementById('inp-note').value, start: document.getElementById('inp-start').value, end: document.getElementById('inp-end').value, status: status, rooms: [], docs: [] };
    projects.unshift(newProject);
    syncProject(newProject);
    window.syncProjectToCalendar(newProject); // SYNC TO GOOGLE
    window.closeModal(); window.renderDashboard(); window.switchTab('projects'); window.updateShopSelect(); window.showToast('Ügyfél létrehozva');
};

window.openEditModal = function () {
    const p = projects.find(x => x.id == currentDetailId);
    if (!p) return;
    document.getElementById('modal-overlay-edit').style.display = 'block';
    document.getElementById('detail-edit').style.display = 'flex';
    document.getElementById('edit-client').value = p.client;
    document.getElementById('edit-phone').value = p.phone || '';
    document.getElementById('edit-email').value = p.email || '';
    document.getElementById('edit-address').value = p.address || '';
    document.getElementById('edit-note').value = p.note || '';
    document.getElementById('edit-status').value = p.status || 'active';
    document.getElementById('edit-start').value = p.start || '';
    document.getElementById('edit-end').value = p.end || '';
};

window.closeEditModal = function () {
    document.getElementById('modal-overlay-edit').style.display = 'none';
    document.getElementById('detail-edit').style.display = 'none';
};

window.saveEdit = function () {
    const p = projects.find(x => x.id == currentDetailId);
    if (!p) return;
    p.client = document.getElementById('edit-client').value;
    p.phone = document.getElementById('edit-phone').value;
    p.email = document.getElementById('edit-email').value;
    p.address = document.getElementById('edit-address').value;
    p.note = document.getElementById('edit-note').value;
    p.status = document.getElementById('edit-status').value;
    p.start = document.getElementById('edit-start').value;
    p.end = document.getElementById('edit-end').value;
    syncProject(p);
    window.syncProjectToCalendar(p); // SYNC TO GOOGLE
    window.closeModal();
    window.openDetail(currentDetailId);
    window.showToast('Mentve');
};

window.changeMonth = function (delta) { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta); window.renderCalendar(currentCalendarDate); };
window.renderCalendar = async function (date) {
    const container = document.getElementById('calendar-days'); const monthNameEl = document.getElementById('cal-month-name'); const eventListEl = document.getElementById('calendar-event-list');
    if (!container) return;
    container.innerHTML = ''; eventListEl.innerHTML = '';
    const year = date.getFullYear(); const month = date.getMonth();
    const monthNames = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
    monthNameEl.innerText = `${year} ${monthNames[month]}`;
    const firstDay = new Date(year, month, 1).getDay() || 7; const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i < firstDay; i++) { container.innerHTML += `<div class="cal-day empty"></div>`; }

    const googleEvents = await window.fetchGoogleCalendarEvents();

    for (let i = 1; i <= daysInMonth; i++) {
        const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let dayProjects = [];
        projects.forEach(p => { if (p.start && p.end && currentDateStr >= p.start && currentDateStr <= p.end) dayProjects.push({ id: p.id, client: p.client, start: p.start, end: p.end, type: 'project' }); });

        googleEvents.forEach(event => {
            const eventStartDate = new Date(event.start.dateTime || event.start.date).toISOString().slice(0, 10);
            if (eventStartDate === currentDateStr) {
                dayProjects.push({ id: event.id, client: event.summary, start: eventStartDate, end: eventStartDate, type: 'google' });
            }
        });

        let cls = 'cal-day'; if (new Date().toDateString() === new Date(year, month, i).toDateString()) cls += ' today';
        let dotsHtml = ''; if (dayProjects.length > 0) {
            dotsHtml = '<div class="cal-dots">'; dayProjects.forEach(dp => {
                const color = dp.type === 'project' ? getProjectColor(dp.id) : '#4285F4'; // Google blue for google events
                dotsHtml += `<div class="cal-dot" style="background:${color}"></div>`;
            }); dotsHtml += '</div>';
        }
        container.innerHTML += `<div class="${cls}">${i}${dotsHtml}</div>`;
    }
    const mStart = `${year}-${String(month + 1).padStart(2, '0')}-01`; const mEnd = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;

    const relevantProjects = projects.filter(p => { if (!p.start || !p.end) return false; return (p.start <= mEnd && p.end >= mStart); });
    const relevantGoogleEvents = googleEvents.filter(event => {
        const eventStartDate = new Date(event.start.dateTime || event.start.date).toISOString().slice(0, 10);
        return eventStartDate >= mStart && eventStartDate <= mEnd;
    });

    let allEvents = [];
    relevantProjects.forEach(p => allEvents.push({ id: p.id, client: p.client, start: p.start, end: p.end, type: 'project', date: p.start }));
    relevantGoogleEvents.forEach(e => allEvents.push({ id: e.id, client: e.summary, start: (e.start.dateTime || e.start.date), end: (e.end.dateTime || e.end.date), type: 'google', date: (e.start.dateTime || e.start.date) }));

    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (allEvents.length === 0) eventListEl.innerHTML = '<div style="text-align:center; color:#999; padding:10px;">Nincs munka.</div>';
    else allEvents.forEach(e => {
        let col = e.type === 'project' ? getProjectColor(e.id) : '#4285F4';
        const startTime = e.start ? new Date(e.start).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : '';
        const endTime = e.end ? new Date(e.end).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : '';
        const timeRange = e.type === 'project' ? `${e.start} - ${e.end}` : `${startTime} - ${endTime}`;

        eventListEl.innerHTML += `<div class="list-item" onclick="${e.type === 'project' ? `window.openDetail(${e.id})` : ''}"><div><span style="display:inline-block;width:10px;height:10px;background:${col};border-radius:50%;margin-right:5px;"></span><b>${e.client}</b><br><small>${timeRange}</small></div><i class="fas fa-chevron-right" style="color:#ccc; display: ${e.type === 'project' ? 'block' : 'none'};"></i></div>`;
    });
};

window.addQuoteItem = function () {
    const n = document.getElementById('q-item-name').value; const q = parseFloat(document.getElementById('q-item-qty').value); const pInput = parseFloat(document.getElementById('q-item-price').value); const u = document.getElementById('q-item-unit').value; const layers = document.getElementById('q-item-layers').value; const priceType = document.getElementById('q-price-type').value; const vatRate = parseFloat(document.getElementById('q-vat-rate').value);
    if (!n || !q || !pInput) return window.showToast('Hiányos adatok!');
    let netPrice, grossPrice;
    if (priceType === 'net') { netPrice = pInput; grossPrice = pInput * (1 + vatRate / 100); } else { grossPrice = pInput; netPrice = pInput / (1 + vatRate / 100); }
    const totalNet = netPrice * q; const totalGross = grossPrice * q;
    quoteItems.push({ name: n, qty: q, unit: u, layers: layers, netPrice: netPrice, grossPrice: grossPrice, vatRate: vatRate, totalNet: totalNet, totalGross: totalGross });
    document.getElementById('q-item-name').value = ''; document.getElementById('q-item-qty').value = ''; document.getElementById('q-item-price').value = ''; document.getElementById('q-item-layers').value = '';
    window.renderQuoteItems();
};

window.renderQuoteItems = function () {
    const c = document.getElementById('quote-items-container'); c.innerHTML = ''; let tNet = 0, tGross = 0;
    quoteItems.forEach((i, x) => { tNet += i.totalNet; tGross += i.totalGross; let layerInfo = i.layers ? ` <small style="color:#666;">(${i.layers} rtg.)</small>` : ''; c.innerHTML += `<div class="quote-row"><div style="flex:2"><b>${i.name}</b>${layerInfo}<br><small>${i.qty} ${i.unit}</small></div><div style="flex:1; font-size:12px; text-align:right;">N: ${Math.round(i.netPrice).toLocaleString()}<br>B: ${Math.round(i.grossPrice).toLocaleString()}</div><div style="flex:1; text-align:right; font-weight:bold;">${Math.round(i.totalGross).toLocaleString()} Ft</div><i class="fas fa-times" style="color:red;margin-left:10px; cursor:pointer;" onclick="window.deleteQuoteItem(${x})"></i></div>`; });
    document.getElementById('quote-grand-total').innerHTML = `<div style="font-size:14px; color:#666;">Nettó: ${Math.round(tNet).toLocaleString()} Ft</div><div style="font-size:14px; color:#666;">ÁFA: ${Math.round(tGross - tNet).toLocaleString()} Ft</div><div style="font-size:18px; color:var(--primary); font-weight:bold;">Bruttó: ${Math.round(tGross).toLocaleString()} Ft</div>`;
};

window.deleteQuoteItem = function (index) {
    quoteItems.splice(index, 1);
    window.renderQuoteItems();
};

window.saveCurrentQuote = function () { if (!quoteItems.length) return; const c = document.getElementById('quote-client-name').value || 'Névtelen'; const newQuote = { id: Date.now(), client: c, date: document.getElementById('quote-date').value, total: quoteItems.reduce((a, b) => a + b.totalGross, 0), items: [...quoteItems] }; savedQuotes.unshift(newQuote); syncQuote(newQuote); window.renderSavedQuotes(); window.showToast('Mentve'); };
window.renderSavedQuotes = function () { document.getElementById('saved-quotes-list').innerHTML = savedQuotes.map(q => `<div class="list-item"><div><b>${q.client}</b> ${Math.round(q.total).toLocaleString()} Ft</div><div><button onclick="window.loadQuote(${q.id})" style="border:none;background:none;color:var(--primary);"><i class="fas fa-upload"></i></button><button onclick="window.deleteQuote(${q.id})" style="border:none;background:none;color:var(--danger);"><i class="fas fa-trash"></i></button></div></div>`).join(''); };
window.loadQuote = function (id) { const q = savedQuotes.find(x => x.id == id); if (!q) return; quoteItems = [...q.items]; document.getElementById('quote-client-name').value = q.client; window.renderQuoteItems(); window.showToast('Betöltve'); };
window.deleteQuote = function (id) { if (!confirm('?')) return; savedQuotes = savedQuotes.filter(x => x.id != id); removeQuote(id); window.renderSavedQuotes(); };

window.generateProQuote = function () { if (!quoteItems.length) return; window.createPDF("ÁRAJÁNLAT", quoteItems.map(i => [i.name, i.qty + " " + i.unit, i.price, i.total]), true, { name: document.getElementById('quote-client-name').value, address: document.getElementById('quote-client-address').value, date: document.getElementById('quote-date').value }); };
window.createPDF = function (title, table, isQ, client) { if (!profile.name) return window.showToast('Cégadat!'); const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20; if (profile.logo) { try { doc.addImage(profile.logo, 'JPEG', 14, 15, 30, 30); y = 55; } catch (e) { } } doc.setFillColor(26, 35, 126); doc.setFontSize(22); doc.setTextColor(26, 35, 126); doc.text(title, 196, 25, { align: 'right' }); doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.text("KIÁLLÍTÓ:", 14, y); y += 5; doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(profile.name, 14, y); y += 5; doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(profile.address, 14, y); y += 5; if (profile.tax) { doc.text("Adószám: " + profile.tax, 14, y); y += 5; } if (profile.phone) { doc.text("Tel: " + profile.phone, 14, y); y += 5; } if (profile.email) { doc.text("Email: " + profile.email, 14, y); y += 5; } if (profile.bank) { doc.text("Bank: " + profile.bank, 14, y); y += 5; } if (client && client.name) { let cy = y - 25; doc.text("MEGRENDELŐ:", 120, cy); cy += 5; doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(client.name, 120, cy); cy += 5; doc.setFont("helvetica", "normal"); doc.setFontSize(10); if (client.address) doc.text(client.address, 120, cy); if (client.date) { cy += 10; doc.text("Dátum: " + client.date, 120, cy); } } y = Math.max(y, 100); if (isQ) { const headers = [['Tétel', 'Menny.', 'Nettó Egységár', 'ÁFA', 'Bruttó Egységár', 'Bruttó Össz.']]; const body = quoteItems.map(i => { let name = i.name + (i.layers ? ` (${i.layers} rtg.)` : ''); return [name, `${i.qty} ${i.unit}`, Math.round(i.netPrice).toLocaleString(), (i.vatRate === 0 ? "AAM" : i.vatRate + "%"), Math.round(i.grossPrice).toLocaleString(), Math.round(i.totalGross).toLocaleString()]; }); doc.autoTable({ startY: y, head: headers, body: body, theme: 'grid', headStyles: { fillColor: [26, 35, 126] } }); let finalY = doc.lastAutoTable.finalY + 10; const tNet = quoteItems.reduce((a, b) => a + b.totalNet, 0); const tGross = quoteItems.reduce((a, b) => a + b.totalGross, 0); const tVat = tGross - tNet; doc.setFontSize(10); doc.text(`Nettó részösszeg:`, 140, finalY); doc.text(`${Math.round(tNet).toLocaleString()} Ft`, 196, finalY, { align: 'right' }); finalY += 7; doc.text(`ÁFA (${quoteItems[0].vatRate}%):`, 140, finalY); doc.text(`${Math.round(tVat).toLocaleString()} Ft`, 196, finalY, { align: 'right' }); finalY += 7; doc.setFont("helvetica", "bold"); doc.text(`Bruttó végösszeg:`, 140, finalY); doc.text(`${Math.round(tGross).toLocaleString()} Ft`, 196, finalY, { align: 'right' }); } else { const headers = [client.customHeaders || ['Anyag', 'Mennyiség', 'Helyiség', 'Kód']]; const body = table.map(row => row); doc.autoTable({ startY: y, head: headers, body: body, theme: 'grid', headStyles: { fillColor: [26, 35, 126] } }); } doc.save(`${title.toLowerCase()}_${client.name.replace(' ', '_')}.pdf`); }

// GENERIC HELPERS
function shareText(title, text) { if (navigator.share) { navigator.share({ title: title, text: text }).catch(console.error); } else { alert('A megosztás nem támogatott ezen a böngészőn.'); } }
window.openClientSelector = function () { window.renderClientSelector(''); window.openModal('client-selector-box'); }
window.renderClientSelector = function (filter) { document.getElementById('client-selector-list').innerHTML = projects.filter(p => (p.client || '').toLowerCase().includes(filter.toLowerCase())).map(p => `<div class="list-item" onclick="window.selectClientForQuote('${p.client}','${p.address}')"><b>${p.client}</b><br><small>${p.address}</small></div>`).join(''); }
window.selectClientForQuote = function (c, a) { document.getElementById('quote-client-name').value = c; document.getElementById('quote-client-address').value = a; window.closeModal(); }

window.loadProfileInputs = function () { document.getElementById('prof-name').value = profile.name; document.getElementById('prof-address').value = profile.address; document.getElementById('prof-tax').value = profile.tax; document.getElementById('prof-phone').value = profile.phone; document.getElementById('prof-email').value = profile.email; document.getElementById('prof-bank').value = profile.bank; if (profile.logo) { document.getElementById('logo-preview').src = profile.logo; document.getElementById('logo-preview-container').style.display = 'block'; } };
window.saveProfile = function () { profile.name = document.getElementById('prof-name').value; profile.address = document.getElementById('prof-address').value; profile.tax = document.getElementById('prof-tax').value; profile.phone = document.getElementById('prof-phone').value; profile.email = document.getElementById('prof-email').value; profile.bank = document.getElementById('prof-bank').value; syncProfile(); window.showToast('Mentve'); window.closeModal(); window.updateProfilePreview(); };
window.updateProfilePreview = function () { document.getElementById('quote-company-preview').innerHTML = `${profile.name ? `<b>${profile.name}</b>` : ''}<br>${profile.address || ''}<br>${profile.tax || ''}`; }
window.handleLogoUpload = function (input) { if (input.files && input.files[0]) { const reader = new FileReader(); reader.onload = function (e) { profile.logo = e.target.result; document.getElementById('logo-preview').src = e.target.result; document.getElementById('logo-preview-container').style.display = 'block'; window.showToast("Logó mentve!"); }; reader.readAsDataURL(input.files[0]); } };

window.closeModal = function () { document.querySelectorAll('.modal-box').forEach(e => e.style.display = 'none'); document.getElementById('modal-overlay').style.display = 'none'; };
window.openModal = function (id) { document.getElementById('modal-overlay').style.display = 'block'; document.getElementById(id).style.display = 'flex'; if (id === 'profile-box') window.loadProfileInputs(); };
window.handleFavoriteClick = function () { const v = document.getElementById('shop-input').value; if (v && !favorites.includes(v)) { favorites.push(v); syncFavorites(); window.showToast('Kedvenc!'); } else { document.getElementById('fav-list-container').innerHTML = favorites.map(f => `<div style="padding:10px;" onclick="document.getElementById('shop-input').value='${f}';window.closeModal()">${f}</div>`).join(''); window.openModal('fav-box'); } };
window.addDocument = function (input) { if (input.files && input.files[0]) { const file = input.files[0]; if (file.size > 15000000) { alert("Max 15MB!"); return; } const reader = new FileReader(); reader.onload = function (e) { const p = projects.find(x => x.id == currentDetailId); if (!p.docs) p.docs = []; p.docs.push({ name: file.name, data: e.target.result, type: file.type }); syncProject(p); window.renderDocsList(); window.showToast("Feltöltve!"); }; reader.readAsDataURL(file); } };
window.renderDocsList = function () { const p = projects.find(x => x.id == currentDetailId); const list = document.getElementById('d-docs-list'); list.innerHTML = ''; if (!p.docs || p.docs.length === 0) { list.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;">Nincs dokumentum.</div>'; return; } p.docs.forEach((doc, idx) => { let icon = 'fa-file'; if (doc.type.includes('image')) icon = 'fa-file-image'; if (doc.type.includes('pdf')) icon = 'fa-file-pdf'; list.innerHTML += `<div class="doc-item"><i class="fas ${icon} doc-icon"></i><div class="doc-name">${doc.name}</div><a href="${doc.data}" download="${doc.name}" style="color:var(--primary); margin-right:15px;"><i class="fas fa-download"></i></a><i class="fas fa-trash" style="color:var(--danger); cursor:pointer;" onclick="window.deleteDoc(${idx})"></i></div>`; }); }
window.deleteDoc = function (idx) { if (!confirm("Törlöd?")) return; const p = projects.find(x => x.id == currentDetailId); p.docs.splice(idx, 1); syncProject(p); window.renderDocsList(); };
window.addRoom = function () { const v = document.getElementById('new-room-input').value; const s = document.getElementById('new-room-size').value; if (!v) return; const p = projects.find(x => x.id == currentDetailId); if (!p.rooms) p.rooms = []; p.rooms.push(s ? `${v} (${s}m²)` : v); syncProject(p); document.getElementById('new-room-input').value = ''; window.openDetail(currentDetailId); };
window.deleteRoom = function (r) { if (!confirm('Törlöd?')) return; const p = projects.find(x => x.id == currentDetailId); p.rooms = p.rooms.filter(x => x !== r); syncProject(p); window.openDetail(currentDetailId); };
window.deleteCurrentProject = function () {
    if (!confirm('Törlöd?')) return;
    const p = projects.find(x => x.id == currentDetailId);
    if (p && p.googleEventId) {
        fetch('http://192.168.10.36.nip.io:3000/events/' + p.googleEventId, { method: 'DELETE' }).catch(console.error);
    }
    removeProject(currentDetailId);
    projects = projects.filter(x => x.id != currentDetailId);
    window.closeModal(); window.renderDashboard(); window.switchTab('projects');
};

window.renderDashboard = function () { document.getElementById('dashboard-list').innerHTML = projects.slice(0, 3).map(p => `<div class="card" onclick="window.openDetail(${p.id})" style="cursor:pointer;"><b>${p.client}</b></div>`).join(''); }
window.renderCalcInputs = function () { const type = document.getElementById('calc-type').value; const c = document.getElementById('calc-inputs-container'); let html = `<div class="input-group"><label>Falfelület ($m^2$)</label><input type="number" id="calc-area" placeholder="Pl. 50"></div>`; if (type === 'paint') { html += `<div class="input-group"><label>Rétegek</label><input type="number" id="calc-layers" value="2"></div><div class="input-group"><label>Kiadósság ($m^2$/Liter)</label><input type="number" id="calc-coverage" value="10"></div><div class="input-group"><label>Kiszerelés (Liter)</label><input type="number" id="calc-pack" value="10"></div>`; } else { let thickDef = "3", consDef = "1.5", packDef = "25", tLbl = "Vastagság (mm)"; if (type === 'adhesive') { thickDef = "4"; consDef = "1.4"; } if (type === 'screed') { thickDef = "50"; consDef = "2"; } html += `<div class="input-group"><label>${tLbl}</label><input type="number" id="calc-thick" value="${thickDef}"></div><div class="input-group"><label>Anyagigény (kg / $m^2$ / 1mm)</label><input type="number" id="calc-cons" value="${consDef}"></div><div class="input-group"><label>Zsák mérete (kg)</label><input type="number" id="calc-pack" value="${packDef}"></div>`; } c.innerHTML = html; document.getElementById('calc-result-box').style.display = 'none'; }
window.calculateMaterial = function () { const t = document.getElementById('calc-type').value; const a = parseFloat(document.getElementById('calc-area').value); const p = parseFloat(document.getElementById('calc-pack').value); if (!a || !p) return window.showToast('Minden mező kell!'); let res = 0, unit = ''; if (t === 'paint') { const l = parseFloat(document.getElementById('calc-layers').value), c = parseFloat(document.getElementById('calc-coverage').value); res = (a * l) / c; unit = "Liter"; } else { const th = parseFloat(document.getElementById('calc-thick').value), c = parseFloat(document.getElementById('calc-cons').value); res = a * th * c; unit = "Kg"; } document.getElementById('calc-result-num').innerText = Math.ceil(res / p) + " db"; document.getElementById('calc-result-desc').innerText = `Össz: ${Math.ceil(res)} ${unit} (${p} ${unit}/csomag)`; document.getElementById('calc-result-box').style.display = 'block'; }

window.exportData = function () { const d = JSON.stringify({ p: projects, s: shopItems, pr: profile, q: savedQuotes }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([d], { type: 'text/json' })); a.download = 'festonaplo_backup.json'; a.click(); }
window.importData = function (el) { const fr = new FileReader(); fr.onload = e => { try { const d = JSON.parse(e.target.result); if (d.p) { projects = d.p; shopItems = d.s; profile = d.pr; savedQuotes = d.q; localStorage.setItem('fn133_projects', JSON.stringify(projects)); localStorage.setItem('fn133_shop', JSON.stringify(shopItems)); localStorage.setItem('fn133_profile', JSON.stringify(profile)); localStorage.setItem('fn133_quotes', JSON.stringify(savedQuotes)); location.reload(); } } catch (e) { alert('Hiba!'); } }; fr.readAsText(el.files[0]); }

window.generateProjectPDF = function () { if (!currentDetailId) return; const p = projects.find(x => x.id == currentDetailId); const i = shopItems.filter(x => x.projectId == currentDetailId); if (!i.length) return window.showToast('Üres'); createPDF("ANYAGLISTA", i.map(x => [x.text, x.qty + " db", x.room || '-', x.code || '-']), false, { name: p.client, address: p.address, date: new Date().toLocaleDateString('hu-HU'), customHeaders: ['Anyag', 'Menny.', 'Hely', 'Kód'] }); }
window.shareProjectList = function () { const p = projects.find(x => x.id == currentDetailId); const i = shopItems.filter(x => x.projectId == currentDetailId); let t = `${p.client.toUpperCase()} - ANYAGOK:\n\n`; i.forEach(x => t += `- ${x.qty}x ${x.text} ${x.code ? '(' + x.code + ')' : ''}\n`); shareText("Anyaglista", t); }
window.goToShopForCurrentProject = function () { if (!currentDetailId) return; window.switchTab('shop'); setTimeout(() => { const s = document.getElementById('shop-project-select'); if (s) { s.value = currentDetailId; window.updateRoomSelectInShop(); } }, 100); window.closeModal(); }

window.shareCurrentShopList = function () { let t = "BEVÁSÁRLÓLISTA:\n\n"; shopItems.forEach(i => { if (!i.done) t += `[ ] ${i.qty}x ${i.text} ${i.code ? '(' + i.code + ')' : ''}\n`; }); shareText("Bevásárlólista", t); }

window.openItemEdit = function (id) { const i = shopItems.find(x => x.id == id); window.openModal('item-edit-box'); document.getElementById('item-edit-id').value = i.id; document.getElementById('item-edit-text').value = i.text; document.getElementById('item-edit-qty').value = i.qty; document.getElementById('item-edit-code').value = i.code || ''; document.getElementById('item-edit-note').value = i.note || ''; }
window.saveItemEdit = function () { const id = document.getElementById('item-edit-id').value; const i = shopItems.find(x => x.id == id); i.text = document.getElementById('item-edit-text').value; i.qty = document.getElementById('item-edit-qty').value; i.code = document.getElementById('item-edit-code').value; i.note = document.getElementById('item-edit-note').value; syncShop(i); window.closeModal(); window.renderShop(); if (currentDetailId) window.renderDetailList(); }

window.renderShop = function () { document.getElementById('shop-list').innerHTML = shopItems.map(i => { let pTag = ''; if (i.projectId) { const p = projects.find(x => x.id == i.projectId); if (p) pTag = `<div style="font-size:11px;color:#1a237e;margin-top:2px;font-weight:bold;">${p.client} ${i.room ? '• ' + i.room : ''}</div>`; } return `<div class="list-item ${i.done ? 'item-done' : ''}"><div style="display:flex;align-items:center;flex:1;"><div class="check-circle" onclick="window.toggleShop(${i.id})"><i class="fas fa-check" style="font-size:12px;"></i></div><div><div class="item-text" style="font-weight:bold;">${i.qty}x ${i.text} ${i.image ? '📷' : ''}</div><div style="font-size:13px;color:#78909c;">${i.code || ''} ${i.note || ''}</div>${pTag}</div></div><i class="fas fa-trash" style="color:#cfd8dc;padding:10px;" onclick="window.delShop(${i.id})"></i></div>`; }).join(''); }
window.toggleShop = function (id) { const i = shopItems.find(x => x.id == id); i.done = !i.done; syncShop(i); window.renderShop(); if (document.getElementById('view-detail').style.display === 'flex') window.renderDetailList(); }
window.delShop = function (id) { shopItems = shopItems.filter(x => x.id != id); removeShop(id); window.renderShop(); if (document.getElementById('view-detail').style.display === 'flex') window.renderDetailList(); }
window.handleShopPhoto = function (i) { if (i.files && i.files[0]) { const r = new FileReader(); r.onload = e => { tempShopImage = e.target.result; document.getElementById('shop-photo-prev').src = tempShopImage; document.getElementById('shop-photo-prev').style.display = 'block'; }; r.readAsDataURL(i.files[0]); } }

window.updateShopSelect = function () { const s = document.getElementById('shop-project-select'); s.innerHTML = '<option value="">-- Raktár --</option>' + projects.map(p => `<option value="${p.id}">${p.client}</option>`).join(''); }
window.updateRoomSelectInShop = function () { const pid = document.getElementById('shop-project-select').value; const s = document.getElementById('shop-room-select'); s.innerHTML = '<option value="">(Nincs)</option>'; if (pid) { const p = projects.find(x => x.id == pid); if (p && p.rooms) s.innerHTML += p.rooms.map(r => `<option value="${r}">${r}</option>`).join(''); } }
window.addShopItem = function () { const txt = document.getElementById('shop-input').value; if (!txt) return window.showToast('Mit?'); const pId = document.getElementById('shop-project-select').value || null; const rId = document.getElementById('shop-room-select').value || null; const newItem = { id: Date.now(), text: txt, qty: document.getElementById('shop-qty').value, code: document.getElementById('shop-code').value, note: document.getElementById('shop-note').value, image: tempShopImage, projectId: pId, room: rId, done: false }; shopItems.unshift(newItem); syncShop(newItem); document.getElementById('shop-input').value = ''; document.getElementById('shop-photo-prev').style.display = 'none'; tempShopImage = null; window.showToast('Rögzítve'); window.renderShop(); }
window.renderDetailList = function () { const l = document.getElementById('d-materials-list'); l.innerHTML = ''; const items = shopItems.filter(i => i.projectId == currentDetailId); if (!items.length) { l.innerHTML = '<div style="text-align:center;color:#b0bec5;padding:10px;">Nincs anyag.</div>'; return; } l.innerHTML = items.map(i => `<div class="list-item ${i.done ? 'item-done' : ''}"><div style="display:flex;align-items:center;flex:1;"><div class="check-circle" onclick="window.toggleShop(${i.id})"><i class="fas fa-check" style="font-size:12px;"></i></div><div><div class="item-text" style="font-weight:bold;">${i.qty}x ${i.text}</div><div>${i.code || ''} ${i.room ? '(' + i.room + ')' : ''}</div></div></div><i class="fas fa-pen" style="color:#78909c;" onclick="window.openItemEdit(${i.id})"></i></div>`).join(''); }