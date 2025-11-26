import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../supabaseClient';
import { Clock, Plus, Filter, Users as UsersIcon } from 'lucide-react'; 

import AppointmentModal from './AppointmentModal';
import AppointmentActions from './AppointmentActions';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

const SERVICE_OPTIONS = ['Todos', 'Fisioterapia', 'Pilates', 'Avaliação', 'Outro'];

const Scheduler = ({ onNavigateToPatient }) => { 
  const [events, setEvents] = useState([]);
  const [staffList, setStaffList] = useState([]); // Lista de Staff para filtro
  const [loading, setLoading] = useState(true);
  
  // ESTADOS DE FILTRO
  const [selectedStaffId, setSelectedStaffId] = useState('all'); 
  const [selectedServiceType, setSelectedServiceType] = useState('Todos'); 
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [slotInfo, setSlotInfo] = useState(null); 
  
  const [actionsModalOpen, setActionsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);


  // Função central para buscar TUDO
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Buscar Agendamentos Individuais (Appointments)
      const { data: appData, error: appError } = await supabase
        .from('appointments')
        .select(`
          id, patient_id, staff_id, start_time, end_time, description, status, service_type, is_class_event,
          patients (id, full_name, phone),
          staff (full_name)
        `);

      if (appError) throw appError;
      
      let allEvents = [];
      const classEvents = [];

      // 2. Formatar Agendamentos Individuais
      const formattedAppointments = appData.map(app => {
          const staffName = app.staff?.full_name || 'Staff Não Atribuído';
          const patientName = app.patients?.full_name || 'Paciente Excluído';
          
          return {
              id: app.id,
              title: `${patientName} (${staffName})`, 
              start: new Date(app.start_time),
              end: new Date(app.end_time),
              resource: {
                  ...app,
                  start: new Date(app.start_time),
                  end: new Date(app.end_time),
                  is_class_event: app.is_class_event || false, 
                  patients: app.patients || { id: null, full_name: 'Paciente Excluído' }, 
                  staff: app.staff || { full_name: 'Não Atribuído' }
              }, 
          };
      });
      allEvents = [...formattedAppointments];


      // 3. Gerar Eventos Recorrentes de Turma (Classes)
      const { data: classesData, error: classError } = await supabase
          .from('classes')
          .select(`
              id, name, day_of_week, start_time, duration_minutes, max_capacity, is_active, staff_id,
              staff (full_name),
              class_enrollments (patient_id, patients (full_name)) 
          `)
          .eq('is_active', true);

      if (classError) throw classError;


      const startOfPeriod = moment().startOf('week');
      const endOfPeriod = moment().add(4, 'weeks').endOf('week'); // Gera eventos para as próximas 4 semanas

      classesData.forEach(cls => {
          const staffName = cls.staff?.full_name || 'N/A';
          const dayOfWeek = cls.day_of_week;
          
          for (let m = moment(startOfPeriod); m.isSameOrBefore(endOfPeriod); m.add(1, 'day')) {
              if (m.day() === dayOfWeek) { 
                  
                  const [hours, minutes] = cls.start_time.split(':').map(Number);
                  const startDateTime = m.clone().set({ hours, minutes, seconds: 0, milliseconds: 0 }).toDate();
                  const endDateTime = m.clone().set({ hours, minutes, seconds: 0, milliseconds: 0 }).add(cls.duration_minutes, 'minutes').toDate();
                  
                  (cls.class_enrollments || []).forEach(enrollment => {
                      classEvents.push({
                          id: `${cls.id}-${enrollment.patient_id}-${m.format('YYYYMMDD')}`, 
                          title: `${enrollment.patients.full_name} - ${cls.name} (${staffName})`,
                          start: startDateTime,
                          end: endDateTime,
                          resource: {
                              start: startDateTime,
                              end: endDateTime,
                              is_class_event: true,
                              class_id: cls.id,
                              patient_id: enrollment.patient_id,
                              staff_id: cls.staff_id, 
                              status: 'Agendado', 
                              service_type: 'Pilates', 
                              description: cls.name,
                              staff: cls.staff || { full_name: 'Não Atribuído' },
                              patients: enrollment.patients,
                              original_date: m.format('YYYY-MM-DD') 
                          }
                      });
                  });
              }
          }
      });

      setEvents([...formattedAppointments, ...classEvents]);

    } catch (error) {
      alert('Erro ao carregar agenda: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 4. Buscar Staff (para preencher o filtro)
  const fetchStaff = useCallback(async () => {
    const { data } = await supabase
        .from('staff')
        .select('id, full_name, roles')
        .eq('is_active', true);
    setStaffList(data || []);
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchStaff();
  }, [fetchAppointments, fetchStaff]);

  
  // 5. LÓGICA DE FILTRAGEM (MEMOIZED)
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const resource = event.resource;
      
      const staffMatch = selectedStaffId === 'all' || resource.staff_id === selectedStaffId;
      const serviceMatch = selectedServiceType === 'Todos' || resource.service_type === selectedServiceType;
      
      return staffMatch && serviceMatch;
    });
  }, [events, selectedStaffId, selectedServiceType]);


  // Abre o modal de CRIAÇÃO ao clicar em um slot vazio
  const handleSelectSlot = ({ start, end }) => {
    setSlotInfo({ start, end });
    setCreateModalOpen(true);
  };
  
  // Abre o modal de AÇÕES
  const handleSelectEvent = (event) => {
    setSelectedAppointment(event.resource);
    setActionsModalOpen(true);
  };
  
  // LÓGICA DE CORES: Mantida
  const eventStyleGetter = (event) => {
    const status = event.resource.status;
    const serviceType = event.resource.service_type;
    const isClass = event.resource.is_class_event; 

    let backgroundColor = '#3B82F6'; // Azul Padrão (Agendado)

    if (status === 'Concluído') {
        backgroundColor = '#10B981'; // Verde (Concluído)
    } else if (status === 'Cancelado') {
        backgroundColor = '#EF4444'; // Vermelho (Cancelado)
    } else if (isClass) {
        backgroundColor = '#0EA5E9'; // Ciano para Turmas
    } else if (serviceType === 'Fisioterapia') {
        backgroundColor = '#F59E0B'; // Amarelo/Laranja
    } else if (serviceType === 'Avaliação') {
        backgroundColor = '#8B5CF6'; // Roxo
    }

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

  // 2. NOVO: Definição de formatos 24h
  const formats = {
    timeGutterFormat: 'HH:mm', // Barra lateral de horários
    eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
        localizer.format(start, 'HH:mm', culture) + ' - ' + localizer.format(end, 'HH:mm', culture), // Eventos
    dayFormat: 'ddd D/M', // Formato na visualização semanal/diária
  };


  return (
    <div className="p-4 md:p-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-vitum-border h-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4">
            
            <h2 className="text-xl font-bold text-vitum-dark flex items-center gap-2 mb-3 md:mb-0">
              <Clock size={20} className="text-vitum-primary" /> Agenda da Clínica
            </h2>

            <div className='flex gap-4 items-center'>
                {/* Botão Novo Agendamento */}
                <button 
                   onClick={() => handleSelectSlot({ start: moment().toDate(), end: moment().add(60, 'minutes').toDate() })}
                   className="flex items-center gap-2 px-3 py-2 bg-vitum-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                >
                  <Plus size={16} /> Novo Agendamento
                </button>
            </div>
          </div>
          
          {/* 6. CONTROLES DE FILTRO */}
          <div className='flex flex-wrap gap-4 mb-4 items-center'>
              <Filter className='text-gray-500 w-5 h-5'/>
              <span className='font-medium text-sm text-vitum-dark'>Filtrar por:</span>

              {/* Filtro por Colaborador */}
              <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="p-2 border border-vitum-border rounded-lg text-sm focus:ring-vitum-primary focus:border-vitum-primary outline-none"
              >
                  <option value="all">Todos Colaboradores</option>
                  {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                          {staff.full_name}
                      </option>
                  ))}
              </select>

              {/* Filtro por Modalidade */}
              <select
                  value={selectedServiceType}
                  onChange={(e) => setSelectedServiceType(e.target.value)}
                  className="p-2 border border-vitum-border rounded-lg text-sm focus:ring-vitum-primary focus:border-vitum-primary outline-none"
              >
                  {SERVICE_OPTIONS.map(service => (
                      <option key={service} value={service}>
                          {service}
                      </option>
                  ))}
              </select>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-10">Carregando Agenda...</div>
          ) : (
            <div style={{ height: '700px' }}> 
                <Calendar
                  localizer={localizer}
                  events={filteredEvents} 
                  startAccessor="start"
                  endAccessor="end"
                  defaultView="week"
                  views={['month', 'week', 'day', 'agenda']} 
                  style={{ height: '100%' }} 
                  messages={{ 
                    today: 'Hoje', previous: 'Anterior', next: 'Próximo', month: 'Mês', week: 'Semana', day: 'Dia', 
                    agenda: 'Agenda', date: 'Data', time: 'Hora', event: 'Evento', noEventsInRange: 'Nenhum agendamento neste período.'
                  }}
                  selectable 
                  onSelectSlot={handleSelectSlot} 
                  onSelectEvent={handleSelectEvent}
                  eventPropGetter={eventStyleGetter}
                  culture='pt-br'
                  min={moment().hours(7).minutes(0).toDate()}
                  max={moment().hours(21).minutes(0).toDate()}
                  formats={formats} // <--- APLICAÇÃO DO FORMATO 24H
                />
            </div>
          )}
        </div>
        
        {/* Modais */}
        <AppointmentModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            slotInfo={slotInfo}
            onSave={fetchAppointments} 
        />
        
        <AppointmentActions
            isOpen={actionsModalOpen}
            onClose={() => setActionsModalOpen(false)}
            appointment={selectedAppointment}
            onUpdate={fetchAppointments}
            onNavigateToPatient={onNavigateToPatient}
        />
    </div>
  );
};

export default Scheduler;