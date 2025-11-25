import React, { useState } from 'react';
import { Save, User, Phone, FileText, MapPin, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';

const PatientForm = ({ onSuccess }) => { // Recebe prop para avisar quando salvar
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '', cpf: '', birthDate: '', 
    phone: '', email: '', occupation: '', 
    mainComplaint: '',
    // Novos campos de endereço
    zipCode: '', street: '', number: '', neighborhood: '', city: '', state: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Função Mágica: Busca CEP
  const handleZipBlur = async () => {
    const cep = formData.zipCode.replace(/\D/g, '');
    if (cep.length === 8) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Inserir Paciente
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert([{ 
            full_name: formData.fullName,
            cpf: formData.cpf,
            birth_date: formData.birthDate,
            phone: formData.phone,
            occupation: formData.occupation,
            // Endereço mapeado para o banco
            zip_code: formData.zipCode,
            street: formData.street,
            number: formData.number,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state
          }])
        .select();

      if (patientError) throw patientError;

      // 2. Inserir Anamnese
      if (formData.mainComplaint) {
        const { error: anamnesisError } = await supabase
          .from('patient_anamnesis')
          .insert([{
              patient_id: patientData[0].id,
              main_complaint: formData.mainComplaint
            }]);
        if (anamnesisError) throw anamnesisError;
      }

      alert("Paciente cadastrado com sucesso! 🎉");
      
      // Limpar form
      setFormData({
        fullName: '', cpf: '', birthDate: '', phone: '', email: '', occupation: '', mainComplaint: '',
        zipCode: '', street: '', number: '', neighborhood: '', city: '', state: ''
      });

    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vitum-light p-4 md:p-8 font-sans text-vitum-dark animate-fade-in">
      <header className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-vitum-dark">Novo Paciente</h1>
        <p className="text-gray-500 mt-1">Preencha as informações completas do paciente.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-vitum-border p-6 md:p-8 max-w-4xl mx-auto">
        
        {/* Seção 1: Dados Pessoais */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 border-b border-vitum-border pb-2">
            <User className="w-5 h-5 text-vitum-primary" />
            <h2 className="text-lg font-semibold">Dados Pessoais</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome Completo</label>
              <input required type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">CPF</label>
                <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00"
                  className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Data de Nasc.</label>
                <input required type="date" name="birthDate" value={formData.birthDate} onChange={handleChange}
                  className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: Contato & Profissão */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 border-b border-vitum-border pb-2">
            <Phone className="w-5 h-5 text-vitum-primary" />
            <h2 className="text-lg font-semibold">Contato</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium">WhatsApp</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Profissão</label>
              <input type="text" name="occupation" value={formData.occupation} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>
          </div>
        </div>

        {/* Seção 3: Endereço (NOVO) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 border-b border-vitum-border pb-2">
            <MapPin className="w-5 h-5 text-vitum-primary" />
            <h2 className="text-lg font-semibold">Endereço</h2>
          </div>
          
          <div className="grid grid-cols-12 gap-4">
            {/* CEP */}
            <div className="col-span-12 md:col-span-3 space-y-1">
              <label className="text-sm font-medium">CEP</label>
              <div className="relative">
                <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} onBlur={handleZipBlur} placeholder="00000-000"
                  className="w-full p-2.5 pr-8 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
              </div>
            </div>
            
            {/* Rua */}
            <div className="col-span-12 md:col-span-7 space-y-1">
              <label className="text-sm font-medium">Rua / Logradouro</label>
              <input type="text" name="street" value={formData.street} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none bg-gray-50" />
            </div>

            {/* Número */}
            <div className="col-span-12 md:col-span-2 space-y-1">
              <label className="text-sm font-medium">Número</label>
              <input type="text" name="number" value={formData.number} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none" />
            </div>

            {/* Bairro, Cidade, UF */}
            <div className="col-span-12 md:col-span-5 space-y-1">
              <label className="text-sm font-medium">Bairro</label>
              <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none bg-gray-50" />
            </div>
            <div className="col-span-12 md:col-span-5 space-y-1">
              <label className="text-sm font-medium">Cidade</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none bg-gray-50" />
            </div>
            <div className="col-span-12 md:col-span-2 space-y-1">
              <label className="text-sm font-medium">UF</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none bg-gray-50" />
            </div>
          </div>
        </div>

        {/* Seção 4: Motivo */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 border-b border-vitum-border pb-2">
            <FileText className="w-5 h-5 text-vitum-primary" />
            <h2 className="text-lg font-semibold">Motivo da Consulta</h2>
          </div>
          <textarea required name="mainComplaint" value={formData.mainComplaint} rows="3" onChange={handleChange}
            className="w-full p-2.5 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none resize-none" />
        </div>

        <div className="flex items-center justify-end pt-4">
          <button type="submit" disabled={loading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg bg-vitum-primary text-white font-medium shadow-sm transition-all ${loading ? 'opacity-50' : 'hover:opacity-90'}`}>
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Paciente'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;