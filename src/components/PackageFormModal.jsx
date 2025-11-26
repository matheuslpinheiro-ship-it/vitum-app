import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { X, Save, DollarSign } from 'lucide-react';

const PackageFormModal = ({ isOpen, onClose, patientId, patientName, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    initial_sessions: 0, 
    price: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    payment_status: 'Aguardando',
    type: 'Pacote Antecipado', 
    sessions_per_week: 1 
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: name === 'initial_sessions' || name === 'sessions_per_week' ? parseInt(value) || 0 : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação
    const priceValue = parseFloat(formData.price) || 0;
    if (priceValue <= 0) {
        alert("O valor do plano deve ser maior que zero.");
        return;
    }
    if (formData.type === 'Pacote Antecipado' && formData.initial_sessions <= 0) {
        alert("Para 'Pacote Antecipado', o número de sessões deve ser maior que zero.");
        return;
    }


    setLoading(true);
    try {
      const packageData = {
        patient_id: patientId,
        description: formData.description,
        total_sessions: formData.initial_sessions,
        sessions_remaining: formData.type === 'Pacote Antecipado' ? formData.initial_sessions : 0,
        price: priceValue,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: formData.type === 'Pacote Antecipado' ? 'Ativo' : 'Aguardando Pagamento',
        payment_status: formData.payment_status,
        plan_type: formData.type,
        sessions_per_week: formData.sessions_per_week
      };

      // 1. INSERIR O PACOTE/PLANO NA TABELA patient_packages
      const { error: packageError } = await supabase
        .from('patient_packages')
        .insert([packageData]);

      if (packageError) throw packageError;
      
      
      // 2. INTEGRAÇÃO FINANCEIRA: Criar 'Contas a Receber' se não foi pago
      if (formData.payment_status === 'Aguardando' || formData.payment_status === 'Parcial') {
          
          const transactionDescription = `Plano: ${formData.description} - Paciente: ${patientName}`;
          
          const transactionData = {
              type: 'Receber',
              description: transactionDescription,
              amount: priceValue,
              due_date: formData.start_date, // Data de início do plano como vencimento
              status: 'Pendente', 
              category: 'Mensalidade',
              patient_id: patientId // Vínculo com o paciente
          };
          
          const { error: transactionError } = await supabase
              .from('transactions')
              .insert([transactionData]);
              
          if (transactionError) {
             // Avisa sobre a falha, mas não quebra o registro do pacote
             alert("Aviso: Pacote salvo, mas falha ao criar o Contas a Receber. Verifique o módulo Financeiro.");
          } else {
             alert(`Plano salvo e Contas a Receber (R$ ${priceValue.toFixed(2)}) gerado automaticamente!`);
          }
      } else {
          alert("Plano/Pacote registrado com sucesso!");
      }


      onSave(); // Recarrega a ficha do paciente
      onClose();

    } catch (error) {
      alert("Erro ao salvar plano: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isMonthlyPlan = formData.type === 'Mensalidade Pós-paga';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-vitum-primary flex items-center gap-2">
            <DollarSign className="text-vitum-primary w-6 h-6" /> Registrar Plano/Pacote
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <p className="mb-4 text-sm text-gray-600">Registrando plano para: <span className="font-bold">{patientName}</span></p>

        <form onSubmit={handleSubmit}>
          
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
            {/* Tipo de Plano */}
            <div>
                <label className="text-sm font-medium">Tipo de Cobrança</label>
                <select name="type" value={formData.type} onChange={handleChange} required
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none">
                    <option value="Pacote Antecipado">Pacote Antecipado (Créditos)</option>
                    <option value="Mensalidade Pós-paga">Mensalidade Pós-paga</option>
                </select>
            </div>

            {/* Descrição */}
            <div>
                <label className="text-sm font-medium">Nome do Plano/Pacote</label>
                <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Ex: Pacote 10 Físio / Pilates 2x" required
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>

            {/* Preço */}
            <div>
                <label className="text-sm font-medium">Valor Total (R$)</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="1200.00" required step="0.01"
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>
            
            {/* Status de Pagamento Inicial */}
            <div>
                <label className="text-sm font-medium">Status de Pagamento</label>
                <select name="payment_status" value={formData.payment_status} onChange={handleChange} required
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none">
                    <option value="Aguardando">Aguardando Pagamento</option>
                    <option value="Pago">Pago</option>
                    <option value="Parcial">Parcial</option>
                </select>
            </div>
          </div>
          
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-vitum-border pt-4 mt-4'>
            {/* ------------------------------------------- */}
            {/* CAMPOS CONDICIONAIS */}
            {/* ------------------------------------------- */}
            
            {/* SESSÕES INICIAIS (APENAS PACOTE ANTECIPADO) */}
            {!isMonthlyPlan && (
                <div>
                    <label className="text-sm font-medium">Sessões Iniciais (Créditos)</label>
                    <input type="number" name="initial_sessions" value={formData.initial_sessions} onChange={handleChange} min="0"
                        className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
                </div>
            )}

            {/* FREQUÊNCIA SEMANAL (APENAS MENSALIDADE) */}
            {isMonthlyPlan && (
                <div>
                    <label className="text-sm font-medium">Frequência Semanal (X vezes)</label>
                    <input type="number" name="sessions_per_week" value={formData.sessions_per_week} onChange={handleChange} min="1" max="5"
                        className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
                </div>
            )}

            {/* Data Início */}
            <div>
                <label className="text-sm font-medium">Data de Início</label>
                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>
            
            {/* Data Fim (Opcional) */}
            <div>
                <label className="text-sm font-medium">Data de Fim (Opcional)</label>
                <input type="date" name="end_date" value={formData.end_date} onChange={handleChange}
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button 
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-vitum-primary text-white hover:bg-[#08905E] transition-colors font-medium shadow-sm disabled:opacity-50"
            >
                <Save size={18} />
                {loading ? 'Salvando Plano...' : 'Salvar Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageFormModal;