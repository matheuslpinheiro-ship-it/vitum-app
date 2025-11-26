import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import moment from 'moment';
import { X, CalendarCheck, XCircle, Trash2, ArrowRight, Clock, Users, List } from 'lucide-react';

const AppointmentActions = ({ isOpen, onClose, appointment, onUpdate, onNavigateToPatient }) => {
  const [loading, setLoading] = useState(false);

  // ----------------------------------------------------
  // VERIFICAÇÃO DE DADOS (CRÍTICA CONTRA TELA BRANCA)
  // ----------------------------------------------------
  if (!isOpen || !appointment) return null;

  // Garantir que as datas são válidas antes de tentar formatar (erro comum)
  const isStartValid = appointment.start && moment(appointment.start).isValid();
  const isEndValid = appointment.end && moment(appointment.end).isValid();

  if (!isStartValid || !isEndValid) {
    // Se o evento for inválido, mas o modal está tentando abrir, apenas fecha e loga o erro.
    console.error("Erro no evento de Agendamento: Datas inválidas.", appointment);
    // Não retorna null, mas sim um modal de erro, evitando a tela branca total.
    if (appointment.status === 'Concluído') return null; 
  }
  
  // Função central para dar baixa no agendamento e no crédito do paciente
  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      let packageError = null;
      let updatePromise = null;

      // ----------------------------------------------------
      // LÓGICA DE DEDUÇÃO DE CRÉDITO (APENAS SE CONCLUÍDO)
      // ----------------------------------------------------
      if (newStatus === 'Concluído' && appointment.patient_id) {
          // 1. Buscar pacote ativo
          const { data: pkgData, error: pkgFetchError } = await supabase
              .from('patient_packages')
              .select('*')
              .eq('patient_id', appointment.patient_id)
              .eq('status', 'Ativo')
              .order('sessions_remaining', { ascending: false })
              .limit(1)
              .single();

          if (pkgFetchError && pkgFetchError.code !== 'PGRST116') {
              throw new Error("Erro ao buscar pacote. " + pkgFetchError.message);
          }

          if (pkgData && pkgData.sessions_remaining > 0) {
              const newRemaining = pkgData.sessions_remaining - 1;
              const newStatusPackage = newRemaining === 0 ? 'Finalizado' : 'Ativo';

              // 2. Atualizar o pacote no banco
              const { error: pkgUpdateError } = await supabase
                  .from('patient_packages')
                  .update({ sessions_remaining: newRemaining, status: newStatusPackage })
                  .eq('id', pkgData.id);

              if (pkgUpdateError) {
                  packageError = new Error("Erro ao dar baixa no crédito. " + pkgUpdateError.message);
              }
              
          } else {
               packageError = new Error("Nenhum pacote ativo encontrado para dar baixa. O crédito não foi deduzido.");
          }
      }
      
      // ----------------------------------------------------
      // ATUALIZAÇÃO DO STATUS (Diferente para eventos de Turma)
      // ----------------------------------------------------
      if (appointment.is_class_event && newStatus === 'Concluído') {
          // A. SE FOR EVENTO DE TURMA E CONCLUÍDO: INSERIR um registro permanente.
          const { error: insertError } = await supabase
              .from('appointments')
              .insert([{
                  patient_id: appointment.patient_id,
                  staff_id: appointment.staff_id,
                  start_time: appointment.start.toISOString(), // Usando o start/end do evento gerado
                  end_time: appointment.end.toISOString(),
                  description: `Sessão de ${appointment.service_type} (Turma: ${appointment.description})`,
                  status: 'Concluído',
                  service_type: appointment.service_type,
                  is_class_event: true 
              }]);

          if (insertError) throw insertError;
          
      } else if (!appointment.is_class_event) {
          // B. SE FOR EVENTO INDIVIDUAL: Apenas atualiza o status.
          updatePromise = supabase
              .from('appointments')
              .update({ status: newStatus })
              .eq('id', appointment.id);
      }
      
      // Aguarda a promessa de update se existir
      if (updatePromise) {
          const { error: appError } = await updatePromise;
          if (appError) throw appError;
      }


      // ----------------------------------------------------
      // FEEDBACK
      // ----------------------------------------------------
      if (packageError) {
           alert(`Consulta concluída, mas com AVISO: ${packageError.message}`);
      } else {
           alert(`Status atualizado para: ${newStatus}! O crédito foi dado baixa.`);
      }

      onUpdate(); // Recarrega a agenda
      onClose();

    } catch (error) {
      console.error(error);
      alert("Erro fatal na transação: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async () => {
    if (!window.confirm("ATENÇÃO: Este agendamento será DELETADO permanentemente. Deseja continuar?")) return;
    
    // Bloqueia a exclusão de eventos de turma (que são dinâmicos)
    if (appointment.is_class_event) {
        alert("Não é possível deletar um evento de turma. Se necessário, desmatricule o paciente da turma na tela 'Turmas'.");
        return;
    }
    
    setLoading(true);
    try {
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', appointment.id);

        if (error) throw error;
        
        onUpdate(); 
        onClose();
        alert(`Agendamento deletado com sucesso.`);

    } catch (error) {
        alert("Erro ao deletar agendamento: " + error.message);
    } finally {
        setLoading(false);
    }
  };
  
  const isCompleted = appointment.status === 'Concluído';
  
  // Funções de ação
  const handleComplete = () => updateStatus('Concluído');
  const handleCancel = () => {
    if (appointment.is_class_event) {
        alert("Não é possível cancelar um evento de turma. Ele desaparecerá da agenda se o paciente for desmatriculado.");
        return;
    }
    if (window.confirm("Tem certeza que deseja CANCELAR este agendamento?")) {
      updateStatus('Cancelado');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
        
        {/* Header (mantido) */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-vitum-dark truncate">Ações da Consulta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Informações da Consulta */}
        <div className="mb-6 space-y-2 text-sm">
            <h3 className="text-lg font-bold text-vitum-primary truncate">{appointment.patients?.full_name || 'Paciente Excluído'}</h3>
            <p className="text-gray-600 flex items-center gap-2"><Users size={16} /> Colaborador: <span className='font-medium'>{appointment.staff?.full_name || 'Não Atribuído'}</span></p> 
            
            {appointment.is_class_event && (
                <p className="text-sm font-bold text-blue-600 bg-blue-50 p-1 rounded-md flex items-center gap-1">
                   <List size={16} /> Evento de Turma: {appointment.description}
                </p>
            )}

            <p className="text-gray-600 flex items-center gap-2"><CalendarCheck size={16} /> Data: <span className='font-medium'>{moment(appointment.start).format('DD/MM/YYYY')}</span></p>
            <p className="text-gray-600 flex items-center gap-2"><Clock size={16} /> Horário: <span className='font-medium'>{moment(appointment.start).format('HH:mm')} - {moment(appointment.end).format('HH:mm')}</span></p>
            <p className="text-gray-600 flex items-center gap-2">Motivo: <span className='font-medium'>{appointment.description || 'Não especificado'}</span></p>
            <p className={`font-bold mt-2 py-1 px-2 rounded text-white text-xs inline-block ${
                appointment.status === 'Concluído' ? 'bg-green-600' :
                appointment.status === 'Cancelado' ? 'bg-red-600' :
                'bg-blue-600'
            }`}>
                Status: {appointment.status}
            </p>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-3">
            {!isCompleted && appointment.status !== 'Cancelado' && (
                <button
                    onClick={handleComplete}
                    disabled={loading || (appointment.is_class_event && appointment.status === 'Concluído')} 
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-bold bg-vitum-primary hover:bg-[#08905E] transition-colors disabled:bg-gray-400"
                >
                    <CalendarCheck size={20} />
                    {loading ? 'Dando Baixa...' : 'Marcar como CONCLUÍDA'}
                </button>
            )}

            {/* Ação: Ver Ficha do Paciente (mantido) */}
            {appointment.patients?.id && (
                <button
                    onClick={() => onNavigateToPatient(appointment.patients.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-vitum-dark border border-vitum-border hover:bg-gray-50 transition-colors"
                >
                    <ArrowRight size={20} />
                    Ir para Ficha do Paciente
                </button>
            )}
            
            {/* Ação: Deletar/Cancelar */}
            <div className='pt-2 border-t mt-4 border-dashed border-gray-200'>
                {!appointment.is_class_event && appointment.status !== 'Concluído' && (
                    <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 mb-2 rounded-lg text-red-600 border border-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        <XCircle size={20} /> CANCELAR Agendamento
                    </button>
                )}
                <button
                    onClick={handleDelete}
                    disabled={loading || appointment.is_class_event} 
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${appointment.is_class_event ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                    title={appointment.is_class_event ? "Eventos de turma não podem ser deletados individualmente." : "Deletar Agendamento"}
                >
                    <Trash2 size={16} />
                    {loading ? 'Deletando...' : 'Deletar Permanentemente'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentActions;