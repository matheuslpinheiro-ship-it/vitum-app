import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Save, MapPin, Search } from 'lucide-react';

// Este modal recebe os dados ATUAIS do paciente e a função de recarregar a ficha
const PatientEditModal = ({ isOpen, onClose, patientData, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  // Inicializa o estado com os dados recebidos para preencher os campos
  const [formData, setFormData] = useState(patientData || {});

  // Atualiza o estado do formulário sempre que patientData mudar (necessário para re-uso)
  useEffect(() => {
    setFormData(patientData || {});
  }, [patientData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Lógica de busca de CEP (mantida)
  const handleZipBlur = async () => {
    const cep = formData.zip_code?.replace(/\D/g, '');
    if (cep && cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.log("Erro ao buscar CEP");
      }
    }
  };

  // Dentro do PatientEditModal.jsx
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // AQUI ESTÁ O NOVO TESTE: SE ISSO APARECER, A FUNÇÃO RODOU.
    alert("TESTE: Função de Envio Iniciada!"); 
    
    setLoading(true);
    
    // Filtramos apenas os campos que queremos atualizar e garantimos que o ID é o correto
    const updateData = {
        full_name: formData.full_name,
        cpf: formData.cpf,
        birth_date: formData.birth_date,
        phone: formData.phone, 
        occupation: formData.occupation,
        zip_code: formData.zip_code,
        street: formData.street,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state
    };
    
    // LINHA DE DEBUG (Que deve aparecer no terminal)
    console.log('--- OBJETO SENDO ENVIADO PARA O SUPABASE ---');
    console.log(updateData);
    console.log('-------------------------------------------');

    try {
      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', patientData.id);

      if (error) throw error;

      onUpdate();
      onClose();
      alert("Cadastro atualizado com sucesso!");

    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !patientData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-8 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-vitum-dark flex items-center gap-2">
            <Save className="text-vitum-primary w-6 h-6" /> Editando: {patientData.full_name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Seção 1: Dados Pessoais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {/* Nome Completo */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome Completo</label>
              <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleChange} required
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>
            {/* CPF / Data Nasc */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">CPF</label>
                <input type="text" name="cpf" value={formData.cpf || ''} onChange={handleChange}
                  className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Data de Nasc.</label>
                <input type="date" name="birth_date" value={formData.birth_date || ''} onChange={handleChange} required
                  className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
              </div>
            </div>
          </div>
          
          {/* Seção 2: Contato & Profissão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-sm font-medium">WhatsApp / Celular</label>
              <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Profissão</label>
              <input type="text" name="occupation" value={formData.occupation || ''} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>
          </div>


          {/* Seção 3: Endereço */}
          <div className="border-t border-vitum-border pt-4">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-vitum-primary" /> Endereço
            </h3>
            <div className="grid grid-cols-12 gap-4">
                {/* CEP */}
                <div className="col-span-12 md:col-span-3 space-y-1">
                <label className="text-sm font-medium">CEP</label>
                <div className="relative">
                    <input type="text" name="zip_code" value={formData.zip_code || ''} onChange={handleChange} onBlur={handleZipBlur} placeholder="00000-000"
                    className="w-full p-2.5 pr-8 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                </div>
                </div>
                
                {/* Rua */}
                <div className="col-span-12 md:col-span-7 space-y-1">
                <label className="text-sm font-medium">Rua / Logradouro</label>
                <input type="text" name="street" value={formData.street || ''} onChange={handleChange}
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none bg-gray-50" />
                </div>

                {/* Número */}
                <div className="col-span-12 md:col-span-2 space-y-1">
                <label className="text-sm font-medium">Número</label>
                <input type="text" name="number" value={formData.number || ''} onChange={handleChange}
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
                </div>

                {/* Bairro, Cidade, UF */}
                <div className="col-span-12 md:col-span-5 space-y-1">
                <label className="text-sm font-medium">Bairro</label>
                <input type="text" name="neighborhood" value={formData.neighborhood || ''} onChange={handleChange}
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none bg-gray-50" />
                </div>
                <div className="col-span-12 md:col-span-5 space-y-1">
                <label className="text-sm font-medium">Cidade</label>
                <input type="text" name="city" value={formData.city || ''} onChange={handleChange}
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none bg-gray-50" />
                </div>
                <div className="col-span-12 md:col-span-2 space-y-1">
                <label className="text-sm font-medium">UF</label>
                <input type="text" name="state" value={formData.state || ''} onChange={handleChange}
                    className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none bg-gray-50" />
                </div>
            </div>
          </div>
          

          <div className="flex items-center justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg border border-vitum-border text-vitum-dark hover:bg-gray-50 transition-colors font-medium">
                Cancelar
            </button>
            <button 
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-vitum-primary text-white hover:bg-[#08905E] transition-colors font-medium shadow-sm disabled:opacity-50"
            >
                <Save size={18} />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientEditModal;