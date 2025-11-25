import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Recebemos a função 'onSelectPatient' do pai (App)
const PatientList = ({ onSelectPatient }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPatients(data);
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="min-h-screen bg-vitum-light p-4 md:p-8 font-sans text-vitum-dark animate-fade-in">
      <header className="mb-8 max-w-5xl mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-gray-500 mt-1">{patients.length} pacientes registrados.</p>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-vitum-border max-w-5xl mx-auto overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-vitum-border">
                <th className="p-4 text-sm text-gray-600">Nome</th>
                <th className="p-4 text-sm text-gray-600">CPF</th>
                <th className="p-4 text-sm text-gray-600">Celular</th>
                <th className="p-4 text-sm text-gray-600">Cidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vitum-border">
              {patients.map((patient) => (
                <tr 
                  key={patient.id} 
                  onClick={() => onSelectPatient(patient.id)} // <--- AQUI ESTÁ A MÁGICA
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="p-4 font-medium text-vitum-dark">{patient.full_name}</td>
                  <td className="p-4 text-gray-500 text-sm">{patient.cpf}</td>
                  <td className="p-4 text-gray-500 text-sm">{patient.phone}</td>
                  <td className="p-4 text-gray-500 text-sm">{patient.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PatientList;