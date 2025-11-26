import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, PlusCircle, Trash2, Phone, Mail, User, CheckCircle, XCircle } from 'lucide-react';

// Opções de função para checkboxes
const AVAILABLE_ROLES = [
    'Fisioterapeuta',
    'Instrutor de Pilates',
    'Administrador',
    'Secretaria'
];

const Staff = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estado do formulário de novo colaborador
    const [newStaff, setNewStaff] = useState({
        full_name: '',
        roles: [], // Agora é um array
        contact_phone: '',
        email: '',
        is_active: true
    });

    const fetchStaff = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) {
            console.error('Erro ao buscar colaboradores:', error);
        } else {
            setStaffList(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStaff();
    }, []);
    
    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setNewStaff({ ...newStaff, [e.target.name]: value });
    };

    // NOVO: Lidar com mudança nos checkboxes de funções
    const handleRoleChange = (role) => {
        setNewStaff(prev => {
            const currentRoles = prev.roles || [];
            if (currentRoles.includes(role)) {
                return { ...prev, roles: currentRoles.filter(r => r !== role) };
            } else {
                return { ...prev, roles: [...currentRoles, role] };
            }
        });
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        if (!newStaff.full_name || newStaff.roles.length === 0) {
            return alert("Nome e pelo menos uma função são obrigatórios.");
        }

        setLoading(true);
        const { error } = await supabase.from('staff').insert([newStaff]);

        if (error) {
            console.error('Erro ao adicionar colaborador:', error);
            alert('Erro ao adicionar colaborador. Consulte o console.');
        } else {
            setNewStaff({ full_name: '', roles: [], contact_phone: '', email: '', is_active: true });
            fetchStaff();
        }
        setLoading(false);
    };

    const handleDeleteStaff = async (id) => {
        if (!window.confirm('Tem certeza que deseja deletar este colaborador?')) return;
        setLoading(true);
        const { error } = await supabase.from('staff').delete().eq('id', id);

        if (error) {
            console.error('Erro ao deletar colaborador:', error);
            alert('Erro ao deletar colaborador. Consulte o console.');
        } else {
            fetchStaff();
        }
        setLoading(false);
    };

    return (
        <div className="p-6 md:p-10">
            <h1 className="text-3xl font-extrabold text-vitum-dark mb-4 flex items-center gap-2">
                <Users className='text-vitum-primary'/> Gestão de Colaboradores
            </h1>
            <p className="text-gray-500 mb-6">Cadastre fisioterapeutas, instrutores de pilates e staff administrativo.</p>
            
            {/* Formulário de Novo Colaborador */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-vitum-border mb-8">
                <h3 className="text-lg font-semibold mb-4 text-vitum-dark flex items-center gap-2"><PlusCircle size={18} /> Novo Colaborador</h3>
                <form onSubmit={handleAddStaff} className="space-y-4">
                    
                    {/* Linha 1: Dados Pessoais */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            name="full_name"
                            placeholder="Nome Completo"
                            value={newStaff.full_name}
                            onChange={handleChange}
                            className="p-3 border border-vitum-border rounded-lg focus:ring-2 focus:ring-vitum-primary col-span-1"
                            required
                        />
                         <input
                            type="text"
                            name="contact_phone"
                            placeholder="Telefone"
                            value={newStaff.contact_phone}
                            onChange={handleChange}
                            className="p-3 border border-vitum-border rounded-lg focus:ring-2 focus:ring-vitum-primary col-span-1"
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={newStaff.email}
                            onChange={handleChange}
                            className="p-3 border border-vitum-border rounded-lg focus:ring-2 focus:ring-vitum-primary col-span-1"
                        />
                        <div className='flex items-center justify-between gap-4'>
                            {/* Checkbox Ativo */}
                            <label className="flex items-center gap-2 text-gray-700">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={newStaff.is_active}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-vitum-primary rounded border-gray-300 focus:ring-vitum-primary"
                                />
                                Ativo
                            </label>
                             <button
                                type="submit"
                                className="p-3 bg-vitum-primary text-white rounded-lg hover:bg-vitum-primary-dark transition-colors font-semibold disabled:opacity-50 flex-1"
                                disabled={loading}
                            >
                                {loading ? 'Adicionando...' : 'Adicionar Staff'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Linha 2: Múltiplas Funções (Checkboxes) */}
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Funções/Especialidades:</label>
                        <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            {AVAILABLE_ROLES.map(role => (
                                <label key={role} className="flex items-center gap-2 text-gray-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newStaff.roles.includes(role)}
                                        onChange={() => handleRoleChange(role)}
                                        className="h-4 w-4 text-vitum-primary rounded border-gray-300 focus:ring-vitum-primary"
                                    />
                                    {role}
                                </label>
                            ))}
                        </div>
                    </div>

                </form>
            </div>

            {/* Lista de Colaboradores */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-vitum-border overflow-x-auto">
                <h3 className="text-lg font-semibold mb-4 text-vitum-dark">Staff Ativo ({staffList.length})</h3>
                {loading ? (
                    <p className="text-center py-4 text-gray-500">Carregando...</p>
                ) : (
                    <table className="min-w-full divide-y divide-vitum-border">
                        <thead>
                            <tr className="bg-vitum-light text-vitum-dark uppercase text-xs font-bold">
                                <th className="px-6 py-3 text-left">Nome</th>
                                <th className="px-6 py-3 text-left">Funções</th>
                                <th className="px-6 py-3 text-left">Contato</th>
                                <th className="px-6 py-3 text-left">Status</th>
                                <th className="px-6 py-3 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-vitum-border text-sm">
                            {staffList.map((staff) => (
                                <tr key={staff.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium flex items-center gap-2"><User size={16}/> {staff.full_name}</td>
                                    <td className="px-6 py-4">
                                        {/* Exibe todas as funções separadas por vírgula */}
                                        {(staff.roles || []).join(', ') || 'Não especificado'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className='flex items-center gap-2'>
                                            {staff.contact_phone && <span className='text-gray-500'><Phone size={14} title={staff.contact_phone}/></span>}
                                            {staff.email && <span className='text-gray-500'><Mail size={14} title={staff.email}/></span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                         <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            staff.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                          }`}>
                                            {staff.is_active ? 'Ativo' : 'Inativo'}
                                          </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleDeleteStaff(staff.id)}
                                            className="p-1 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                                            title="Deletar Colaborador"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {staffList.length === 0 && !loading && <p className="text-center py-4 text-gray-500">Nenhum colaborador registrado.</p>}
            </div>
        </div>
    );
};

export default Staff;