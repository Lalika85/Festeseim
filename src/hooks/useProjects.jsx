import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { db } from '../services/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';

const ProjectsContext = createContext();

export const ProjectsProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [projects, setProjects] = useState([]);
    const [companies, setCompanies] = useState([]);

    // Split loading states to ensure both are ready
    const [projectsLoaded, setProjectsLoaded] = useState(false);
    const [companiesLoaded, setCompaniesLoaded] = useState(false);

    // Derived loading state
    const loading = !projectsLoaded || !companiesLoaded;

    useEffect(() => {
        if (!currentUser?.uid) {
            setProjects([]);
            setCompanies([]);
            setProjectsLoaded(true); // Ready (empty)
            setCompaniesLoaded(true); // Ready (empty)
            return;
        }

        // Reset to loading on user change
        setProjectsLoaded(false);
        setCompaniesLoaded(false);

        // Projects Listener
        const qProjects = query(collection(db, 'users', currentUser.uid, 'projects'));
        const unsubProjects = onSnapshot(qProjects, (snapshot) => {
            console.log('Projects loaded. From cache?', snapshot.metadata.fromCache);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.id > a.id ? 1 : -1));
            setProjects(list);
            setProjectsLoaded(true);
        }, error => {
            console.error("Projects listener error:", error);
            setProjectsLoaded(true); // Don't block app on error
        });

        // Companies Listener
        const qCompanies = query(collection(db, 'users', currentUser.uid, 'companies'));
        const unsubCompanies = onSnapshot(qCompanies, (snapshot) => {
            console.log('Companies loaded. From cache?', snapshot.metadata.fromCache);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCompanies(list);
            setCompaniesLoaded(true);
        }, error => {
            console.error("Companies listener error:", error);
            setCompaniesLoaded(true); // Don't block app on error
        });

        return () => {
            unsubProjects();
            unsubCompanies();
        };
    }, [currentUser?.uid]);

    // --- Projects CRUD (Fire & Forget) ---

    const addProject = async (formData) => {
        if (!currentUser?.uid) return;
        const newId = String(Date.now());
        const newProject = { ...formData, id: newId, rooms: [], docs: [] };

        // Firestore update (UI updates automatically via onSnapshot)
        const docRef = doc(db, 'users', currentUser.uid, 'projects', newId);
        setDoc(docRef, newProject).catch(err => console.error("addProject error:", err));

        return newId;
    };

    const updateProject = async (id, data) => {
        if (!currentUser?.uid) return;
        const docRef = doc(db, 'users', currentUser.uid, 'projects', id);
        updateDoc(docRef, data).catch(err => console.error("updateProject error:", err));
    };

    const deleteProject = async (id) => {
        if (!currentUser?.uid) return;
        const docRef = doc(db, 'users', currentUser.uid, 'projects', id);
        deleteDoc(docRef).catch(err => console.error("deleteProject error:", err));
    };

    // --- Companies CRUD ---

    const addCompany = async (companyData) => {
        if (!currentUser?.uid) return;
        const newRef = doc(collection(db, 'users', currentUser.uid, 'companies'));
        const newCompany = { ...companyData, id: newRef.id };
        setDoc(newRef, newCompany).catch(err => console.error("addCompany error:", err));
        return newRef.id;
    };

    const updateCompany = async (id, data) => {
        if (!currentUser?.uid) return;
        const docRef = doc(db, 'users', currentUser.uid, 'companies', id);
        updateDoc(docRef, data).catch(err => console.error("updateCompany error:", err));
    };

    const deleteCompany = async (id) => {
        if (!currentUser?.uid) return;
        const docRef = doc(db, 'users', currentUser.uid, 'companies', id);
        deleteDoc(docRef).catch(err => console.error("deleteCompany error:", err));
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
