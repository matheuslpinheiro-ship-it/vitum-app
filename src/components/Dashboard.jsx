import React, { useEffect, useState } from 'react';
import { Users, FileText, Activity, PlusCircle, ArrowRight, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState({ totalPatients: 0, totalSessions: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Contar Pacientes
      const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // 2. Contar Total de Sessões (Evoluções)
      const { count: sessionCount } = await supabase
        .from('clinical_evolutions')
        .select('*', { count: 'exact', head: true });

      // 3. Pegar as 5 últimas atividades (Sessões) com o nome do paciente
      // O Supabase permite "join" automático se as chaves estrangeiras estiverem certas
      const { data: recent } = await supabase
        .from('clinical_evolutions')
        .select(`
          id, 
          description, 
          created_at, 
          patients (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({ totalPatients: patientCount || 0, totalSessions: sessionCount || 0 });
      setRecentActivity(recent || []);

    } catch (error) {
      console.error('Erro dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vitum-light p-4 md:p-8 font-sans text-vitum-dark animate-fade-in">
      
      {/* Cabeçalho */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-vitum-dark">Olá, Doutor(a) 👋</h1>
        <p className="text-gray-500 mt-1">Aqui está o resumo da sua clínica hoje.</p>
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Card 1: Pacientes */}
        <div className="bg-white p-6 rounded-xl border border-vitum-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total de Pacientes</p>
            <h2 className="text-3xl font-bold text-vitum-dark">{stats.totalPatients}</h2>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-vitum-primary">
            <Users size={24} />
          </div>
        </div>

        {/* Card 2: Atendimentos */}
        <div className="bg-white p-6 rounded-xl border border-vitum-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Atendimentos Realizados</p>
            <h2 className="text-3xl font-bold text-vitum-dark">{stats.totalSessions}</h2>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Activity size={24} />
          </div>
        </div>

        {/* Card 3: Ação Rápida */}
        <button 
          onClick={() => onNavigate('form')}
          className="bg-vitum-primary p-6 rounded-xl shadow-md flex items-center justify-between text-white hover:bg-[#08905E] transition-colors group"
        >
          <div className="text-left">
            <p className="text-sm font-medium opacity-90 mb-1">Novo Cadastro</p>
            <h2 className="text-xl font-bold">Adicionar Paciente</h2>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <PlusCircle size={20} />
          </div>
        </button>
      </div>

      {/* Seção Inferior: Atividades Recentes */}
      <div className="bg-white rounded-xl shadow-sm border border-vitum-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-vitum-dark flex items-center gap-2">
            <Clock className="w-5 h-5 text-vitum-primary" /> Últimos Atendimentos
          </h3>
          <button onClick={() => onNavigate('list')} className="text-sm text-vitum-primary font-medium hover:underline flex items-center gap-1">
            Ver todos os pacientes <ArrowRight size={14} />
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-400">Carregando dados...</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-gray-400">Nenhuma atividade recente encontrada.</p>
          ) : (
            recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shrink-0">
                  {item.patients?.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-bold text-vitum-dark">
                    {item.patients?.full_name || 'Paciente Removido'}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                    {item.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;