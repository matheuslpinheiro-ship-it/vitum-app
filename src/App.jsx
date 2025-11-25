import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, LayoutDashboard, LogOut, Calendar } from 'lucide-react'; // Importei Calendar
import { supabase } from './supabaseClient';

// Componentes
import Login from "./components/Login";
import PatientForm from "./components/PatientForm";
import PatientList from "./components/PatientList";
import PatientDetails from "./components/PatientDetails";
import Dashboard from "./components/Dashboard";
import Scheduler from "./components/Scheduler"; // Importei o Scheduler

function App() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
    const { data: { subscription }, } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  // Lógica de navegação
  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
    setCurrentView('details');
  };

  const handleBackToList = () => {
    setSelectedPatientId(null);
    setCurrentView('list');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentView} />;
      case 'scheduler': return <Scheduler onNavigateToPatient={handleSelectPatient} />; // <--- Passando a função
      case 'details': return selectedPatientId ? <PatientDetails patientId={selectedPatientId} onBack={handleBackToList} /> : <Dashboard onNavigate={setCurrentView} />;
      case 'form': return <PatientForm />;
      case 'list': default: return <PatientList onSelectPatient={handleSelectPatient} />;
    }
  };

  const MenuButton = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setCurrentView(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === id ? 'bg-green-50 text-vitum-primary' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      <Icon size={20} /> {label}
    </button>
  );

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-vitum-light">
      
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-vitum-border hidden md:flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-vitum-border">
            <div className="flex items-center gap-2 text-vitum-dark font-bold text-2xl tracking-tighter">
              <div className="w-8 h-8 rounded-full bg-vitum-primary flex items-center justify-center text-white">V</div>
              vitum
            </div>
          </div>
          <nav className="p-4 space-y-2">
            <MenuButton id="dashboard" icon={LayoutDashboard} label="Visão Geral" />
            <MenuButton id="scheduler" icon={Calendar} label="Agenda" /> {/* <--- NOVO BOTÃO */}
            <MenuButton id="list" icon={Users} label="Pacientes" />
            <MenuButton id="form" icon={PlusCircle} label="Novo Cadastro" />
          </nav>
        </div>

        {/* Rodapé do Menu (Logout) */}
        <div className="p-4 border-t border-vitum-border">
           <div className="mb-4 px-2">
              <p className="text-xs text-gray-400 font-bold uppercase">Usuário</p>
              <p className="text-sm text-vitum-dark truncate">{session.user.email}</p>
           </div>
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
           >
             <LogOut size={18} /> Sair do Sistema
           </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto h-screen relative">
        {/* Menu Mobile */}
        <div className="md:hidden p-4 bg-white border-b border-vitum-border flex justify-between items-center sticky top-0 z-10">
           <span className="font-bold text-xl text-vitum-dark">vitum</span>
           <button onClick={() => setCurrentView('scheduler')} className={currentView === 'scheduler' ? "text-vitum-primary" : "text-gray-600"}><Calendar size={20}/></button>
           <button onClick={() => setCurrentView('list')} className={currentView === 'list' ? "text-vitum-primary" : "text-gray-600"}><Users size={20}/></button>
           <button onClick={() => setCurrentView('form')} className={currentView === 'form' ? "text-vitum-primary" : "text-gray-600"}><PlusCircle size={20}/></button>
        </div>
        
        {renderContent()}
      </main>
    </div>
  )
}

export default App;