import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import moment from 'moment';
import { X, Calendar, User, Clock, CheckCircle, Users } from 'lucide-react';

const AppointmentModal = ({ isOpen, onClose, slotInfo, onSave }) => {
  const [patients, setPatients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [serviceType, setServiceType] = useState('Fisioterapia');
  const [saving, setSaving] = useState(false);
  
  const initialStart = slotInfo?.start || new Date();
  const [selectedDate, setSelectedDate] = useState(moment(initialStart).format('YYYY-MM-DD'));
  const [selectedTime, setSelectedTime] = useState(moment(initialStart).format('HH:mm')); // HH:mm garante 24h


  // Carrega a lista de pacientes e staff ao abrir
  useEffect(() => {
    if (isOpen) {
      // Reinicializa o estado de data/hora quando abre
      const start = slotInfo?.start || new Date();
      setSelectedDate(moment(start).format('YYYY-MM-DD'));
      setSelectedTime(moment(start).format('HH:mm')); // Garante 24h na inicialização

      const fetchData = async () => {
        // 1. Pacientes
        const { data: pData } = await supabase.from('patients').select('id, full_name, cpf');
        setPatients(pData || []);
        
        // 2. Staff (Apenas ativos)
        const { data: sData } = await supabase
            .from('staff')
            .select('id, full_name, roles')
            .eq('is_active', true);
        setStaffList(sData || []);
      };
      fetchData();
    }
  }, [isOpen, slotInfo]);

  // Filtra pacientes (mantido)
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    
    return patients.filter(patient =>
      patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf?.includes(searchTerm)
    ).slice(0, 5);
  }, [searchTerm, patients]);

  // Calcula o EndTime baseado nas inputs manuais
  const startDateTime = moment(`${selectedDate} ${selectedTime}`);
  const endTime = startDateTime.clone().add(duration, 'minutes').toDate();


  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedStaffId) {
      alert("Por favor, selecione o paciente e o colaborador responsável.");
      return;
    }
    
    const finalStart = startDateTime.toDate();
    if (isNaN(finalStart.getTime())) {
        alert("Data ou hora inválida.");
        return;
    }

    setSaving(true);
    try {
      const newAppointment = {
        patient_id: selectedPatient.id,
        staff_id: selectedStaffId,
        start_time: finalStart.toISOString(), // Usando a data/hora combinada
        end_time: endTime.toISOString(),      // Usando o fim calculado
        description: description || serviceType,
        status: 'Agendado',
        service_type: serviceType
      };

      const { error } = await supabase.from('appointments').insert([newAppointment]);

      if (error) throw error;
      
      onSave(); 
      onClose();
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
        
        {/* Header (mantido) */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-vitum-dark flex items-center gap-2">
            <Calendar className="text-vitum-primary w-6 h-6" /> Novo Agendamento
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* 1. Seleção Manual de Data/Hora */}
        <div className="mb-4 bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <h3 className='font-semibold text-sm text-vitum-dark mb-2'>Ajustar Data e Horário</h3>
            <div className='grid grid-cols-2 gap-3 text-sm'>
                {/* Input de Data */}
                <div>
                    <label className="block text-gray-600 mb-1">Data</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-2 rounded-lg border border-vitum-border focus:ring-vitum-primary outline-none"
                        required
                    />
                </div>
                {/* Input de Hora */}
                <div>
                    <label className="block text-gray-600 mb-1">Hora Início</label>
                    <input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full p-2 rounded-lg border border-vitum-border focus:ring-vitum-primary outline-none"
                        required
                    />
                </div>
            </div>
            {/* Visualização de Fim Estimado */}
            <p className='mt-2 text-xs text-gray-500 flex items-center gap-1'>
                <Clock size={14} /> Fim Estimado: {moment(endTime).format('HH:mm')}
            </p>
        </div>

        <form onSubmit={handleSave}>
          
          {/* 2. Campo de Paciente (mantido) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700">1. Buscar Paciente</label>
            {/* ... (código do input de busca e resultados) ... */}
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

            {/* Resultados da Busca (mantido) */}
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
          
          {/* 3. Campo de Colaborador */}
          <div className='mb-4'>
              <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-2">
                <Users size={16}/> 2. Colaborador Responsável
              </label>
              <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                  required
              >
                  <option value="">-- Selecione o Profissional --</option>
                  {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                          {staff.full_name} ({staff.roles.join(', ')})
                      </option>
                  ))}
              </select>
          </div>


          {/* 4. Tipo de Serviço e Duração */}
          <div className='grid grid-cols-2 gap-4 mb-4'>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">3. Tipo de Serviço</label>
                <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                    required
                >
                    <option value="Fisioterapia">Fisioterapia</option>
                    <option value="Pilates">Pilates</option>
                    <option value="Avaliação">Avaliação</option>
                    <option value="Outro">Outro</option>
                </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">4. Duração (Min.)</label>
                <input
                    type="number"
                    min="30" max="120" step="15"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                />
            </div>
          </div>


          {/* Campo de Descrição (mantido) */}
          <div className='mb-6'>
            <label className="block text-sm font-medium mb-1 text-gray-700">Descrição/Detalhes (Opcional)</label>
            <input
                type="text"
                placeholder="Detalhe se for turma, ou tipo de tratamento..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
            />
          </div>
          
          {/* Botão Salvar (mantido) */}
          <button
            type="submit"
            disabled={saving || !selectedPatient || !selectedStaffId}
            className={`w-full py-3 rounded-lg text-white font-bold transition-colors flex items-center justify-center gap-2 ${saving || !selectedPatient || !selectedStaffId ? 'bg-gray-400 cursor-not-allowed' : 'bg-vitum-primary hover:bg-[#08905E]'}`}
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