import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Search, UserCheck, Users } from 'lucide-react';

const PatientList = ({ onSelectPatient }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [showActiveOnly, setShowActiveOnly] = useState(true); // <--- NOVO ESTADO: Mostrar apenas ativos

  // Buscamos pacientes baseados no status de ativação
  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('patients')
        .select('*')
        .order('full_name', { ascending: true });
        
      // FILTRO CRÍTICO: Se showActiveOnly for TRUE, adiciona a condição
      if (showActiveOnly) {
          query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPatients(data);
    } catch (error) {
      alert('Erro ao buscar pacientes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Refetch quando o status (showActiveOnly) mudar
  useEffect(() => {
    fetchPatients();
  }, [showActiveOnly]); // <--- Dependência adicionada

  // Lógica de Filtragem (mantida)
  const filteredPatients = useMemo(() => {
    if (!searchTerm) {
      return patients;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return patients.filter(patient =>
      // Filtra por nome ou CPF
      patient.full_name.toLowerCase().includes(lowerCaseSearch) ||
      patient.cpf?.includes(lowerCaseSearch)
    );
  }, [patients, searchTerm]);


  if (loading) return <div className="p-8 text-center text-gray-500">Carregando lista de pacientes...</div>;

  return (
    <div className="min-h-screen bg-vitum-light p-4 md:p-8 font-sans text-vitum-dark animate-fade-in">
      
      {/* Cabeçalho da Lista e Busca */}
      <header className="mb-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
        <p className="text-gray-500 mt-1">Total de {patients.length} pacientes listados.</p>
        
        {/* Barra de Busca e Botão de Filtro */}
        <div className="flex flex-col md:flex-row gap-4 mt-4">
            
            {/* Campo de Busca */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por Nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 rounded-xl border border-vitum-border focus:ring-2 focus:ring-vitum-primary focus:border-transparent outline-none transition-all shadow-sm"
                />
            </div>
            
            {/* Botão de Alternar Status */}
            <button 
                onClick={() => setShowActiveOnly(prev => !prev)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-colors font-medium text-sm shadow-sm border ${
                    showActiveOnly 
                        ? 'bg-red-500 text-white hover:bg-red-600 border-red-500'
                        : 'bg-green-500 text-white hover:bg-green-600 border-green-500'
                }`}
            >
                {showActiveOnly ? <Users size={18} /> : <UserCheck size={18} />}
                {showActiveOnly ? 'Mostrar Inativos' : 'Mostrar Apenas Ativos'}
            </button>
            
        </div>
      </header>

      {/* Tabela de Pacientes */}
      <div className="bg-white rounded-xl shadow-sm border border-vitum-border max-w-5xl mx-auto overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-vitum-border">
                <th className="p-4 font-semibold text-sm text-gray-600">Nome Completo</th>
                <th className="p-4 font-semibold text-sm text-gray-600">Status</th> {/* Nova Coluna */}
                <th className="p-4 font-semibold text-sm text-gray-600">CPF</th>
                <th className="p-4 font-semibold text-sm text-gray-600">Contato</th>
                <th className="p-4 font-semibold text-sm text-gray-600">Cidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vitum-border">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    {searchTerm ? "Nenhum resultado encontrado para a busca." : "Nenhum paciente cadastrado."}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                    const isActive = patient.is_active !== false; // Lógica de ativação
                    return (
                      <tr 
                        key={patient.id} 
                        onClick={() => onSelectPatient(patient.id)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${!isActive && 'opacity-60 bg-gray-100'}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-vitum-primary font-bold text-xs shrink-0">
                              {patient.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-vitum-dark">{patient.full_name}</span>
                          </div>
                        </td>
                        {/* Status */}
                        <td className="p-4">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {isActive ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td className="p-4 text-gray-600 text-sm font-mono">{patient.cpf || '-'}</td>
                        <td className="p-4 text-gray-600 text-sm">{patient.phone || '-'}</td>
                        <td className="p-4 text-gray-600 text-sm">{patient.city || '-'}</td>
                      </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PatientList;