import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Search, UserCheck, Plus, List } from 'lucide-react';

const EnrollmentModal = ({ isOpen, onClose, classData, onEnrollmentChange }) => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Mapeamento para nomes de dias da semana
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Carrega a lista de pacientes e as matrículas atuais da turma
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, classData]);

    const fetchData = async () => {
        setLoading(true);
        // 1. Buscar todos os pacientes
        const { data: pData } = await supabase.from('patients').select('id, full_name, cpf').order('full_name');
        setPatients(pData || []);

        // 2. Buscar matrículas atuais
        const { data: eData } = await supabase
            .from('class_enrollments')
            .select(`
                id,
                patient_id,
                patients (full_name, phone)
            `)
            .eq('class_id', classData.id);
        
        setEnrollments(eData || []);
        setLoading(false);
    };

    // Filtra pacientes que AINDA NÃO estão matriculados
    const filteredPatients = useMemo(() => {
        if (!searchTerm) return [];
        const lowerCaseSearch = searchTerm.toLowerCase();
        
        const enrolledIds = new Set(enrollments.map(e => e.patient_id));

        return patients
            .filter(patient => !enrolledIds.has(patient.id) && 
                (patient.full_name.toLowerCase().includes(lowerCaseSearch) || patient.cpf?.includes(lowerCaseSearch))
            )
            .slice(0, 5);
    }, [searchTerm, patients, enrollments]);

    const handleEnroll = async (patient) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('class_enrollments').insert([{
                class_id: classData.id,
                patient_id: patient.id
            }]);

            if (error) throw error;
            
            alert(`Paciente ${patient.full_name} matriculado(a)!`);
            setSearchTerm('');
            setSelectedPatient(null);
            fetchData(); // Recarrega matrículas
            onEnrollmentChange(); // Avisa o pai para atualizar a contagem

        } catch (error) {
            alert("Erro ao matricular: " + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleUnenroll = async (enrollmentId, patientName) => {
        if (!window.confirm(`Tem certeza que deseja desmatricular ${patientName} desta turma?`)) return;
        
        setLoading(true);
        try {
            const { error } = await supabase.from('class_enrollments').delete().eq('id', enrollmentId);

            if (error) throw error;
            
            alert(`Paciente ${patientName} desmatriculado(a).`);
            fetchData(); // Recarrega matrículas
            onEnrollmentChange(); // Avisa o pai para atualizar a contagem

        } catch (error) {
            alert("Erro ao desmatricular: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !classData) return null;

    const currentEnrollmentCount = enrollments.length;
    const remainingCapacity = classData.max_capacity - currentEnrollmentCount;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in-up">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-xl font-bold text-vitum-dark flex items-center gap-2">
                        <List className="text-vitum-primary w-6 h-6" /> Matricular na Turma: {classData.name}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Detalhes da Turma e Capacidade */}
                <div className="mb-4 text-sm bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-800">
                    <p className='font-medium'>
                        Instrutor: <span className='text-vitum-dark'>{classData.staff_name}</span>
                    </p>
                    <p className='mt-1'>
                        Horário: <span className='text-vitum-dark'>{dayNames[classData.day_of_week]} às {classData.start_time} ({classData.duration_minutes} min)</span>
                    </p>
                    <p className={`font-bold mt-2 ${remainingCapacity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Vagas: {currentEnrollmentCount} / {classData.max_capacity} ({remainingCapacity} disponíveis)
                    </p>
                </div>
                
                {/* Busca e Matrícula */}
                <div className="mb-6 border-b pb-4">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Plus size={18} /> Adicionar Aluno</h3>
                    {remainingCapacity > 0 ? (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar paciente por Nome ou CPF..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-3 pl-10 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                                    disabled={loading}
                                />
                            </div>

                            {/* Resultados da Busca */}
                            {searchTerm.length > 2 && filteredPatients.length > 0 && (
                                <div className="absolute z-10 w-[95%] max-w-md bg-white border border-vitum-border rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                                    {filteredPatients.map(patient => (
                                        <div
                                            key={patient.id}
                                            onClick={() => handleEnroll(patient)}
                                            className="p-3 cursor-pointer hover:bg-green-50 flex justify-between items-center text-sm transition-colors"
                                        >
                                            <span>{patient.full_name}</span>
                                            <button type='button' className='flex items-center gap-1 text-vitum-primary hover:text-vitum-dark' disabled={loading}>
                                                <UserCheck size={16} /> Matricular
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <p className='text-red-500 font-medium'>A turma atingiu a capacidade máxima de {classData.max_capacity} vagas.</p>
                    )}
                </div>

                {/* Lista de Alunos na Turma */}
                <h3 className="font-semibold text-gray-700 mb-2">Alunos Matriculados ({currentEnrollmentCount}):</h3>
                <ul className='space-y-3 max-h-60 overflow-y-auto'>
                    {loading ? (
                        <p className='text-center text-gray-400'>Carregando matrículas...</p>
                    ) : enrollments.length === 0 ? (
                        <p className='text-gray-500 text-sm'>Nenhum aluno matriculado nesta turma.</p>
                    ) : (
                        enrollments.map(enrollment => (
                            <li key={enrollment.id} className='flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100'>
                                <span className='font-medium text-vitum-dark'>{enrollment.patients.full_name}</span>
                                <button
                                    onClick={() => handleUnenroll(enrollment.id, enrollment.patients.full_name)}
                                    className='text-red-500 hover:text-red-700 transition-colors text-sm'
                                    disabled={loading}
                                >
                                    <X size={16} className='inline mr-1' /> Desmatricular
                                </button>
                            </li>
                        ))
                    )}
                </ul>

            </div>
        </div>
    );
};

export default EnrollmentModal;