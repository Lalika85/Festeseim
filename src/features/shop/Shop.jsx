import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { loadUserCollection, syncItem, removeItem } from '../../services/firestore';
import ShopItem from './ShopItem';
import ShopAdd from './ShopAdd';

const Shop = () => {
    const { currentUser } = useAuth();
    const [items, setItems] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('active'); // active | all

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;
            try {
                const [shopData, projectData] = await Promise.all([
                    loadUserCollection(currentUser.uid, 'shopItems'),
                    loadUserCollection(currentUser.uid, 'projects')
                ]);
                setItems(shopData);
                setProjects(projectData);
            } catch (err) {
                console.error("Fetch shop data error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUser]);

    const filteredItems = useMemo(() => {
        if (viewMode === 'active') return items.filter(i => !i.done);
        return items;
    }, [items, viewMode]);

    const handleToggle = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const updatedItem = { ...item, done: !item.done };
        setItems(items.map(i => i.id === id ? updatedItem : i));
        await syncItem(currentUser.uid, 'shopItems', updatedItem);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Törlöd a tételt?')) return;
        setItems(items.filter(i => i.id !== id));
        await removeItem(currentUser.uid, 'shopItems', id);
    };

    const handleAdd = async (newItem) => {
        setItems([newItem, ...items]);
        await syncItem(currentUser.uid, 'shopItems', newItem);
    };

    return (
        <div className="view-container">
            <div className="section-header">
                <h1>Bolt</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`btn ${viewMode === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewMode('active')}
                        style={{ height: '36px', padding: '0 12px', fontSize: '14px' }}
                    >
                        Kell
                    </button>
                    <button
                        className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewMode('all')}
                        style={{ height: '36px', padding: '0 12px', fontSize: '14px' }}
                    >
                        Mind
                    </button>
                </div>
            </div>

            <ShopAdd projects={projects} onAdd={handleAdd} />

            {loading ? (
                <p className="text-center mt-4">Betöltés...</p>
            ) : filteredItems.length === 0 ? (
                <p className="text-center mt-4" style={{ color: 'var(--text-muted)' }}>Üres a lista.</p>
            ) : (
                <div className="shopping-list mt-4">
                    {filteredItems.map(item => (
                        <ShopItem
                            key={item.id}
                            item={item}
                            project={projects.find(p => p.id === item.projectId)}
                            onToggle={() => handleToggle(item.id)}
                            onDelete={() => handleDelete(item.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Shop;
