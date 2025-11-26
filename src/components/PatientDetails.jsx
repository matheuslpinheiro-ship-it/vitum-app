import React, { useEffect, useState } from 'react';
import { ArrowLeft, User, MapPin, Phone, FileText, Activity, DollarSign, Plus, Clock, Trash2, Edit, Save, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import PackageFormModal from './PackageFormModal';
import PatientEditModal from './PatientEditModal';
import moment from 'moment';

const PatientDetails = ({ patientId, onBack }) => {
  const [patient, setPatient] = useState(null);
  const [anamnesis, setAnamnesis] = useState(null);
  const [evolutions, setEvolutions] = useState([]);
  const [activePackage, setActivePackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false); 
  
  // ESTADOS DA EVOLUÇÃO
  const [newEvo, setNewEvo] = useState({ description: '', painLevel: 0 });
  const [savingEvo, setSavingEvo] = useState(false);
  
  // ESTADOS DA EDIÇÃO DE ANAMNESE
  const [isAnamnesisEditing, setIsAnamnesisEditing] = useState(false);
  const [anamnesisText, setAnamnesisText] = useState('');
  const [savingAnamnesis, setSavingAnamnesis] = useState(false);


  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      setPatient(pData);
      
      const { data: aData } = await supabase.from('patient_anamnesis').select('*').eq('patient_id', patientId).maybeSingle();
      if (aData) {
          setAnamnesis(aData);
          setAnamnesisText(aData.main_complaint); 
      } else {
          setAnamnesis(null); 
          setAnamnesisText("Nenhuma queixa registrada.");
      }

      await fetchEvolutions(patientId);
      
      // Busca Pacotes Ativos
      const { data: pkgData } = await supabase
        .from('patient_packages')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'Ativo')
        .order('sessions_remaining', { ascending: false })
        .limit(1);

      setActivePackage(pkgData ? pkgData[0] : null);

    } catch (error) {
      console.error("Erro ao carregar detalhes do paciente:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para alterar o status de ativo/inativo (Mantida)
  const handleToggleActiveStatus = async () => {
      const newStatus = !patient.is_active;
      const confirmMessage = newStatus 
          ? `Tem certeza que deseja REATIVAR ${patient.full_name}?`
          : `Tem certeza que deseja INATIVAR ${patient.full_name}? O histórico será mantido.`;

      if (!window.confirm(confirmMessage)) return;

      setLoading(true);
      try {
          const { error } = await supabase
              .from('patients')
              .update({ is_active: newStatus })
              .eq('id', patientId);

          if (error) throw error;

          alert(`Paciente ${newStatus ? 'reativado' : 'inativado'} com sucesso!`);
          fetchData(); 
      } catch (error) {
          alert("Erro ao alterar status: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  // NOVO CÓDIGO: Deleção em Cascata (Deleta todos os filhos antes da mãe)
  const handleDeletePatient = async () => {
      if (!window.confirm(`AVISO CRÍTICO: Deletar ${patient.full_name} apagará PERMANENTEMENTE TODOS os dados relacionados (Agendamentos, Transações, Histórico Clínico). Deseja DELETAR PERMANENTEMENTE?`)) return;

      setLoading(true);
      try {
          // Array das tabelas filhas para garantir que os dados sejam apagados antes da tabela 'patients'
          const tablesToDeleteFrom = [
              'transactions',         // 1. Financeiro
              'class_enrollments',    // 2. Matrículas em Turmas
              'patient_packages',     // 3. Pacotes/Planos
              'clinical_evolutions',  // 4. Evoluções
              'patient_anamnesis',    // 5. Anamnese
              'appointments',         // 6. Agendamentos
          ];
          
          let successCount = 0;
          let failureCount = 0;

          // Deleta todos os registros relacionados em cada tabela
          for (const table of tablesToDeleteFrom) {
              const { error } = await supabase.from(table).delete().eq('patient_id', patientId);
              if (error) {
                  console.error(`Falha ao deletar dados de ${table}:`, error);
                  failureCount++;
              } else {
                  successCount++;
              }
          }
          
          // 7. Finalmente, deleta o Paciente (A MÃE)
          const { error: patientDeleteError } = await supabase
              .from('patients')
              .delete()
              .eq('id', patientId);

          if (patientDeleteError) throw patientDeleteError;
          
          if (failureCount > 0) {
              alert(`Paciente deletado, mas houve falhas em ${failureCount} tabelas relacionadas. Verifique o console.`);
          } else {
              alert("Paciente e todos os dados relacionados deletados permanentemente.");
          }
          
          onBack(); // Volta para a lista

      } catch (error) {
          alert("Erro fatal ao deletar paciente: " + error.message);
      } finally {
          setLoading(false);
      }
  };


  // Funções existentes (mantidas)
  const fetchEvolutions = async (id) => { /* ... */ 
      const { data } = await supabase
        .from('clinical_evolutions')
        .select('*')
        .eq('patient_id', id)
        .order('session_date', { ascending: false });
      
      if (data) setEvolutions(data);
  };
  const handleUpdateAnamnesis = async () => { /* ... */
      if (!anamnesis || !anamnesis.id) {
          alert("Erro: Não é possível salvar, o registro inicial de anamnese não existe.");
          return;
      }
      
      setSavingAnamnesis(true);
      try {
          const { error } = await supabase
              .from('patient_anamnesis')
              .update({ main_complaint: anamnesisText })
              .eq('id', anamnesis.id);
              
          if (error) throw error;
          
          alert("Anamnese atualizada com sucesso!");
          fetchData(); 
          setIsAnamnesisEditing(false);

      } catch (error) {
          alert("Erro ao salvar Anamnese: " + error.message);
      } finally {
          setSavingAnamnesis(false);
      }
  };
  const handleAddEvolution = async (e) => { /* ... */
      e.preventDefault();
      if (!newEvo.description) return;
  
      setSavingEvo(true);
      try {
        const { error } = await supabase
          .from('clinical_evolutions')
          .insert([{
            patient_id: patientId,
            description: newEvo.description,
            pain_level: newEvo.painLevel,
            session_date: new Date()
          }]);
  
        if (error) throw error;
        
        setNewEvo({ description: '', painLevel: 0 });
        fetchEvolutions(patientId);
        alert("Evolução registrada! 📝");
  
      } catch (error) {
        alert("Erro ao salvar evolução: " + error.message);
      } finally {
        setSavingEvo(false);
      }
  };
  const handleDeleteEvolution = async (id) => { /* ... */
      if (window.confirm("Tem certeza que deseja apagar este registro?")) {
        await supabase.from('clinical_evolutions').delete().eq('id', id);
        fetchEvolutions(patientId);
      }
  };
  const calculateAge = (dateString) => { /* ... */
      if (!dateString) return '-';
      const today = new Date();
      const birthDate = new Date(dateString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
  };
  
  useEffect(() => {
    fetchData();
  }, [patientId]);


  if (loading) return <div className="p-8 text-center text-gray-500">Carregando ficha...</div>;
  if (!patient) return null;

  const isActive = patient.is_active !== false; // Considera TRUE por padrão se nulo/undefined

  return (
    <>
      <div className="min-h-screen bg-vitum-light p-4 md:p-8 font-sans text-vitum-dark animate-fade-in">
        
        {/* Barra de Ações Rápidas */}
        <div className="flex justify-between items-center mb-6">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-vitum-primary transition-colors font-medium">
                <ArrowLeft size={20} /> Voltar para lista
            </button>
            <div className="flex gap-3">
              {/* Botão de Edição de Dados */}
              <button onClick={() => setEditModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm">
                  <Edit size={16} /> Editar Dados Cadastrais
              </button>
              
              {/* Botão de Ativar/Inativar */}
              <button 
                  onClick={handleToggleActiveStatus}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
                      isActive 
                          ? 'bg-red-500 text-white hover:bg-red-600' 
                          : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                  disabled={loading}
              >
                  {isActive ? <UserX size={16} /> : <UserCheck size={16} />} 
                  {isActive ? 'Inativar Paciente' : 'Reativar Paciente'}
              </button>

              {/* Botão de Delete Permanente */}
              <button
                  onClick={handleDeletePatient}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-red-600 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                  disabled={loading}
              >
                  <Trash2 size={16} /> Deletar
              </button>

            </div>
        </div>

        {/* Status Inativo (Alerta) */}
        {!isActive && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
                <AlertTriangle size={24}/>
                <span className="font-semibold">PACIENTE INATIVO:</span> Este paciente não está mais em tratamento ativo.
            </div>
        )}

        {/* Cabeçalho do Paciente (mantido) */}
        <div className="bg-white rounded-xl shadow-sm border border-vitum-border p-6 mb-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-vitum-primary text-2xl font-bold">
                {patient.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-vitum-dark">{patient.full_name}</h1>
                <div className="flex items-center gap-4 mt-1 text-gray-500 text-sm">
                  <span className="flex items-center gap-1"><User size={14}/> {calculateAge(patient.birth_date)} anos</span>
                  <span className="flex items-center gap-1"><Activity size={14}/> {patient.occupation || 'Sem profissão'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Esquerda: Cartões */}
          <div className="space-y-6">
             
             {/* CARTÃO: SALDO DE CRÉDITOS */}
             <section className={`rounded-xl shadow-sm border p-6 transition-all ${activePackage ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-vitum-dark">
                  <DollarSign className="w-5 h-5 text-vitum-primary" /> Créditos/Sessões
                </h3>
                
                {activePackage ? (
                    <>
                        <div className="text-4xl font-extrabold text-vitum-primary">
                            {activePackage.sessions_remaining}
                        </div>
                        <p className="text-sm text-gray-700 mt-2">
                            Restantes do Pacote: <span className='font-bold'>{activePackage.description}</span>
                        </p>
                    </>
                ) : (
                    <>
                        <div className="text-4xl font-extrabold text-red-500">
                            0
                        </div>
                        <p className="text-sm text-red-700 mt-2 font-medium">
                            Nenhum pacote ativo encontrado.
                        </p>
                    </>
                )}

                <button 
                   onClick={() => setPackageModalOpen(true)}
                   className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors border border-vitum-primary bg-vitum-primary text-white hover:bg-[#08905E]"
                >
                    <Plus size={16} /> Registrar Pacote
                </button>
             </section>

            {/* Cartão Contato (mantido) */}
            <section className="bg-white rounded-xl shadow-sm border border-vitum-border p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-vitum-primary" /> Contato
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-400 text-xs uppercase block">WhatsApp</span> {patient.phone}</p>
                <p><span className="text-gray-400 text-xs uppercase block">Endereço</span> {patient.city} - {patient.state}</p>
              </div>
            </section>
            
          </div>

          {/* Coluna Direita: Evolução Diária */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-vitum-border p-6 min-h-[200px]">
              
              {/* Cabeçalho de Anamnese com BOTÃO DE EDIÇÃO */}
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-vitum-primary" /> Histórico Clínico Inicial
                  </h3>
                  {anamnesis?.id && (
                      <button 
                          onClick={() => setIsAnamnesisEditing(!isAnamnesisEditing)}
                          className='text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors'
                          disabled={savingAnamnesis}
                      >
                          {isAnamnesisEditing ? <X size={16} className='w-4 h-4'/> : <Edit size={16} className='w-4 h-4'/>}
                          {isAnamnesisEditing ? 'Cancelar Edição' : 'Editar Anamnese'}
                      </button>
                  )}
              </div>
              
              {/* Renderização Condicional: Texto ou Formulário */}
              {isAnamnesisEditing ? (
                  <div className="mt-4">
                      <textarea
                          value={anamnesisText}
                          onChange={(e) => setAnamnesisText(e.target.value)}
                          className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none resize-none"
                          rows="6"
                      />
                      <div className='flex justify-end mt-2'>
                          <button
                              onClick={handleUpdateAnamnesis}
                              disabled={savingAnamnesis}
                              className='flex items-center gap-2 px-4 py-2 bg-vitum-primary text-white rounded-lg hover:opacity-90 transition-colors text-sm disabled:opacity-50'
                          >
                              <Save size={16}/> {savingAnamnesis ? 'Salvando...' : 'Salvar Anamnese'}
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <span className="block text-gray-400 text-xs uppercase mb-2 font-bold tracking-wider">Queixa Principal (Motivo da Consulta)</span>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {anamnesisText || "Nenhuma queixa registrada no cadastro inicial."}
                      </p>
                  </div>
              )}
            </section>
             
             {/* Caixa de Nova Evolução */}
             <div className="bg-white rounded-xl shadow-sm border border-vitum-border p-6">
                <h3 className="font-bold text-lg mb-4 text-vitum-dark">Nova Evolução</h3>
                <form onSubmit={handleAddEvolution}>
                  <textarea 
                    placeholder="Descreva o atendimento de hoje..."
                    className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none resize-none mb-4"
                    rows="3"
                    value={newEvo.description}
                    onChange={(e) => setNewEvo({...newEvo, description: e.target.value})}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">Nível de Dor (0-10):</span>
                      <input 
                         type="number" min="0" max="10" 
                         className="w-16 p-2 rounded-lg border border-vitum-border text-center font-bold text-vitum-primary" 
                         value={newEvo.painLevel}
                         onChange={(e) => setNewEvo({...newEvo, painLevel: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <button 
                       type="submit" disabled={savingEvo || !newEvo.description} 
                       className={`flex items-center gap-2 px-4 py-2 bg-vitum-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium text-sm ${savingEvo ? 'opacity-50' : ''}`}
                    >
                      <Plus size={16} /> {savingEvo ? 'Adicionando...' : 'Adicionar Sessão'}
                    </button>
                  </div>
                </form>
            </div>

            {/* Lista de Histórico (Timeline) */}
             <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-600 pl-2">Histórico de Sessões</h3>
                {evolutions.map((evo) => (
                    <div key={evo.id} className="bg-white rounded-xl p-6 border border-vitum-border relative group hover:shadow-md transition-shadow">
                        <button 
                            onClick={() => handleDeleteEvolution(evo.id)}
                            className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir registro"
                        >
                            <Trash2 size={16} />
                        </button>
                        <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                            <Clock size={12} />
                            {moment(evo.session_date).format('DD/MM/YYYY')} às {moment(evo.session_date).format('HH:mm')}
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
                           {evo.description}
                        </p>
                    </div>
                ))}
             </div>
          </div>

        </div>
      </div>
      
      {/* Modais */}
      <PackageFormModal
        isOpen={packageModalOpen}
        onClose={() => setPackageModalOpen(false)}
        patientId={patient.id}
        patientName={patient.full_name}
        onSave={fetchData} 
      />

      <PatientEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        patientData={patient}
        onUpdate={fetchData} 
      />
    </>
  );
};

export default PatientDetails;