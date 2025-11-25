import React, { useEffect, useState } from 'react';
import { ArrowLeft, User, MapPin, Phone, FileText, Calendar, Activity, DollarSign, List, Plus, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import PackageFormModal from './PackageFormModal';
import moment from 'moment';

const PatientDetails = ({ patientId, onBack }) => {
  const [patient, setPatient] = useState(null);
  const [anamnesis, setAnamnesis] = useState(null);
  const [evolutions, setEvolutions] = useState([]);
  const [activePackage, setActivePackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  
  // ESTADOS RESTAURADOS DA EVOLUÇÃO
  const [newEvo, setNewEvo] = useState({ description: '', painLevel: 0 });
  const [savingEvo, setSavingEvo] = useState(false);

  // Função central para buscar todos os dados do paciente (Prontuário e Pacotes)
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Paciente e Anamnese
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      setPatient(pData);
      const { data: aData } = await supabase.from('patient_anamnesis').select('*').eq('patient_id', patientId).maybeSingle();
      setAnamnesis(aData);
      
      // 2. Evoluções
      await fetchEvolutions(patientId);
      
      // 3. Pacotes Ativos
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

  // RESTAURADA: Função para buscar o histórico de sessões
  const fetchEvolutions = async (id) => {
    const { data } = await supabase
      .from('clinical_evolutions')
      .select('*')
      .eq('patient_id', id)
      .order('session_date', { ascending: false });
    
    if (data) setEvolutions(data);
  };

  // RESTAURADA: Função para registrar a nova evolução
  const handleAddEvolution = async (e) => {
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
      
      // Limpa form e recarrega lista
      setNewEvo({ description: '', painLevel: 0 });
      fetchEvolutions(patientId); // Recarrega a lista de evoluções
      alert("Evolução registrada! 📝");

    } catch (error) {
      alert("Erro ao salvar evolução: " + error.message);
    } finally {
      setSavingEvo(false);
    }
  };

  // RESTAURADA: Função para deletar evolução
  const handleDeleteEvolution = async (id) => {
    if (window.confirm("Tem certeza que deseja apagar este registro?")) {
      await supabase.from('clinical_evolutions').delete().eq('id', id);
      fetchEvolutions(patientId);
    }
  };
  
  // Efeito de carregamento inicial
  useEffect(() => {
    fetchData();
  }, [patientId]);

  // Função para calcular idade (mantida)
  const calculateAge = (dateString) => {
    if (!dateString) return '-';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando ficha...</div>;
  if (!patient) return null;

  return (
    <>
      <div className="min-h-screen bg-vitum-light p-4 md:p-8 font-sans text-vitum-dark animate-fade-in">
        
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-vitum-primary transition-colors font-medium">
          <ArrowLeft size={20} /> Voltar para lista
        </button>

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
          
          {/* Coluna Esquerda: Informações Cadastrais */}
          <div className="space-y-6">
             
             {/* CARTÃO: SALDO DE CRÉDITOS (NOVO) */}
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
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-vitum-primary" /> Histórico Clínico Inicial
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <span className="block text-gray-400 text-xs uppercase mb-2 font-bold tracking-wider">Queixa Principal (Motivo da Consulta)</span>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {anamnesis?.main_complaint || "Nenhuma queixa registrada no cadastro inicial."}
                </p>
              </div>
            </section>
             
             {/* Caixa de Nova Evolução (RESTAURADA) */}
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
                      <Plus size={16} /> {savingEvo ? 'Salvando...' : 'Adicionar Sessão'}
                    </button>
                  </div>
                </form>
            </div>

            {/* Lista de Histórico (Timeline) - Restaurada a lógica de delete */}
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
      
      {/* NOVO MODAL: Cadastro de Pacotes (Mantido) */}
      <PackageFormModal
        isOpen={packageModalOpen}
        onClose={() => setPackageModalOpen(false)}
        patientId={patient.id}
        patientName={patient.full_name}
        onSave={fetchData} 
      />
    </>
  );
};

export default PatientDetails;