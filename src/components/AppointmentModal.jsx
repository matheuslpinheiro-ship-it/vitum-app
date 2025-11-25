import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import moment from 'moment';
import { X, Calendar, User, Clock, CheckCircle } from 'lucide-react';

const AppointmentModal = ({ isOpen, onClose, slotInfo, onSave }) => {
  const [patients, setPatients] = useState([]); // Todos os pacientes
  const [searchTerm, setSearchTerm] = useState(''); // Termo de busca
  const [selectedPatient, setSelectedPatient] = useState(null); // Paciente selecionado
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60); // Duração em minutos
  const [saving, setSaving] = useState(false);

  // Carrega a lista de todos os pacientes assim que o modal abre
  useEffect(() => {
    if (isOpen) {
      const fetchPatients = async () => {
        const { data } = await supabase.from('patients').select('id, full_name, cpf');
        setPatients(data || []);
      };
      fetchPatients();
    }
  }, [isOpen]);

  // Filtra pacientes baseados no termo de busca (função computada)
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    
    return patients.filter(patient =>
      patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf?.includes(searchTerm)
    ).slice(0, 5); // Limita a 5 resultados
  }, [searchTerm, patients]);

  // Calcula o EndTime baseado no StartTime e Duração
  const endTime = moment(slotInfo?.start).add(duration, 'minutes').toDate();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert("Por favor, selecione um paciente.");
      return;
    }

    setSaving(true);
    try {
      const newAppointment = {
        patient_id: selectedPatient.id,
        start_time: slotInfo.start.toISOString(),
        end_time: endTime.toISOString(),
        description: description || 'Consulta de Fisioterapia',
        status: 'Agendado'
      };

      const { error } = await supabase.from('appointments').insert([newAppointment]);

      if (error) throw error;
      
      onSave(); // Avisa o componente pai para recarregar a agenda
      onClose(); // Fecha o modal
      alert(`Agendamento salvo para ${selectedPatient.full_name}!`);

    } catch (error) {
      alert("Erro ao salvar agendamento: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-vitum-dark flex items-center gap-2">
            <Calendar className="text-vitum-primary w-6 h-6" /> Novo Agendamento
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Informações de Data/Hora */}
        <div className="mb-4 text-sm bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-800">
            <p className='font-medium flex items-center gap-2'>
                <Clock size={16} /> Início: {moment(slotInfo?.start).format('DD/MM/YYYY HH:mm')}
            </p>
            <p className='mt-1 flex items-center gap-2'>
                <Clock size={16} /> Fim (Estimado): {moment(endTime).format('HH:mm')}
            </p>
        </div>

        <form onSubmit={handleSave}>
          
          {/* Campo de Paciente (Busca) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700">1. Buscar Paciente</label>
            <div className="relative">
                <input
                    type="text"
                    placeholder="Nome ou CPF do paciente..."
                    value={selectedPatient ? selectedPatient.full_name : searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSelectedPatient(null);
                    }}
                    className={`w-full p-3 rounded-lg border focus:ring-2 outline-none ${selectedPatient ? 'border-vitum-primary bg-green-50' : 'border-vitum-border focus:ring-vitum-primary'}`}
                    required
                    disabled={selectedPatient}
                />
                
                {/* Botão de Cancelar Seleção */}
                {selectedPatient && (
                    <button
                        type="button"
                        onClick={() => { setSelectedPatient(null); setSearchTerm(''); }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-vitum-primary hover:text-vitum-dark transition-colors"
                        title="Trocar paciente"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Resultados da Busca */}
            {!selectedPatient && searchTerm.length > 2 && filteredPatients.length > 0 && (
              <div className="absolute z-10 w-[95%] bg-white border border-vitum-border rounded-lg mt-1 shadow-lg">
                {filteredPatients.map(patient => (
                  <div
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatient(patient);
                      setSearchTerm(patient.full_name);
                    }}
                    className="p-3 cursor-pointer hover:bg-gray-100 flex justify-between items-center text-sm"
                  >
                    <span>{patient.full_name}</span>
                    <span className='text-gray-500 text-xs'>{patient.cpf}</span>
                  </div>
                ))}
              </div>
            )}
            
            {selectedPatient && (
                <p className='text-xs text-vitum-primary font-medium mt-1 flex items-center gap-1'>
                    <CheckCircle size={14} /> Paciente Selecionado
                </p>
            )}
          </div>

          {/* Campo de Descrição e Duração */}
          <div className='grid grid-cols-3 gap-4 mb-6'>
            <div className='col-span-2'>
                <label className="block text-sm font-medium mb-1 text-gray-700">2. Motivo/Descrição</label>
                <input
                    type="text"
                    placeholder="Fisioterapia, Pilates, Avaliação..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">3. Duração (Min.)</label>
                <input
                    type="number"
                    min="30" max="120" step="15"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                />
            </div>
          </div>
          
          {/* Botão Salvar */}
          <button
            type="submit"
            disabled={saving || !selectedPatient}
            className={`w-full py-3 rounded-lg text-white font-bold transition-colors flex items-center justify-center gap-2 ${saving || !selectedPatient ? 'bg-gray-400 cursor-not-allowed' : 'bg-vitum-primary hover:bg-[#08905E]'}`}
          >
            <Calendar size={20} />
            {saving ? 'Salvando...' : 'Confirmar Agendamento'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;