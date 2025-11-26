import React, { useEffect, useState } from 'react';
import { Users, FileText, Activity, PlusCircle, ArrowRight, Clock, Calendar, CheckCircle, DollarSign, User } from 'lucide-react';
import { supabase } from '../supabaseClient';
import moment from 'moment';

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState({ 
    totalPatients: 0, 
    sessionsToday: 0, 
    physioCount: 0, 
    pilatesCount: 0,
    creditValue: 0, // NOVO: Saldo total de créditos (Valor)
    creditSessions: 0, // NOVO: Saldo total de créditos (Sessões)
  });
  const [staffProductivity, setStaffProductivity] = useState([]); // NOVO: Produtividade por Staff
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const today = moment().startOf('day').toISOString();
      const startOfMonth = moment().startOf('month').toISOString();
      
      // 1. Contar Pacientes Ativos
      const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true); // Apenas ativos

      // 2. Contar Sessões CONCLUÍDAS HOJE (KPI de Produtividade)
      const { count: sessionsToday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Concluído')
        .gte('start_time', today);
        
      // 3. Contar Sessões de Fisioterapia e Pilates (Geral)
      const { count: physioCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('service_type', 'Fisioterapia');

      const { count: pilatesCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('service_type', 'Pilates');
        
      // 4. Calcular Saldo Total de Créditos Remanescentes (Receita Futura)
      const { data: packagesData } = await supabase
          .from('patient_packages')
          .select('sessions_remaining, total_sessions, price')
          .eq('status', 'Ativo')
          .gt('sessions_remaining', 0); // Apenas pacotes com saldo

      let totalRemainingSessions = 0;
      let totalRemainingValue = 0;

      packagesData?.forEach(pkg => {
          totalRemainingSessions += pkg.sessions_remaining;
          
          if (pkg.price && pkg.total_sessions > 0) {
              const pricePerSession = pkg.price / pkg.total_sessions;
              totalRemainingValue += pricePerSession * pkg.sessions_remaining;
          }
      });
      
      // 5. Produtividade do Staff (Sessões Concluídas no Mês)
      const { data: productivityData } = await supabase
        .from('appointments')
        .select(`
            staff_id,
            staff (full_name)
        `)
        .eq('status', 'Concluído')
        .gte('start_time', startOfMonth);

      // Agrupa resultados por Staff
      const productivityMap = productivityData.reduce((acc, app) => {
          const staffId = app.staff_id;
          const staffName = app.staff?.full_name || 'Staff Não Atribuído';
          
          if (staffId) {
              acc[staffId] = acc[staffId] || { name: staffName, count: 0 };
              acc[staffId].count += 1;
          }
          return acc;
      }, {});
      
      // Converte para array ordenado
      const staffProdArray = Object.values(productivityMap).sort((a, b) => b.count - a.count);

      // 6. Última Atividade
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

      setStats({ 
        totalPatients: patientCount || 0, 
        sessionsToday: sessionsToday || 0,
        physioCount: physioCount || 0,
        pilatesCount: pilatesCount || 0,
        creditSessions: totalRemainingSessions,
        creditValue: totalRemainingValue,
      });
      setStaffProductivity(staffProdArray);
      setRecentActivity(recent || []);

    } catch (error) {
      console.error('Erro dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalServices = stats.physioCount + stats.pilatesCount;
  const physioPercent = totalServices > 0 ? ((stats.physioCount / totalServices) * 100).toFixed(0) : 0;
  const pilatesPercent = totalServices > 0 ? ((stats.pilatesCount / totalServices) * 100).toFixed(0) : 0;

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando Painel de Controle...</div>;

  return (
    <div className="min-h-screen bg-vitum-light p-4 md:p-8 font-sans text-vitum-dark animate-fade-in">
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-vitum-dark">Visão Geral 📊</h1>
        <p className="text-gray-500 mt-1">Dados estratégicos em tempo real.</p>
      </header>

      {/* Linha de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* KPI 1: Total Pacientes Ativos */}
        <div className="bg-white p-6 rounded-xl border border-vitum-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Pacientes Ativos</p>
            <h2 className="text-3xl font-bold text-vitum-dark">{stats.totalPatients}</h2>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-vitum-primary">
            <Users size={24} />
          </div>
        </div>

        {/* KPI 2: Sessões Concluídas Hoje */}
        <div className="bg-white p-6 rounded-xl border border-vitum-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Sessões Concluídas Hoje</p>
            <h2 className="text-3xl font-bold text-blue-600">{stats.sessionsToday}</h2>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <CheckCircle size={24} />
          </div>
        </div>

        {/* KPI 3: Receita Futura (Sessões) */}
        <div className="bg-white p-6 rounded-xl border border-vitum-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Créditos Pendentes (Sessões)</p>
            <h2 className="text-3xl font-bold text-yellow-600">{stats.creditSessions}</h2>
          </div>
          <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
            <DollarSign size={24} />
          </div>
        </div>

        {/* KPI 4: Receita Futura (Valor Estimado) */}
        <div className="bg-white p-6 rounded-xl border border-vitum-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Receita Futura (Estimada)</p>
            <h2 className="text-2xl font-bold text-vitum-primary">R$ {stats.creditValue.toFixed(2)}</h2>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-vitum-primary">
            <DollarSign size={24} />
          </div>
        </div>
        
      </div>
      
      {/* Linha de Indicadores de Serviço e Produtividade */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          
        {/* Card de Breakdown de Serviços (Pilates vs Físio) */}
        <div className="bg-white rounded-xl shadow-sm border border-vitum-border p-6 md:col-span-1">
             <h3 className="font-bold text-lg text-vitum-dark mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-vitum-primary" /> Distribuição de Serviços
             </h3>
             {totalServices > 0 ? (
                <>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-3 flex">
                        <div 
                            className="h-full bg-yellow-500" 
                            style={{ width: `${physioPercent}%` }}
                        />
                        <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${pilatesPercent}%` }}
                        />
                    </div>
                    <div className='grid grid-cols-2 text-sm'>
                        <p className='font-medium text-vitum-dark'>Fisioterapia: <span className='text-gray-500'>{stats.physioCount} ({physioPercent}%)</span></p>
                        <p className='font-medium text-vitum-dark'>Pilates: <span className='text-gray-500'>{stats.pilatesCount} ({pilatesPercent}%)</span></p>
                    </div>
                </>
             ) : (
                <p className='text-gray-500 text-sm'>Nenhuma sessão agendada para análise.</p>
             )}
        </div>
        
        {/* Card de Produtividade por Colaborador */}
        <div className="bg-white rounded-xl shadow-sm border border-vitum-border p-6 md:col-span-2">
            <h3 className="font-bold text-lg text-vitum-dark mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-vitum-primary" /> Produtividade (Mês Atual)
            </h3>
            <div className="space-y-3">
                {staffProductivity.length === 0 ? (
                    <p className="text-gray-400 text-sm">Nenhuma sessão concluída por colaboradores neste mês.</p>
                ) : (
                    staffProductivity.map(item => (
                        <div key={item.name} className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                            <span className='font-medium text-vitum-dark'>{item.name}</span>
                            <span className='font-bold text-lg text-vitum-primary'>{item.count}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
          
      </div>
      
      {/* Última Atividade (Mantido) */}
      <div className='mt-6'>
          <div className="bg-white rounded-xl shadow-sm border border-vitum-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-vitum-dark flex items-center gap-2">
                    <Clock className="w-5 h-5 text-vitum-primary" /> Última Atividade
                </h3>
                <button onClick={() => onNavigate('list')} className="text-sm text-vitum-primary font-medium hover:underline flex items-center gap-1">
                    Pacientes <ArrowRight size={14} />
                </button>
              </div>
  
              <div className="space-y-4">
              {recentActivity.length === 0 ? (
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
                          {moment(item.created_at).format('DD/MM/YYYY HH:mm')}
                      </p>
                      </div>
                  </div>
                  ))
              )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;