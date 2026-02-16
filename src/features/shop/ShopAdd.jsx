import React, { useState } from 'react';

const ShopAdd = ({ projects, onAdd }) => {
    const [text, setText] = useState('');
    const [qty, setQty] = useState(1);
    const [projectId, setProjectId] = useState('');
    const [room, setRoom] = useState('');
    const [code, setCode] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const activeProject = projects.find(p => p.id === projectId);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text) return;

        const newItem = {
            id: Date.now(),
            text,
            qty,
            projectId,
            room,
            code,
            done: false
        };

        onAdd(newItem);
        setText('');
        setQty(1);
        setProjectId('');
        setRoom('');
        setCode('');
        setIsExpanded(false);
    };

    return (
        <div className="card" style={{ padding: '1rem' }}>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: isExpanded ? '1rem' : '0' }}>
                    <input
                        type="text"
                        placeholder="Mit vegyünk?"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        style={{ marginBottom: 0 }}
                    />
                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        style={{ width: '60px', marginBottom: 0, textAlign: 'center' }}
                    />
                    {!isExpanded && (
                        <button type="submit" className="btn btn-primary" style={{ padding: '0 15px' }}>
                            <i className="fas fa-plus"></i>
                        </button>
                    )}
                </div>

                {isExpanded && (
                    <div className="mt-3">
                        <label>Projekt (Opcionális)</label>
                        <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRoom(''); }}>
                            <option value="">-- Raktár --</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.client}</option>
                            ))}
                        </select>

                        {projectId && activeProject?.rooms?.length > 0 && (
                            <>
                                <label>Helyiség</label>
                                <select value={room} onChange={(e) => setRoom(e.target.value)}>
                                    <option value="">(Nincs megadva)</option>
                                    {activeProject.rooms.map((r, idx) => (
                                        <option key={idx} value={r}>{r}</option>
                                    ))}
                                </select>
                            </>
                        )}

                        <label>Kód / Szín</label>
                        <input
                            placeholder="Pl. RAL 9010"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="btn btn-secondary full-width" onClick={() => setIsExpanded(false)}>
                                Mégse
                            </button>
                            <button type="submit" className="btn btn-primary full-width">
                                Hozzáadás
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default ShopAdd;
