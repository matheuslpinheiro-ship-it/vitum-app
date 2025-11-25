import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import moment from 'moment';
import { X, CalendarCheck, XCircle, Trash2, ArrowRight, Clock } from 'lucide-react';

const AppointmentActions = ({ isOpen, onClose, appointment, onUpdate, onNavigateToPatient }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !appointment) return null;

  // Função central para dar baixa no agendamento e no crédito do paciente
  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      let packageError = null;

      // ----------------------------------------------------
      // LÓGICA DE DEDUÇÃO DE CRÉDITO (APENAS SE CONCLUÍDO)
      // ----------------------------------------------------
      if (newStatus === 'Concluído' && appointment.patient_id) {
          // 1. Buscar pacote ativo com mais créditos para o paciente
          const { data: pkgData, error: pkgFetchError } = await supabase
              .from('patient_packages')
              .select('*')
              .eq('patient_id', appointment.patient_id)
              .eq('status', 'Ativo')
              .order('sessions_remaining', { ascending: false })
              .limit(1)
              .single();

          // Se deu erro na busca (exceto "não encontrado", código PGRST116)
          if (pkgFetchError && pkgFetchError.code !== 'PGRST116') {
              throw new Error("Erro ao buscar pacote. " + pkgFetchError.message);
          }

          // Se encontrou pacote com créditos
          if (pkgData && pkgData.sessions_remaining > 0) {
              // 2. Calcular novo saldo
              const newRemaining = pkgData.sessions_remaining - 1;
              const newStatusPackage = newRemaining === 0 ? 'Finalizado' : 'Ativo';

              // 3. Atualizar o pacote no banco
              const { error: pkgUpdateError } = await supabase
                  .from('patient_packages')
                  .update({ sessions_remaining: newRemaining, status: newStatusPackage })
                  .eq('id', pkgData.id);

              if (pkgUpdateError) {
                  packageError = new Error("Erro ao dar baixa no crédito. " + pkgUpdateError.message);
              }
              
          } else if (!pkgData) {
               // Ação concluída, mas sem pacote ativo para decrementar (apenas aviso)
               packageError = new Error("Nenhum pacote ativo encontrado para dar baixa. Verifique se o pacote expirou ou se zerou.");
          }
      }
      
      // 4. Atualizar o status do agendamento (Sempre acontece se não houver erro no pkg)
      const { error: appError } = await supabase
          .from('appointments')
          .update({ status: newStatus })
          .eq('id', appointment.id);

      if (appError) throw appError;

      // 5. Feedback para o usuário
      if (packageError) {
           alert(`Status da consulta atualizado para CONCLUÍDA. \n\nAVISO: ${packageError.message}`);
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
  // ----------------------------------------------------
  // FIM DA LÓGICA
  // ----------------------------------------------------


  const isCompleted = appointment.status === 'Concluído';
  
  // Funções de ação
  const handleComplete = () => updateStatus('Concluído');
  const handleCancel = () => {
    if (window.confirm("Tem certeza que deseja CANCELAR este agendamento?")) {
      updateStatus('Cancelado');
    }
  };

  const handleDelete = async () => {
    if (window.confirm("ATENÇÃO: Este agendamento será DELETADO permanentemente. Deseja continuar?")) {
        setLoading(true);
        try {
            const { error } = await supabase
              .from('appointments')
              .delete()
              .eq('id', appointment.id);
    
            if (error) throw error;
            
            onUpdate(); // Recarrega a agenda
            onClose();
            alert(`Agendamento deletado com sucesso.`);
    
        } catch (error) {
            alert("Erro ao deletar agendamento: " + error.message);
        } finally {
            setLoading(false);
        }
    }
  };
  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-vitum-dark truncate">Ações da Consulta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Informações da Consulta */}
        <div className="mb-6 space-y-2 text-sm">
            <h3 className="text-lg font-bold text-vitum-primary truncate">{appointment.patients?.full_name || 'Paciente Excluído'}</h3>
            <p className="text-gray-600 flex items-center gap-2"><CalendarCheck size={16} /> Data: <span className='font-medium'>{moment(appointment.start_time).format('DD/MM/YYYY')}</span></p>
            <p className="text-gray-600 flex items-center gap-2"><Clock size={16} /> Horário: <span className='font-medium'>{moment(appointment.start_time).format('HH:mm')} - {moment(appointment.end_time).format('HH:mm')}</span></p>
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
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-bold bg-vitum-primary hover:bg-[#08905E] transition-colors disabled:bg-gray-400"
                >
                    <CalendarCheck size={20} />
                    {loading ? 'Dando Baixa...' : 'Marcar como CONCLUÍDA'}
                </button>
            )}

            {!isCompleted && appointment.status !== 'Cancelado' && (
                <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-red-600 border border-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                    <XCircle size={20} />
                    {loading ? 'Processando...' : 'CANCELAR Agendamento'}
                </button>
            )}
            
            {/* Ação: Ver Ficha do Paciente */}
            {appointment.patients?.id && (
                <button
                    onClick={() => onNavigateToPatient(appointment.patients.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-vitum-dark border border-vitum-border hover:bg-gray-50 transition-colors"
                >
                    <ArrowRight size={20} />
                    Ir para Ficha do Paciente
                </button>
            )}
            
            {/* Ação: Deletar Permanentemente */}
            <div className='pt-2 border-t mt-4 border-dashed border-gray-200'>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-red-800 bg-red-100 hover:bg-red-200 transition-colors disabled:opacity-50"
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