import { CapacitorHttp } from '@capacitor/core';
 
const formatApiDate = (date) => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        return new Date(date).toISOString().split('T')[0];
    }
    // Handle Date object carefully to avoid timezone shift
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Számlázz.hu Integration
 */
export async function createSzamlazzHuInvoice(quote, apiKey, paymentMethod = 'Átutalás', fulfillmentDate = new Date(), dueDate = new Date()) {
    try {
        const fulfillmentDateStr = formatApiDate(fulfillmentDate);
        const dueDateStr = formatApiDate(dueDate);
        
        // Map payment method
        const pmMap = {
            'Átutalás': 'Átutalás',
            'Készpénz': 'Készpénz',
            'Bankkártya': 'Bankkártya'
        };
        const pm = pmMap[paymentMethod] || 'Átutalás';

        let itemsXml = '';
        quote.items.forEach(item => {
            const netPrice = parseFloat(item.price) || 0;
            const quantity = parseFloat(item.qty) || 0;
            const netValue = netPrice * quantity;
            const grossValue = netValue * 1.27; // hardcoded 27% for now
            const vatValue = grossValue - netValue;

            itemsXml += `
                <tetel>
                    <megnevezes><![CDATA[${item.description || 'Névtelen tétel'}]]></megnevezes>
                    <mennyiseg>${quantity}</mennyiseg>
                    <mennyisegiEgyseg><![CDATA[${item.unit || 'db'}]]></mennyisegiEgyseg>
                    <nettoEgysegar>${netPrice}</nettoEgysegar>
                    <afakulcs>27</afakulcs>
                    <nettoErtek>${netValue.toFixed(2)}</nettoErtek>
                    <afaErtek>${vatValue.toFixed(2)}</afaErtek>
                    <bruttoErtek>${grossValue.toFixed(2)}</bruttoErtek>
                </tetel>
            `;
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla http://www.szamlazz.hu/docs/xsds/agent/xmlszamla.xsd">
            <beallitasok>
                <szamlaAgentKulcs>${apiKey}</szamlaAgentKulcs>
                <eszamla>false</eszamla>
                <szamlaLetoltes>true</szamlaLetoltes>
                <szamlaLetoltesPld>1</szamlaLetoltesPld>
            </beallitasok>
            <fejlec>
                <keltDatum>${new Date().toISOString().split('T')[0]}</keltDatum>
                <teljesitesDatum>${fulfillmentDateStr}</teljesitesDatum>
                <fizetesiHataridoDatum>${dueDateStr}</fizetesiHataridoDatum>
                <fizmod><![CDATA[${pm}]]></fizmod>
                <penznem>HUF</penznem>
                <szamlaNyelve>hu</szamlaNyelve>
                <megjegyzes><![CDATA[Árajánlat alapján: ${quote.number || ''}]]></megjegyzes>
            </fejlec>
            <elado>
                <emailReplyto><![CDATA[${quote.sellerEmail || ''}]]></emailReplyto>
                <emailTargy><![CDATA[Számla - ${quote.sellerName || ''}]]></emailTargy>
            </elado>
            <vevo>
                <nev><![CDATA[${quote.buyerName || 'Ismeretlen Vevő'}]]></nev>
                <irsz>0000</irsz>
                <telepules>Ismeretlen</telepules>
                <cim><![CDATA[${quote.buyerAddress || 'Nincs megadva'}]]></cim>
                <email>${quote.buyerEmail || ''}</email>
                <sendEmail>true</sendEmail>
            </vevo>
            <tetelek>
                ${itemsXml}
            </tetelek>
        </xmlszamla>`;

        const response = await CapacitorHttp.post({
            url: 'https://www.szamlazz.hu/szamla/agent',
            headers: { 'Content-Type': 'application/xml' },
            data: xml
        });

        if (response.status >= 400) {
            throw new Error(`Számlázz.hu hiba (HTTP ${response.status}): ${JSON.stringify(response.data)}`);
        }

        // Parse XML response for success/error
        const responseData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        if (responseData.includes('<sikeres>false</sikeres>') || responseData.includes('<error>')) {
            const errorMsg = responseData.match(/<hibauzenet>(.*?)<\/hibauzenet>/)?.[1] || 
                             responseData.match(/<error>(.*?)<\/error>/)?.[1] || 
                             'Hiba a Számlázz.hu válaszában. Ellenőrizd az API kulcsot!';
            throw new Error(errorMsg);
        }

        // Számlázz.hu success indicator is often in the headers for Agent calls
        const szamlaszam = response.headers?.['szlahu_szamlaszam'] || response.headers?.['szamlaszam'];

        if (!responseData.includes('<szamlaszam>') && !szamlaszam) {
            // If status is 200 and no explicit error, it might be a success but we can't find the number
            // However, to be safe, let's only throw if we are sure it's not a success
            if (responseData.includes('<hibakod>')) {
                 const errorMsg = responseData.match(/<hibauzenet>(.*?)<\/hibauzenet>/)?.[1] || 'Ismeretlen hiba';
                 throw new Error(errorMsg);
            }
        }

        return response.data;
    } catch (err) {
        console.error('Számlázz.hu invoice error:', err);
        throw err;
    }
}

/**
 * Billingo v3 Integration
 */
export async function createBillingoInvoice(quote, apiKey, paymentMethod = 'wire_transfer', fulfillmentDate = new Date(), dueDate = new Date(), blockIdOverride = null) {
    try {
        const headers = {
            'X-API-KEY': apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // 1. Get/Verify Document Block
        let blockId = blockIdOverride;
        if (!blockId) {
            const blocksResponse = await CapacitorHttp.get({
                url: 'https://api.billingo.hu/v3/document-blocks',
                headers
            });
            
            if (blocksResponse.status >= 400 || !blocksResponse.data?.data?.length) {
                throw new Error('Nem található számlatömb a Billingo fiókban!');
            }
            blockId = blocksResponse.data.data[0].id;
        }

        // 2. Create or get partner
        const partnerPayload = {
            name: quote.buyerName || 'Ismeretlen Vevő',
            address: {
                country_code: "HU",
                post_code: "0000",
                city: "Ismeretlen",
                address: quote.buyerAddress || "Nincs megadva"
            },
            emails: quote.buyerEmail ? [quote.buyerEmail] : [],
            taxcode: quote.buyerTaxNumber || ""
        };

        const partnerResponse = await CapacitorHttp.post({
            url: 'https://api.billingo.hu/v3/partners',
            headers,
            data: partnerPayload
        });

        if (partnerResponse.status >= 400) {
            throw new Error(`Billingo partner létrehozás hiba: ${JSON.stringify(partnerResponse.data)}`);
        }
        const partnerId = partnerResponse.data.id;

        // 3. Create Document
        const fulfillmentDateStr = formatApiDate(fulfillmentDate);
        const dueDateStr = formatApiDate(dueDate);
        
        const pmMap = {
            'Átutalás': 'wire_transfer',
            'Készpénz': 'cash',
            'Bankkártya': 'bankcard'
        };
        const pm = pmMap[paymentMethod] || 'wire_transfer';

        const documentPayload = {
            partner_id: partnerId,
            block_id: blockId,
            bank_account_id: "", // Optional if not strict
            type: "invoice",
            fulfillment_date: fulfillmentDateStr,
            due_date: dueDateStr,
            payment_method: pm,
            language: "hu",
            currency: "HUF",
            conversion_rate: 1,
            electronic: true,
            items: quote.items.map(item => ({
                name: item.description || "Névtelen tétel",
                quantity: parseFloat(item.qty) || 0,
                unit: item.unit || "db",
                unit_price: parseFloat(item.price) || 0,
                unit_price_type: "net",
                vat: "27%"
            }))
        };

        const docResponse = await CapacitorHttp.post({
            url: 'https://api.billingo.hu/v3/documents',
            headers,
            data: documentPayload
        });

        if (docResponse.status >= 400) {
            throw new Error(`Billingo számla hiba: ${JSON.stringify(docResponse.data)}`);
        }
        const documentId = docResponse.data.id;

        // 4. Send email if email exists
        if (quote.buyerEmail) {
            await CapacitorHttp.post({
                url: `https://api.billingo.hu/v3/documents/${documentId}/send`,
                headers,
                data: {
                    emails: [quote.buyerEmail]
                }
            });
        }

        return { success: true, message: 'Számla sikeresen kiállítva és elküldve!' };
    } catch (err) {
        console.error("Billingo API error:", err);
        throw err;
    }
}

/**
 * OTP eBIZ Integration - Hivatalos API dokumentáció alapján (v1.0, 2025.11.03)
 * Base URL: https://app.otpebiz.hu/api/public-core
 * Mock URL: https://app.otpebiz.hu/api/api-mock
 * Auth: X-OTP-eBIZ-API-Key header (API kulcs 90 napig érvényes)
 * Műveleti sorrend: 1) sequences → 2) bank-accounts → 3) POST invoices → 4) send email
 */
export async function createOtpEbizInvoice(quote, apiKey, paymentMethod = 'Átutalás', fulfillmentDate = new Date(), dueDate = new Date()) {
    try {
        const BASE_URL = 'https://app.otpebiz.hu/api/public-core/v1';

        const headers = {
            'X-OTP-eBIZ-API-Key': apiKey,
            'accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // --- 1. Számlatömb (sequence) lekérése ---
        console.log('OTP eBIZ: Számlatömbök lekérése...');
        const seqResponse = await CapacitorHttp.get({
            url: `${BASE_URL}/invoices/sequences`,
            headers
        });

        if (seqResponse.status === 401 || seqResponse.status === 403) {
            throw new Error('Érvénytelen vagy lejárt OTP eBIZ API kulcs! Ellenőrizd a Beállítások menüben. (A kulcs 90 napig érvényes.)');
        }

        if (seqResponse.status >= 400) {
            throw new Error(`OTP eBIZ: Nem sikerült a számlatömböket lekérni (HTTP ${seqResponse.status})`);
        }

        const sequences = Array.isArray(seqResponse.data) ? seqResponse.data : [];
        if (sequences.length === 0) {
            throw new Error('OTP eBIZ: Nincs számlatömb rögzítve az eBIZ-ben! Hozz létre egyet az eBIZ felületen.');
        }

        // Use default sequence, or first one
        const sequence = sequences.find(s => s.default) || sequences[0];
        console.log('OTP eBIZ: Választott számlatömb:', sequence.name, '(ID:', sequence.id, ')');

        // --- 2. Bankszámlák lekérése (opcionális, de ajánlott átutalásnál) ---
        let bankAccountId = null;
        if (paymentMethod === 'Átutalás') {
            try {
                const bankResponse = await CapacitorHttp.get({
                    url: `${BASE_URL}/bank-accounts`,
                    headers
                });
                if (bankResponse.status < 400) {
                    const accounts = Array.isArray(bankResponse.data) ? bankResponse.data : [];
                    if (accounts.length > 0) {
                        const defaultAccount = accounts.find(a => a.default) || accounts[0];
                        bankAccountId = defaultAccount.id;
                        console.log('OTP eBIZ: Bankszámla:', defaultAccount.accountNumber, '(ID:', bankAccountId, ')');
                    }
                }
            } catch (bankErr) {
                console.warn('OTP eBIZ: Bankszámla lekérés sikertelen (nem kritikus):', bankErr);
            }
        }

        // --- 3. Számla adatok összeállítása ---
        const deliveryDateStr = formatApiDate(fulfillmentDate);
        const dueDateStr = formatApiDate(dueDate);

        // Payment method mapping
        const pmMap = {
            'Átutalás': 'TRANSFER',
            'Készpénz': 'CASH',
            'Bankkártya': 'BANK_CARD'
        };
        const pm = pmMap[paymentMethod] || 'TRANSFER';

        // VAT rate mapping (number → eBIZ enum string)
        const vatRateMap = (vatPercent) => {
            switch (vatPercent) {
                case 27: return 'AFA_27';
                case 18: return 'AFA_18';
                case 5: return 'AFA_5';
                case 0: return 'AM';  // Adómentes
                default: return 'AFA_27';
            }
        };

        // Unit mapping
        const unitMap = (unit) => {
            const u = (unit || '').toLowerCase();
            if (u === 'db' || u === 'darab' || u === 'piece') return 'PIECE';
            if (u === 'óra' || u === 'hour') return 'OWN';
            if (u === 'm2' || u === 'nm' || u === 'm²') return 'OWN';
            if (u === 'fm' || u === 'm') return 'OWN';
            return 'PIECE';
        };

        // Build invoice items
        const items = quote.items
            .filter(item => !item.isOptional)
            .map(item => {
                const netUnitAmount = parseFloat(item.price) || 0;
                const quantity = parseFloat(item.qty) || 1;
                const vatPercent = typeof item.vat === 'number' ? item.vat : 27;
                const netAmount = netUnitAmount * quantity;
                const vatAmount = Math.round(netAmount * (vatPercent / 100) * 100) / 100;
                const mappedUnit = unitMap(item.unit);

                const itemObj = {
                    name: item.description || 'Tétel',
                    productCode: null,
                    note: null,
                    quantity: quantity,
                    unit: mappedUnit,
                    netUnitAmount: netUnitAmount,
                    netAmount: netAmount,
                    vat: vatRateMap(vatPercent),
                    vatAmount: vatAmount
                };

                // If unit is OWN, specify customUnit
                if (mappedUnit === 'OWN') {
                    itemObj.customUnit = item.unit || 'db';
                }

                return itemObj;
            });

        if (items.length === 0) {
            throw new Error('OTP eBIZ: Legalább egy tételt meg kell adni a számlán!');
        }

        // Parse customer address into components
        const addressParts = parseHungarianAddress(quote.buyerAddress || '');

        // Determine customer type
        const customerType = quote.buyerTaxNumber ? 'DOMESTIC' : 'PRIVATE_PERSON';

        // Build customer object
        const customer = {
            name: quote.buyerName || 'Ismeretlen Vevő',
            type: customerType,
            address: {
                countryCode: 'HU',
                zipCode: addressParts.zipCode,
                city: addressParts.city,
                address: addressParts.street
            },
            bankAccount: null
        };

        // Only add tax number for non-private persons
        if (customerType !== 'PRIVATE_PERSON' && quote.buyerTaxNumber) {
            customer.taxNumbers = [{
                taxNumber: quote.buyerTaxNumber,
                taxType: 'HU'
            }];
        }

        // Build the invoice payload (official format)
        const invoicePayload = {
            type: 'INVOICE',
            sequenceId: sequence.id,
            customer: customer,
            signatureType: 'ELECTRONIC',
            language: 'HU',
            currencyCode: 'HUF',
            exchangeRate: 1,
            dueDate: dueDateStr,
            deliveryDate: deliveryDateStr,
            paymentMethod: pm,
            note: [`Árajánlat alapján: ${quote.number || ''}`],
            setting: {
                onlinePaymentMethod: null
            },
            items: items
        };

        // Add bankAccountId if available
        if (bankAccountId) {
            invoicePayload.bankAccountId = bankAccountId;
        }

        console.log('OTP eBIZ request payload:', JSON.stringify(invoicePayload, null, 2));

        // --- POST invoice ---
        const response = await CapacitorHttp.post({
            url: `${BASE_URL}/invoices`,
            headers,
            data: invoicePayload
        });

        console.log('OTP eBIZ response status:', response.status);
        console.log('OTP eBIZ response data:', JSON.stringify(response.data));

        if (response.status === 401 || response.status === 403) {
            throw new Error('Érvénytelen vagy lejárt OTP eBIZ API kulcs! Ellenőrizd a Beállítások menüben.');
        }

        if (response.status >= 400) {
            const errData = response.data;
            let errorMsg = `OTP eBIZ hiba (HTTP ${response.status})`;
            
            if (typeof errData === 'object') {
                // eBIZ error format: { correlationId, messages: [{ code, params: { message } }] }
                if (errData.messages && Array.isArray(errData.messages)) {
                    const msgs = errData.messages.map(m => `${m.code}: ${m.params?.message || ''}`).join('; ');
                    errorMsg += ': ' + msgs;
                } else {
                    errorMsg += ': ' + JSON.stringify(errData);
                }
            } else if (typeof errData === 'string') {
                errorMsg += ': ' + errData;
            }
            
            throw new Error(errorMsg);
        }

        // --- 4. Email küldés (ha van vevő email és van invoiceId) ---
        const invoiceId = response.data?.id;
        const invoiceNumber = response.data?.invoiceNumber;

        if (quote.buyerEmail && invoiceId) {
            try {
                await CapacitorHttp.post({
                    url: `${BASE_URL}/invoices/id/${invoiceId}/send`,
                    headers,
                    data: {
                        toAddress: quote.buyerEmail,
                        subject: `Számla: ${invoiceNumber || ''}`,
                        body: `Tisztelt Partnerünk!\n\nMellékletben küldjük a(z) ${invoiceNumber || ''} számú számlát.\n\nÜdvözlettel`,
                        sendInvoiceAttachment: false,
                        ccToSender: false
                    }
                });
                console.log('OTP eBIZ: Email sikeresen elküldve:', quote.buyerEmail);
            } catch (sendErr) {
                console.warn('OTP eBIZ email küldés sikertelen (nem kritikus):', sendErr);
            }
        }

        return { 
            success: true, 
            message: `Számla sikeresen kiállítva az OTP eBIZ-ben! (${invoiceNumber || 'N/A'})`,
            invoiceNumber: invoiceNumber,
            invoiceId: invoiceId
        };
    } catch (err) {
        console.error('OTP eBIZ invoice error:', err);
        throw err;
    }
}

/**
 * Hungarian address parser: "1234 Budapest, Kossuth u. 1." → { zipCode, city, street }
 */
function parseHungarianAddress(fullAddress) {
    const result = { zipCode: '', city: '', street: '' };
    if (!fullAddress) return result;

    // Try pattern: "1234 City, Street"
    const match = fullAddress.match(/^(\d{4})\s+([^,]+),?\s*(.*)?$/);
    if (match) {
        result.zipCode = match[1];
        result.city = match[2].trim();
        result.street = (match[3] || '').trim();
    } else {
        // Fallback: put everything in street
        result.zipCode = '0000';
        result.city = 'N/A';
        result.street = fullAddress.trim();
    }
    return result;
}
