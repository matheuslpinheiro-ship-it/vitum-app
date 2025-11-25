import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../supabaseClient';
import { Clock, Plus } from 'lucide-react';

import AppointmentModal from './AppointmentModal';
import AppointmentActions from './AppointmentActions'; // <--- IMPORTAMOS O MODAL DE AÇÕES

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

// O Scheduler agora recebe uma função para navegar até o paciente.
const Scheduler = ({ onNavigateToPatient }) => { 
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para o Modal de Criação
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [slotInfo, setSlotInfo] = useState(null); 
  
  // Estado para o Modal de Ações (Eventos existentes)
  const [actionsModalOpen, setActionsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // 1. Busca todos os agendamentos existentes
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, patient_id, start_time, end_time, description, status,
          patients (id, full_name, phone) 
        `);

      if (error) throw error;

      // Mapeia os dados, garantindo que o objeto 'patients' está presente no 'resource'
      const formattedEvents = data.map(app => ({
        id: app.id,
        title: `${app.patients?.full_name || 'Paciente excluído'} - ${app.description}`,
        start: new Date(app.start_time),
        end: new Date(app.end_time),
        resource: {
            ...app,
            patients: app.patients || { id: null, full_name: 'Paciente Excluído' } // Garante que patients está presente
        }, 
      }));

      setEvents(formattedEvents);
    } catch (error) {
      alert('Erro ao carregar agenda: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Abre o modal de CRIAÇÃO ao clicar em um slot vazio
  const handleSelectSlot = ({ start, end }) => {
    setSlotInfo({ start, end });
    setCreateModalOpen(true);
  };
  
  // Abre o modal de AÇÕES ao clicar em um evento existente
  const handleSelectEvent = (event) => {
    setSelectedAppointment(event.resource);
    setActionsModalOpen(true);
  };
  
  // Customização dos estilos
  const eventStyleGetter = (event) => {
    const status = event.resource.status;
    let backgroundColor = '#09A66D'; 
    
    if (status === 'Concluído') backgroundColor = '#10B981'; // Verde Claro
    if (status === 'Agendado') backgroundColor = '#3B82F6'; // Azul
    if (status === 'Cancelado') backgroundColor = '#EF4444'; // Vermelho

    const style = {
      backgroundColor,
      borderRadius: '5px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block'
    };
    return { style };
  };


  return (
    <div className="p-4 md:p-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-vitum-border h-[800px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-vitum-dark flex items-center gap-2">
              <Clock size={20} className="text-vitum-primary" /> Agenda da Clínica
            </h2>
            <button 
               onClick={() => handleSelectSlot({ start: new Date(), end: moment().add(60, 'minutes').toDate() })}
               className="flex items-center gap-2 px-3 py-2 bg-vitum-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
            >
              <Plus size={16} /> Novo Agendamento
            </button>
          </div>
          
          {loading ? (
            <div className="text-center text-gray-500 py-10">Carregando Agenda...</div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              defaultView="week"
              style={{ height: '700px' }}
              messages={{ 
                today: 'Hoje', previous: 'Anterior', next: 'Próximo', month: 'Mês', week: 'Semana', day: 'Dia', 
                agenda: 'Agenda', date: 'Data', time: 'Hora', event: 'Evento', noEventsInRange: 'Nenhum agendamento neste período.'
              }}
              selectable 
              onSelectSlot={handleSelectSlot} // Abre o modal de CRIAÇÃO
              onSelectEvent={handleSelectEvent} // Abre o modal de AÇÕES
              eventPropGetter={eventStyleGetter}
              culture='pt-br'
              views={['month', 'week', 'day', 'agenda']}
              min={moment().hours(7).minutes(0).toDate()}
              max={moment().hours(21).minutes(0).toDate()}
            />
          )}
        </div>
        
        {/* Modal de CRIAÇÃO (Novo Agendamento) */}
        <AppointmentModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            slotInfo={slotInfo}
            onSave={fetchAppointments}
        />
        
        {/* Modal de AÇÕES (Agendamento Existente) */}
        <AppointmentActions
            isOpen={actionsModalOpen}
            onClose={() => setActionsModalOpen(false)}
            appointment={selectedAppointment}
            onUpdate={fetchAppointments}
            onNavigateToPatient={onNavigateToPatient} // Passa a função de navegação
        />
    </div>
  );
};

export default Scheduler;