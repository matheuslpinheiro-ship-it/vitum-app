import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { X, DollarSign, List, Save } from 'lucide-react';

const PackageFormModal = ({ isOpen, onClose, patientId, patientName, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [totalSessions, setTotalSessions] = useState(10);
  const [valuePaid, setValuePaid] = useState('');

  if (!isOpen || !patientId) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('patient_packages').insert([{
        patient_id: patientId,
        description,
        total_sessions: totalSessions,
        sessions_remaining: totalSessions, // Inicialmente, o restante é igual ao total
        value_paid: parseFloat(valuePaid) || 0,
        status: 'Ativo'
      }]);

      if (error) throw error;

      alert(`Pacote de ${totalSessions} sessões para ${patientName} registrado com sucesso!`);
      onSave(); // Avisa o pai para recarregar os dados do paciente
      onClose();

    } catch (error) {
      alert("Erro ao registrar pacote: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-vitum-dark flex items-center gap-2">
            <DollarSign className="text-vitum-primary w-6 h-6" /> Registrar Novo Pacote
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <p className="mb-4 text-sm font-medium">Paciente: <span className='text-vitum-primary'>{patientName}</span></p>

        <form onSubmit={handleSave} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Descrição do Pacote</label>
            <input
              type="text"
              placeholder="Ex: Pilates 10x, Fisioterapia 5 Sessões"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Total de Sessões Compradas</label>
                <input
                    type="number"
                    min="1"
                    value={totalSessions}
                    onChange={(e) => setTotalSessions(parseInt(e.target.value) || 0)}
                    className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                    required
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Valor Pago (R$)</label>
                <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={valuePaid}
                    onChange={(e) => setValuePaid(e.target.value)}
                    className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || totalSessions < 1}
            className={`w-full py-3 rounded-lg text-white font-bold transition-colors flex items-center justify-center gap-2 ${loading || totalSessions < 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-vitum-primary hover:bg-[#08905E]'}`}
          >
            <Save size={20} />
            {loading ? 'Registrando...' : 'Registrar Pacote'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PackageFormModal;