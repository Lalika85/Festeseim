import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Calculator = () => {
    const navigate = useNavigate();
    const [area, setArea] = useState('');
    const [layers, setLayers] = useState(2);
    const [efficiency, setEfficiency] = useState(10); // m2/liter
    const [pricePerLiter, setPricePerLiter] = useState(2500);

    const litersNeeded = area ? (area * layers / efficiency).toFixed(1) : 0;
    const bucket15l = Math.ceil(litersNeeded / 15);
    const totalPrice = (litersNeeded * pricePerLiter).toFixed(0);

    return (
        <div className="view-container">
            <div className="section-header">
                <button className="btn-icon" onClick={() => navigate(-1)}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <h1>Kalkulátor</h1>
                <div style={{ width: '40px' }}></div>
            </div>

            <div className="card">
                <h3>Anyagszükséglet</h3>

                <label>Falfelület (m²)</label>
                <input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Pl. 120"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label>Rétegek száma</label>
                        <select value={layers} onChange={(e) => setLayers(Number(e.target.value))}>
                            <option value={1}>1 réteg</option>
                            <option value={2}>2 réteg</option>
                            <option value={3}>3 réteg</option>
                        </select>
                    </div>
                    <div>
                        <label>Kiadósság (m²/l)</label>
                        <input
                            type="number"
                            value={efficiency}
                            onChange={(e) => setEfficiency(e.target.value)}
                        />
                    </div>
                </div>

                <label>Festék ára (Ft/liter)</label>
                <input
                    type="number"
                    value={pricePerLiter}
                    onChange={(e) => setPricePerLiter(e.target.value)}
                />
            </div>

            {area > 0 && (
                <div className="card" style={{ background: 'var(--primary)', color: 'white' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>Szükséges festék</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{litersNeeded} l</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>15l-es vödör</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{bucket15l} db</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Becsült anyagköltség</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{Number(totalPrice).toLocaleString()} Ft</div>
                    </div>
                </div>
            )}

            <div className="detail-section">
                <div className="section-title">Hasznos tippek</div>
                <div className="card" style={{ fontSize: '14px' }}>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li>A számítás 15 literes vödrökkel kalkulál.</li>
                        <li>Mindig számoljon +10% veszteséggel a sarkok és javítások miatt.</li>
                        <li>A kiadósság függ a felület nedvszívó képességétől.</li>
                    </ul>
                </div>
            </div>

            <button className="btn btn-primary full-width" onClick={() => navigate('/shop')}>
                <i className="fas fa-shopping-cart"></i> Menj a boltba
            </button>
        </div>
    );
};

export default Calculator;
