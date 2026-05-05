import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { db } from '../services/firebase';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy 
} from 'firebase/firestore';
import { localDB } from '../services/localDB';

const ProjectsContext = createContext();

export const ProjectsProvider = ({ children }) => {
    const { currentUser, ownerUid } = useAuth();
    const [projects, setProjects] = useState([]);
    const [companies, setCompanies] = useState([]);

    // Split loading states to ensure both are ready
    const [projectsLoaded, setProjectsLoaded] = useState(false);
    const [companiesLoaded, setCompaniesLoaded] = useState(false);

    // Derived loading state
    const loading = !projectsLoaded || !companiesLoaded;

    useEffect(() => {
        if (!currentUser?.uid || !ownerUid) {
            setProjects([]);
            setCompanies([]);
            setProjectsLoaded(true);
            setCompaniesLoaded(true);
            return;
        }

        setProjectsLoaded(false);
        setCompaniesLoaded(false);

        // Projects Listener (LocalDB)
        const unsubProjects = localDB.subscribe(ownerUid, 'projects', (data) => {
            const list = Object.values(data || {}).sort((a, b) => 
                new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            );
            setProjects(list);
            setProjectsLoaded(true);
        });

        // Companies Listener (LocalDB)
        const unsubCompanies = localDB.subscribe(ownerUid, 'companies', (data) => {
            const list = Object.values(data || {});
            setCompanies(list);
            setCompaniesLoaded(true);
        });

        return () => {
            unsubProjects();
            unsubCompanies();
        };
    }, [currentUser?.uid, ownerUid]);

    // --- Projects CRUD (LocalDB) ---

    const addProject = async (formData) => {
        if (!ownerUid) throw new Error("Not authenticated");
        
        const id = Date.now().toString();
        const newProject = { 
            ...formData, 
            id,
            createdAt: new Date().toISOString(),
            rooms: [], 
            docs: [] 
        };
        
        localDB.set(ownerUid, 'projects', id, newProject);
        return id;
    };

    const updateProject = async (id, data) => {
        if (!ownerUid) return;
        localDB.set(ownerUid, 'projects', id, {
            ...data,
            updatedAt: new Date().toISOString()
        });
    };

    const deleteProject = async (id) => {
        if (!ownerUid) return;
        localDB.remove(ownerUid, 'projects', id);
    };

    // --- Companies CRUD (LocalDB) ---

    const addCompany = async (companyData) => {
        if (!ownerUid) throw new Error("Not authenticated");
        const id = Date.now().toString();
        const newCompany = {
            ...companyData,
            id,
            createdAt: new Date().toISOString()
        };
        localDB.set(ownerUid, 'companies', id, newCompany);
        return id;
    };

    const updateCompany = async (id, data) => {
        if (!ownerUid) return;
        localDB.set(ownerUid, 'companies', id, {
            ...data,
            updatedAt: new Date().toISOString()
        });
    };

    const deleteCompany = async (id) => {
        if (!ownerUid) return;
        localDB.remove(ownerUid, 'companies', id);
    };

    return (
        <ProjectsContext.Provider value={{
            projects, companies, loading,
            addProject, updateProject, deleteProject,
            addCompany, updateCompany, deleteCompany
        }}>
            {children}
        </ProjectsContext.Provider>
    );
};

export const useProjects = () => useContext(ProjectsContext);
