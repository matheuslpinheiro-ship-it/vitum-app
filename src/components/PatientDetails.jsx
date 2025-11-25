import React, { useEffect, useState } from 'react';
import { ArrowLeft, User, MapPin, Phone, FileText, Calendar, Activity, Plus, Trash2, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

const PatientDetails = ({ patientId, onBack }) => {
  const [patient, setPatient] = useState(null);
  const [anamnesis, setAnamnesis] = useState(null);
  const [evolutions, setEvolutions] = useState([]); // Lista de evoluções
  const [loading, setLoading] = useState(true);

  // Estado do formulário de nova evolução
  const [newEvo, setNewEvo] = useState({ description: '', painLevel: 0 });
  const [savingEvo, setSavingEvo] = useState(false);

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Paciente
      const { data: pData } = await supabase.from('patients').select('*').eq('id', patientId).single();
      setPatient(pData);

      // 2. Anamnese
      const { data: aData } = await supabase.from('patient_anamnesis').select('*').eq('patient_id', patientId).maybeSingle();
      setAnamnesis(aData);

      // 3. Evoluções (Busca as sessões anteriores)
      fetchEvolutions();

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvolutions = async () => {
    const { data } = await supabase
      .from('clinical_evolutions')
      .select('*')
      .eq('patient_id', patientId)
      .order('session_date', { ascending: false }); // Do mais recente para o antigo
    
    if (data) setEvolutions(data);
  };

  // Salvar nova evolução
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
          session_date: new Date() // Salva data/hora de agora
        }]);

      if (error) throw error;

      // Limpa form e recarrega lista
      setNewEvo({ description: '', painLevel: 0 });
      fetchEvolutions();
      alert("Evolução registrada! 📝");

    } catch (error) {
      alert("Erro ao salvar evolução.");
    } finally {
      setSavingEvo(false);
    }
  };

  // Deletar evolução (caso erre)
  const handleDeleteEvolution = async (id) => {
    if (window.confirm("Tem certeza que deseja apagar este registro?")) {
      await supabase.from('clinical_evolutions').delete().eq('id', id);
      fetchEvolutions();
    }
  };

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
    <div className="min-h-screen bg-vitum-light p-4 md:p-8 font-sans text-vitum-dark animate-fade-in">
      
      {/* Topo */}
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-vitum-primary transition-colors font-medium">
        <ArrowLeft size={20} /> Voltar
      </button>

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
        
        {/* Lado Esquerdo: Dados Fixos */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-vitum-border p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-vitum-primary" /> Queixa Principal
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              {anamnesis?.main_complaint || "Não registrada."}
            </p>
          </section>

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

        {/* Lado Direito: Evolução Diária (Chat style) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Caixa de Nova Evolução */}
          <div className="bg-white rounded-xl shadow-sm border border-vitum-border p-6">
            <h3 className="font-bold text-lg mb-4 text-vitum-dark">Nova Evolução</h3>
            <form onSubmit={handleAddEvolution}>
              <textarea 
                placeholder="Descreva o atendimento de hoje (ex: Paciente relatou melhora, realizamos exercícios X, Y...)"
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
                    onChange={(e) => setNewEvo({...newEvo, painLevel: e.target.value})}
                  />
                </div>
                <button 
                  type="submit" disabled={savingEvo}
                  className="flex items-center gap-2 px-4 py-2 bg-vitum-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                >
                  <Plus size={16} /> Adicionar Sessão
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Histórico (Timeline) */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-600 pl-2">Histórico de Sessões</h3>
            
            {evolutions.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhuma evolução registrada ainda.</p>
            ) : (
              evolutions.map((evo) => (
                <div key={evo.id} className="bg-white rounded-xl p-6 border border-vitum-border relative group hover:shadow-md transition-shadow">
                  {/* Botão de excluir (aparece no hover) */}
                  <button 
                    onClick={() => handleDeleteEvolution(evo.id)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Excluir registro"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                    <Clock size={12} />
                    {new Date(evo.session_date).toLocaleDateString('pt-BR')} às {new Date(evo.session_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
                    {evo.description}
                  </p>

                  {/* Badge de Dor */}
                  {evo.pain_level !== null && (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${evo.pain_level > 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      Dor: {evo.pain_level}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientDetails;