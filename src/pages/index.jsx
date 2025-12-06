import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Layout from "./Layout.jsx";

// Importando todas as páginas
import Dashboard from "./Dashboard";
import Patients from "./Patients";
import Appointments from "./Appointments";
import Schedule from "./Schedule";
import Financial from "./Financial";
import Settings from "./Settings";
import Goals from "./Goals";
import Reports from "./Reports";
import Stock from "./Stock";

const PAGES = {
    Dashboard: Dashboard,
    Patients: Patients,
    Appointments: Appointments,
    Schedule: Schedule,
    Financial: Financial,
    Settings: Settings,
    Goals: Goals,
    Reports: Reports,
    Stock: Stock,
}

// Função auxiliar para saber qual menu deixar "ativo"
function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0]; // Padrão: Dashboard
}

// Wrapper que usa o useLocation (precisa estar dentro do Router)
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Dashboard />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                <Route path="/Patients" element={<Patients />} />
                <Route path="/Appointments" element={<Appointments />} />
                <Route path="/Schedule" element={<Schedule />} />
                <Route path="/Financial" element={<Financial />} />
                <Route path="/Settings" element={<Settings />} />
                <Route path="/Goals" element={<Goals />} />
                <Route path="/Reports" element={<Reports />} />
                <Route path="/Stock" element={<Stock />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}