import * as XLSX from 'xlsx';

/**
 * Converts internal application data to an Excel workbook
 * @param {Object} data - { profile, projects, shopItems, quotes }
 * @returns {ArrayBuffer} - The generated Excel file as ArrayBuffer
 */
export const generateExcelWorkbook = (data) => {
    const wb = XLSX.utils.book_new();

    // 1. Profile Sheet
    if (data.profile) {
        const profileData = [
            { Field: 'Név', Value: data.profile.name || '' },
            { Field: 'Cím', Value: data.profile.address || '' },
            { Field: 'Adószám', Value: data.profile.tax || '' },
            { Field: 'Telefon', Value: data.profile.phone || '' },
            { Field: 'Email', Value: data.profile.email || '' },
            { Field: 'Bankszámla', Value: data.profile.bank || '' },
            { Field: 'Megjegyzés', Value: data.profile.note || '' },
        ];
        const wsProfile = XLSX.utils.json_to_sheet(profileData);
        XLSX.utils.book_append_sheet(wb, wsProfile, "Profil");
    }

    // 2. Projects Sheet
    if (data.projects && data.projects.length > 0) {
        const flattenedProjects = data.projects.map(p => ({
            ...p,
            rooms: p.rooms ? JSON.stringify(p.rooms) : '[]', // Flatten nested array
            history: p.history ? JSON.stringify(p.history) : '[]'
        }));
        const wsProjects = XLSX.utils.json_to_sheet(flattenedProjects);
        XLSX.utils.book_append_sheet(wb, wsProjects, "Munkák");
    }

    // 3. Shop Items Sheet
    const shopItems = data.shopItems || data.shopping_items || [];
    if (shopItems.length > 0) {
        const wsShop = XLSX.utils.json_to_sheet(shopItems);
        XLSX.utils.book_append_sheet(wb, wsShop, "Bolt");
    }

    // 4. Quotes Sheet
    if (data.quotes && data.quotes.length > 0) {
        const flattenedQuotes = data.quotes.map(q => ({
            ...q,
            items: q.items ? JSON.stringify(q.items) : '[]'
        }));
        const wsQuotes = XLSX.utils.json_to_sheet(flattenedQuotes);
        XLSX.utils.book_append_sheet(wb, wsQuotes, "Árajánlatok");
    }

    // 5. Companies Sheet
    if (data.companies && data.companies.length > 0) {
        const wsCompanies = XLSX.utils.json_to_sheet(data.companies);
        XLSX.utils.book_append_sheet(wb, wsCompanies, "Cégek");
    }

    // Generate output
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return wbout;
};

/**
 * Parses an Excel file back into application data
 * @param {ArrayBuffer} buffer - The Excel file data
 * @returns {Object} - The parsed data
 */
export const parseExcelWorkbook = (buffer) => {
    const wb = XLSX.read(buffer, { type: 'array' });
    const result = {
        profile: {},
        projects: [],
        shopItems: [],
        quotes: [],
        companies: []
    };

    // Parse Profil
    if (wb.SheetNames.includes("Profil")) {
        const profileSheet = XLSX.utils.sheet_to_json(wb.Sheets["Profil"]);
        profileSheet.forEach(row => {
            if (row.Field === 'Név') result.profile.name = row.Value;
            if (row.Field === 'Cím') result.profile.address = row.Value;
            if (row.Field === 'Adószám') result.profile.tax = row.Value;
            if (row.Field === 'Telefon') result.profile.phone = row.Value;
            if (row.Field === 'Email') result.profile.email = row.Value;
            if (row.Field === 'Bankszámla') result.profile.bank = row.Value;
            if (row.Field === 'Megjegyzés') result.profile.note = row.Value;
        });
    }

    // Parse Munkák
    if (wb.SheetNames.includes("Munkák")) {
        const projects = XLSX.utils.sheet_to_json(wb.Sheets["Munkák"]);
        result.projects = projects.map(p => {
            let rooms = [];
            try {
                rooms = typeof p.rooms === 'string' ? JSON.parse(p.rooms) : (p.rooms || []);
            } catch (e) { rooms = []; }
            
            let history = [];
            try {
                history = typeof p.history === 'string' ? JSON.parse(p.history) : (p.history || []);
            } catch (e) { history = []; }

            return {
                ...p,
                id: p.id ? String(p.id) : String(Date.now() + Math.random()),
                createdAt: p.createdAt || (p.id ? new Date(Number(p.id) || Date.now()).toISOString() : new Date().toISOString()),
                rooms,
                history
            };
        });
    }

    // Parse Bolt
    if (wb.SheetNames.includes("Bolt")) {
        result.shopItems = XLSX.utils.sheet_to_json(wb.Sheets["Bolt"]);
    }

    // Parse Árajánlatok
    if (wb.SheetNames.includes("Árajánlatok")) {
        const quotes = XLSX.utils.sheet_to_json(wb.Sheets["Árajánlatok"]);
        result.quotes = quotes.map(q => {
            let items = [];
            try {
                items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
            } catch (e) { items = []; }

            return {
                ...q,
                id: q.id ? String(q.id) : String(Date.now() + Math.random()),
                createdAt: q.createdAt || (q.id ? new Date(Number(q.id) || Date.now()).toISOString() : new Date().toISOString()),
                items
            };
        });
    }

    // Parse Cégek
    if (wb.SheetNames.includes("Cégek")) {
        result.companies = XLSX.utils.sheet_to_json(wb.Sheets["Cégek"]);
    }

    return result;
};

/**
 * Parses a simple Excel budget file into quote items
 * Expects columns like: Megnevezés, Mennyiség, Egység, Nettó Egységár, ÁFA
 */
export const parseSimpleBudget = (buffer) => {
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet);

    return rows.map(row => {
        // Try to find columns regardless of exact naming (Hungarian common terms)
        const description = row['Megnevezés'] || row['Leírás'] || row['Tétel'] || row['Description'] || '';
        const qty = parseFloat(row['Mennyiség'] || row['Menny.'] || row['Qty'] || row['Quantity']) || 0;
        const unit = row['Egység'] || row['Unit'] || 'm²';
        const price = parseFloat(row['Nettó Egységár'] || row['Egységár'] || row['Price'] || row['Unit Price']) || 0;
        const vat = row['ÁFA'] || row['VAT'] || 27;

        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            description,
            qty,
            unit,
            price,
            vat: vat === 'AAM' ? 'AAM' : (parseInt(vat) || 27),
            isOptional: false
        };
    }).filter(item => item.description); // Only keep items with a description
};
