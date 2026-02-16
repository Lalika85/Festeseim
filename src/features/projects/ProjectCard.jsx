import React from 'react';

const ProjectCard = ({ project, onClick }) => {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'suspend':
                return <span className="badge bg-suspend">Felfügg.</span>;
            case 'done':
                return <span className="badge bg-done">Befejezett</span>;
            default:
                return <span className="badge bg-active">Elkezdett</span>;
        }
    };

    return (
        <div className="card" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={onClick}>
            <div style={{ flex: 1 }}>
                {getStatusBadge(project.status)}
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)', marginTop: '4px' }}>
                    {project.client || 'Névtelen'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {project.address || 'Nincs cím megadva'}
                </div>
            </div>
            <i className="fas fa-chevron-right" style={{ color: 'var(--border)', marginLeft: '1rem' }}></i>
        </div>
    );
};

export default ProjectCard;
