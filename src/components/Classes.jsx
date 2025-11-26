import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { List, PlusCircle, Trash2, Edit, UserCheck, Clock, X } from 'lucide-react';
import EnrollmentModal from './EnrollmentModal';

const DAY_OPTIONS = [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' }
];

const Classes = () => {
    const [classesList, setClassesList] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estado do formulário de nova turma
    const [newClass, setNewClass] = useState({
        name: '',
        staff_id: '',
        day_of_week: 1,
        start_time: '08:00',
        duration_minutes: 60,
        max_capacity: 5
    });

    // Estados do Modal de Matrícula
    const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);


    const fetchClassesAndStaff = async () => {
        setLoading(true);
        
        // 1. Buscar Staff
        const { data: sData } = await supabase
            .from('staff')
            .select('id, full_name, roles')
            .eq('is_active', true)
            .or('roles.cs.{Instrutor de Pilates},roles.cs.{Fisioterapeuta}'); // Filtra quem pode dar aula

        setStaffList(sData || []);

        // 2. Buscar Turmas
        const { data: cData } = await supabase
            .from('classes')
            .select(`
                *,
                staff (full_name),
                class_enrollments (count)
            `)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

        // Mapeia e adiciona o nome do staff para facilitar
        const classesWithStaffName = cData.map(cls => ({
            ...cls,
            staff_name: cls.staff?.full_name || 'N/A',
            enrollment_count: cls.class_enrollments[0]?.count || 0
        }));

        setClassesList(classesWithStaffName || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchClassesAndStaff();
    }, []);
    
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setNewClass(prev => ({ 
            ...prev, 
            [name]: type === 'number' ? parseInt(value) || 0 : value 
        }));
    };

    const handleAddClass = async (e) => {
        e.preventDefault();
        if (!newClass.name || !newClass.staff_id) return alert("Nome e Instrutor são obrigatórios.");

        setLoading(true);
        const { error } = await supabase.from('classes').insert([newClass]);

        if (error) {
            console.error('Erro ao adicionar turma:', error);
            alert('Erro ao adicionar turma. Consulte o console.');
        } else {
            setNewClass({ name: '', staff_id: '', day_of_week: 1, start_time: '08:00', duration_minutes: 60, max_capacity: 5 }); 
            fetchClassesAndStaff();
        }
        setLoading(false);
    };

    const handleDeleteClass = async (id) => {
        if (!window.confirm('ATENÇÃO: Deletar esta turma removerá todas as matrículas ativas. Deseja continuar?')) return;
        setLoading(true);
        const { error } = await supabase.from('classes').delete().eq('id', id);

        if (error) {
            console.error('Erro ao deletar turma:', error);
            alert('Erro ao deletar turma. Consulte o console.');
        } else {
            fetchClassesAndStaff();
        }
        setLoading(false);
    };
    
    const openEnrollmentModal = (cls) => {
        setSelectedClass(cls);
        setEnrollmentModalOpen(true);
    };

    const getDayLabel = (dayIndex) => {
        return DAY_OPTIONS.find(d => d.value === dayIndex)?.label || 'N/A';
    };

    return (
        <div className="p-6 md:p-10">
            <h1 className="text-3xl font-extrabold text-vitum-dark mb-4 flex items-center gap-2">
                <List className='text-vitum-primary'/> Gestão de Turmas (Pilates)
            </h1>
            <p className="text-gray-500 mb-6">Crie turmas recorrentes, defina instrutores e gerencie a lotação.</p>
            
            {/* Formulário de Nova Turma */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-vitum-border mb-8">
                <h3 className="text-lg font-semibold mb-4 text-vitum-dark flex items-center gap-2"><PlusCircle size={18} /> Nova Turma</h3>
                <form onSubmit={handleAddClass} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    
                    <input
                        type="text"
                        name="name"
                        placeholder="Nome da Turma (Ex: Pilates Intermediário)"
                        value={newClass.name}
                        onChange={handleChange}
                        className="p-3 border border-vitum-border rounded-lg focus:ring-2 focus:ring-vitum-primary col-span-2"
                        required
                    />
                    
                    <select
                        name="day_of_week"
                        value={newClass.day_of_week}
                        onChange={handleChange}
                        className="p-3 border border-vitum-border rounded-lg focus:ring-2 focus:ring-vitum-primary"
                        required
                    >
                        {DAY_OPTIONS.map(day => (
                            <option key={day.value} value={day.value}>{day.label}</option>
                        ))}
                    </select>

                    <input
                        type="time"
                        name="start_time"
                        value={newClass.start_time}
                        onChange={handleChange}
                        className="p-3 border border-vitum-border rounded-lg focus:ring-2 focus:ring-vitum-primary"
                        required
                    />

                    <select
                        name="staff_id"
                        value={newClass.staff_id}
                        onChange={handleChange}
                        className="p-3 border border-vitum-border rounded-lg focus:ring-2 focus:ring-vitum-primary col-span-1"
                        required
                    >
                        <option value="">-- Instrutor --</option>
                        {staffList.map(staff => (
                            <option key={staff.id} value={staff.id}>{staff.full_name}</option>
                        ))}
                    </select>
                    
                    <input
                        type="number"
                        name="max_capacity"
                        placeholder="Vagas"
                        min="1"
                        value={newClass.max_capacity}
                        onChange={handleChange}
                        className="p-3 border border-vitum-border rounded-lg focus:ring-2 focus:ring-vitum-primary"
                    />

                    <button
                        type="submit"
                        className="p-3 bg-vitum-primary text-white rounded-lg hover:bg-vitum-primary-dark transition-colors font-semibold disabled:opacity-50 md:col-span-1"
                        disabled={loading}
                    >
                        {loading ? 'Criando...' : 'Criar Turma'}
                    </button>
                </form>
            </div>

            {/* Lista de Turmas */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-vitum-border overflow-x-auto">
                <h3 className="text-lg font-semibold mb-4 text-vitum-dark">Turmas Ativas ({classesList.length})</h3>
                {loading ? (
                    <p className="text-center py-4 text-gray-500">Carregando...</p>
                ) : (
                    <table className="min-w-full divide-y divide-vitum-border">
                        <thead>
                            <tr className="bg-vitum-light text-vitum-dark uppercase text-xs font-bold">
                                <th className="px-6 py-3 text-left">Turma</th>
                                <th className="px-6 py-3 text-left">Dia e Hora</th>
                                <th className="px-6 py-3 text-left">Instrutor</th>
                                <th className="px-6 py-3 text-left">Vagas</th>
                                <th className="px-6 py-3 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-vitum-border text-sm">
                            {classesList.map((cls) => (
                                <tr key={cls.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{cls.name}</td>
                                    <td className="px-6 py-4">
                                        {getDayLabel(cls.day_of_week)} às {cls.start_time.substring(0, 5)}
                                    </td>
                                    <td className="px-6 py-4">{cls.staff_name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`font-semibold ${cls.enrollment_count < cls.max_capacity ? 'text-green-600' : 'text-red-600'}`}>
                                            {cls.enrollment_count} / {cls.max_capacity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                                        <button
                                            onClick={() => openEnrollmentModal(cls)}
                                            className="p-1 rounded-full text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1 text-sm"
                                            title="Matricular Alunos"
                                        >
                                            <UserCheck size={16} /> Alunos
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClass(cls.id)}
                                            className="p-1 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                                            title="Deletar Turma"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {classesList.length === 0 && !loading && <p className="text-center py-4 text-gray-500">Nenhuma turma criada.</p>}
            </div>
            
            {/* Modal de Matrícula */}
            <EnrollmentModal
                isOpen={enrollmentModalOpen}
                onClose={() => setEnrollmentModalOpen(false)}
                classData={selectedClass}
                onEnrollmentChange={fetchClassesAndStaff}
            />

        </div>
    );
};

export default Classes;