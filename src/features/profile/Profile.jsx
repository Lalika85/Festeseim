import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { loadUserSettings, syncSettings, loadUserCollection, syncItem } from '../../services/firestore';
import { useToast } from '../../hooks/useToast';

const Profile = () => {
    const { currentUser, logout } = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile] = useState({
        name: '',
        address: '',
        tax: '',
        phone: '',
        email: '',
        bank: '',
        logo: null
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!currentUser) return;
            const data = await loadUserSettings(currentUser.uid, 'profile');
            if (data) setProfile(prev => ({ ...prev, ...data }));
            setLoading(false);
        };
        fetchProfile();
    }, [currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setProfile(prev => ({ ...prev, logo: ev.target.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await syncSettings(currentUser.uid, 'profile', profile);
            showToast('Profil mentve!', 'success');
        } catch (err) {
            console.error("Profile save error:", err);
            showToast('Hiba a mentéskor!', 'danger');
        }
    };

    const exportData = async () => {
        try {
            const [p, s, q] = await Promise.all([
                loadUserCollection(currentUser.uid, 'projects'),
                loadUserCollection(currentUser.uid, 'shopItems'),
                loadUserCollection(currentUser.uid, 'quotes')
            ]);

            const fullData = {
                metadata: { version: '6.0', date: new Date().toISOString() },
                profile,
                projects: p,
                shopItems: s,
                quotes: q
            };

            const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `painters_log_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            showToast('Adatmentés kész!', 'success');
        } catch (err) {
            showToast('Hiba az exportáláskor!', 'danger');
        }
    };

    const importData = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (window.confirm('Ezzel felülírod a jelenlegi adatokat. Folytatod?')) {
                    // Sync profile
                    if (data.profile) await syncSettings(currentUser.uid, 'profile', data.profile);
                    // Sync collections
                    if (data.projects) for (const item of data.projects) await syncItem(currentUser.uid, 'projects', item);
                    if (data.shopItems) for (const item of data.shopItems) await syncItem(currentUser.uid, 'shopItems', item);
                    if (data.quotes) for (const item of data.quotes) await syncItem(currentUser.uid, 'quotes', item);

                    showToast('Importálás sikeres! Frissíts rá.', 'success');
                }
            } catch (err) {
                showToast('Érvénytelen fájlformátum!', 'danger');
            }
        };
        reader.readAsText(file);
    };

    if (loading) return <div className="text-center mt-4">Betöltés...</div>;

    return (
        <div className="view-container">
            <div className="section-header">
                <h1>Profil</h1>
                <button className="btn btn-text" onClick={logout} style={{ color: 'var(--danger)' }}>
                    Kijelentkezés
                </button>
            </div>

            <form onSubmit={handleSave} className="card">
                <div id="logo-preview-container" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    {profile.logo ? (
                        <img
                            src={profile.logo}
                            id="logo-preview"
                            alt="Logo preview"
                            style={{ maxHeight: '80px', borderRadius: '8px', marginBottom: '10px' }}
                        />
                    ) : (
                        <div style={{ padding: '20px', background: 'var(--bg-app)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                            <i className="fas fa-image fa-2x"></i>
                            <div>Nincs logó</div>
                        </div>
                    )}
                    <label className="btn btn-secondary mt-2" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                        <i className="fas fa-upload"></i> Logó feltöltése
                        <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                    </label>
                </div>

                <label>Cégnév / Név</label>
                <input name="name" value={profile.name} onChange={handleChange} placeholder="Pl. Lakásfelújítás Kft." />

                <label>Cím</label>
                <input name="address" value={profile.address} onChange={handleChange} placeholder="Város, Utca, Házszám" />

                <label>Adószám</label>
                <input name="tax" value={profile.tax} onChange={handleChange} placeholder="12345678-1-12" />

                <label>Telefonszám</label>
                <input name="phone" value={profile.phone} onChange={handleChange} type="tel" />

                <label>Email</label>
                <input name="email" value={profile.email} onChange={handleChange} type="email" />

                <label>Bankszámlaszám</label>
                <input name="bank" value={profile.bank} onChange={handleChange} placeholder="HU00 0000 0000 0000" />

                <button type="submit" className="btn btn-primary full-width mt-4">
                    Beállítások mentése
                </button>
            </form>

            <div className="detail-section">
                <div className="section-title">Adatvédelem & Biztonság</div>
                <div className="card">
                    <button className="btn btn-secondary full-width mb-2" onClick={exportData} style={{ marginBottom: '10px' }}>
                        <i className="fas fa-download"></i> Teljes adatmentés (JSON)
                    </button>
                    <label className="btn btn-secondary full-width" style={{ cursor: 'pointer' }}>
                        <i className="fas fa-upload"></i> Adatvisszatöltés
                        <input type="file" hidden accept=".json" onChange={importData} />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default Profile;
