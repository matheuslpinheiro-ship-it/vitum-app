import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { DollarSign, List, PlusCircle, RefreshCw, X, CheckCircle, Trash2, User, BarChart as BarChartIcon } from 'lucide-react';
import moment from 'moment';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    PieChart, Pie, Cell 
} from 'recharts';

// ===============================================
// CONSTANTES E CORES
// ===============================================

const CATEGORY_OPTIONS = ['Mensalidade', 'Insumos', 'Aluguel', 'Salário', 'Outros'];
const PAYMENT_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Transferência'];
const COLORS = ['#0CAF77', '#34D399', '#FCD34D', '#EF4444', '#6B7280', '#10B981', '#FBBF24']; // Cores para o Pie Chart


// ===============================================
// FUNÇÕES UTILITÁRIAS DE MÁSCARA
// ===============================================

const formatCurrencyBRL = (value) => {
    if (!value) return '';
    let cleanedValue = String(value).replace(/\D/g, '');

    if (cleanedValue.length === 0) return '';
    if (cleanedValue.length < 3) {
        cleanedValue = cleanedValue.padStart(3, '0');
    }
    
    let floatValue = (parseInt(cleanedValue, 10) / 100).toFixed(2);
    return 'R$ ' + floatValue.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
};

const parseCurrencyBRL = (maskedValue) => {
    if (!maskedValue) return 0;
    const cleaned = String(maskedValue).replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
};

const formatTableCurrency = (value) => {
    return 'R$ ' + parseFloat(value).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
};

// ===============================================
// Componente de Formulário de Transação (Mantido)
// ===============================================

const TransactionFormModal = ({ isOpen, onClose, onSave }) => {
    // ... Lógica do Modal Form
    const [formData, setFormData] = useState({
        type: 'Receber', 
        description: '',
        amount: '', 
        due_date: new Date().toISOString().split('T')[0],
        category: 'Outros',
        payment_method: PAYMENT_METHODS[0] 
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                type: 'Receber',
                description: '',
                amount: '',
                due_date: new Date().toISOString().split('T')[0],
                category: 'Outros',
                payment_method: PAYMENT_METHODS[0]
            });
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'amount') {
             setFormData(prev => ({ ...prev, [name]: formatCurrencyBRL(value) }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const rawAmount = parseCurrencyBRL(formData.amount);
        
        if (rawAmount <= 0) {
            alert("O valor da transação deve ser maior que zero.");
            return;
        }
        if (!formData.description || !formData.due_date) {
            alert("Descrição e data de vencimento são obrigatórios.");
            return;
        }

        setLoading(true);
        try {
            const transactionToInsert = {
                type: formData.type,
                description: formData.description,
                amount: rawAmount,
                due_date: formData.due_date,
                category: formData.category,
                status: 'Pendente',
                payment_method: formData.type === 'Receber' ? formData.payment_method : null
            };

            const { error } = await supabase.from('transactions').insert([transactionToInsert]);

            if (error) throw error;
            
            onClose(); 
            onSave();
            alert(`Transação de ${formData.type} salva com sucesso!`);

        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            alert('Erro ao salvar transação. Consulte o console.'); 
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isReceber = formData.type === 'Receber';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
                
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-xl font-bold text-vitum-dark flex items-center gap-2">
                        <PlusCircle className="text-vitum-primary w-6 h-6" /> Nova Transação
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    {/* Tipo de Transação */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Tipo</label>
                        <select name="type" value={formData.type} onChange={handleChange} required
                            className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                        >
                            <option value="Receber">Contas a Receber (Entrada)</option>
                            <option value="Pagar">Contas a Pagar (Saída)</option>
                        </select>
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        {/* Valor (Com Máscara) */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1 text-gray-700">Valor</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                name="amount" 
                                value={formData.amount} 
                                onChange={handleChange} 
                                placeholder="R$ 0,00" 
                                required 
                                className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                            />
                        </div>

                        {/* Data de Vencimento */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1 text-gray-700">Vencimento</label>
                            <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} required
                                className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                            />
                        </div>
                    </div>
                    
                    {/* Descrição */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Descrição/Referência</label>
                        <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder={isReceber ? "Ex: Mensalidade Paciente X" : "Ex: Aluguel da Clínica"} required
                            className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                        />
                    </div>
                    
                    {/* Linha de Categoria e Forma de Pagamento */}
                    <div className='grid grid-cols-2 gap-4 mb-6'>
                        {/* Categoria */}
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Categoria</label>
                            <select name="category" value={formData.category} onChange={handleChange} required
                                className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                            >
                                 {CATEGORY_OPTIONS.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Forma de Pagamento (Apenas para Contas a Receber) */}
                        {isReceber && (
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Forma de Pagamento</label>
                                <select name="payment_method" value={formData.payment_method} onChange={handleChange} required={isReceber}
                                    className="w-full p-3 rounded-lg border border-vitum-border focus:ring-2 focus:ring-vitum-primary outline-none"
                                >
                                     {PAYMENT_METHODS.map(method => (
                                        <option key={method} value={method}>{method}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg text-white font-bold transition-colors bg-vitum-primary hover:bg-[#08905E] disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : `Salvar Contas a ${formData.type}`}
                    </button>
                </form>
            </div>
        </div>
    );
};


// ===============================================
// Componente Principal: Financials
// ===============================================

const Financials = () => {
  const [activeTab, setActiveTab] = useState('Pagar'); 
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cashFlowSummary, setCashFlowSummary] = useState({
      totalPendente: 0,
      totalPago: 0,
      saldo: 0
  });
  
  // Estado para a aba de Relatórios
  const [activeView, setActiveView] = useState('Table'); // 'Table' ou 'Reports'

  // Transações que já foram liquidadas (status 'Pago')
  const liquidatedTransactions = useMemo(() => transactions.filter(tx => tx.status === 'Pago'), [transactions]);

  // ===============================================
  // LÓGICA DE GERAÇÃO DE DADOS PARA RELATÓRIOS
  // ===============================================

  const { monthlyCashFlow, receitasByCategory, despesasByCategory } = useMemo(() => {
    const monthlyDataMap = {};
    const receitasMap = {};
    const despesasMap = {};

    liquidatedTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      
      // 1. Dados para Fluxo de Caixa Mensal
      const monthYear = moment(tx.payment_date || tx.due_date).format('MM/YYYY');
      const monthKey = moment(tx.payment_date || tx.due_date).format('YYYY-MM'); // Chave para ordenação
      
      if (!monthlyDataMap[monthKey]) {
        monthlyDataMap[monthKey] = { 
          name: moment(tx.payment_date || tx.due_date).format('MM/YY'), 
          Receitas: 0, 
          Despesas: 0,
          sortKey: monthKey
        };
      }

      if (tx.type === 'Receber') {
        monthlyDataMap[monthKey].Receitas += amount;
        
        // 2. Dados para Distribuição de Receitas
        receitasMap[tx.category] = (receitasMap[tx.category] || 0) + amount;
      } else {
        monthlyDataMap[monthKey].Despesas += amount;
        
        // 3. Dados para Distribuição de Despesas
        despesasMap[tx.category] = (despesasMap[tx.category] || 0) + amount;
      }
    });

    // Ordenar o Fluxo de Caixa Mensal
    const monthlyCashFlowArray = Object.values(monthlyDataMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(item => ({ name: item.name, Receitas: item.Receitas, Despesas: item.Despesas }));
      
    // Formatar Mapas para o Pie Chart
    const receitasArray = Object.keys(receitasMap).map(key => ({
        name: key,
        value: receitasMap[key]
    })).sort((a, b) => b.value - a.value);
    
    const despesasArray = Object.keys(despesasMap).map(key => ({
        name: key,
        value: despesasMap[key]
    })).sort((a, b) => b.value - a.value);

    return { 
        monthlyCashFlow: monthlyCashFlowArray, 
        receitasByCategory: receitasArray, 
        despesasByCategory: despesasArray 
    };
  }, [liquidatedTransactions]);


  // ===============================================
  // LÓGICA DE BUSCA E RESUMO (Mantida e Atualizada)
  // ===============================================

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    // Busca o nome do paciente relacionado
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        patients (full_name)
      `)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar transações:', error);
    } else {
      setTransactions(data || []);
      calculateSummary(data || []);
    }
    setLoading(false);
  }, []);

  const calculateSummary = (data) => {
    const summary = data.reduce((acc, tx) => {
        const amount = parseFloat(tx.amount);
        const factor = tx.type === 'Receber' ? 1 : -1; 

        if (tx.status === 'Pendente' || tx.status === 'Atrasado') {
            acc.totalPendente += amount * factor;
        }
        if (tx.status === 'Pago') {
            acc.totalPago += amount * factor;
        }

        return acc;
    }, { totalPendente: 0, totalPago: 0, saldo: 0 });
    
    summary.saldo = summary.totalPendente + summary.totalPago; 

    setCashFlowSummary(summary);
  };
  
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Lógica de Ações (Liquidar/Deletar) - Mantida
  const handleMarkAsPaid = async (tx) => {
    const today = new Date().toISOString().split('T')[0];
    
    let method = tx.payment_method; 
    
    if (tx.type === 'Receber' && !tx.payment_method) {
        const chosenMethod = window.prompt(`Selecione a Forma de Recebimento para R$ ${tx.amount.toFixed(2).replace('.', ',')}: \n\nOpções: ${PAYMENT_METHODS.join(', ')}`);
        
        if (!chosenMethod || !PAYMENT_METHODS.map(m => m.toLowerCase()).includes(chosenMethod.toLowerCase())) {
            alert('Forma de pagamento inválida ou cancelada. A transação não foi liquidada.');
            return;
        }
        method = chosenMethod;
    }

    if (!window.confirm(`Tem certeza que deseja liquidar ${tx.type} "${tx.description}"?`)) return;
    
    setLoading(true);
    try {
        const { error } = await supabase.from('transactions')
            .update({ status: 'Pago', payment_date: today, payment_method: method })
            .eq('id', tx.id);

        if (error) throw error;
        
        alert(`${tx.type} liquidada!`);
        fetchTransactions();
    } catch (error) {
        console.error('Erro ao liquidar:', error);
        alert('Erro ao liquidar. Consulte o console.');
    } finally {
        setLoading(false);
    }
  };
  
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta transação?')) return;
    setLoading(true);
    try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);

        if (error) throw error;
        
        alert("Transação deletada.");
        fetchTransactions();
    } catch (error) {
        console.error('Erro ao deletar transação:', error);
        alert('Erro ao deletar transação. Consulte o console.');
    } finally {
        setLoading(false);
    }
  };


  const filteredTransactions = transactions.filter(tx => tx.type === activeTab)
    .map(tx => {
        if (tx.status === 'Pendente' && moment(tx.due_date).isBefore(moment(), 'day')) {
            return { ...tx, status: 'Atrasado' };
        }
        return tx;
    })
    .sort((a, b) => {
        if (a.status === 'Atrasado' && b.status !== 'Atrasado') return -1;
        if (b.status === 'Atrasado' && a.status !== 'Atrasado') return 1;
        if (a.status === 'Pendente' && b.status === 'Pago') return -1;
        if (b.status === 'Pendente' && a.status === 'Pago') return 1;
        return moment(a.due_date).valueOf() - moment(b.due_date).valueOf(); 
    });


  const TabButton = ({ tab, label, view }) => (
    <button
      onClick={() => { setActiveView(view); setActiveTab(tab) }}
      className={`flex items-center gap-2 py-2 px-4 rounded-t-lg font-medium transition-colors border-b-2 
        ${(activeView === view && activeTab === tab)
          ? 'text-vitum-primary border-vitum-primary bg-vitum-light' 
          : 'text-gray-600 border-transparent hover:border-gray-300 hover:text-vitum-dark'}`
      }
    >
      {label}
    </button>
  );
  
  const ViewButton = ({ view, icon, label }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border 
        ${activeView === view 
          ? 'bg-vitum-primary text-white border-vitum-primary' 
          : 'bg-white text-gray-700 hover:bg-gray-50'}`
      }
    >
      {icon}
      {label}
    </button>
  );

  const getStatusColor = (status) => {
    switch(status) {
        case 'Pago': return 'bg-green-100 text-green-800';
        case 'Pendente': return 'bg-yellow-100 text-yellow-800';
        case 'Atrasado': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getSummaryColor = (value) => {
      if (value > 0) return 'text-green-600';
      if (value < 0) return 'text-red-600';
      return 'text-vitum-dark';
  };
  
  // ===============================================
  // COMPONENTES DE GRÁFICOS
  // ===============================================
  
  // Tooltip customizado para o BarChart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-lg text-sm">
          <p className="font-bold text-vitum-dark mb-1">{label}</p>
          {payload.map((p, index) => (
              <p key={index} style={{ color: p.color }}>
                  {p.name}: {formatTableCurrency(p.value)}
              </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Gráfico de Fluxo de Caixa Mensal
  const MonthlyCashFlowChart = ({ data }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-vitum-border">
      <h3 className="text-xl font-semibold mb-4 text-vitum-dark">Fluxo de Caixa Líquido (Receitas vs. Despesas)</h3>
      <p className="text-sm text-gray-500 mb-4">Apenas transações com status 'Pago' são consideradas.</p>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#6B7280" />
            <YAxis 
                tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                stroke="#6B7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="Receitas" fill="#0CAF77" radius={[5, 5, 0, 0]} />
            <Bar dataKey="Despesas" fill="#EF4444" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Gráfico de Distribuição por Categoria (Pie Chart)
  const CategoryPieChart = ({ data, title, colorStart, colorEnd }) => {
    const total = data.reduce((sum, entry) => sum + entry.value, 0);
    
    if (total === 0) return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-vitum-border h-full flex flex-col justify-center items-center">
            <h3 className="text-xl font-semibold mb-2 text-vitum-dark">{title}</h3>
            <p className="text-sm text-gray-500">Nenhum dado liquidado para exibir.</p>
        </div>
    );

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-vitum-border h-full flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-vitum-dark">{title}</h3>
            <div className='flex-grow' style={{ width: '100%', height: 300 }}>
                 <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            labelLine={false}
                            label={renderCustomizedLabel}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value, name, props) => [formatTableCurrency(value), name]}
                        />
                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: '10px' }}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-4 border-t pt-3">
                <p className='text-sm font-medium'>Total Liquidado: <span className='font-bold'>{formatTableCurrency(total)}</span></p>
            </div>
        </div>
    );
  };
  
  // ===============================================
  // RENDERIZAÇÃO DA TABELA
  // ===============================================
  
  const TransactionTable = () => (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-vitum-border overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4 text-vitum-dark">Contas a {activeTab}</h3>
        {loading ? (
            <p className="text-center py-4 text-gray-500">Carregando transações...</p>
        ) : (
            <table className="min-w-full divide-y divide-vitum-border">
                <thead>
                    <tr className="bg-vitum-light text-vitum-dark uppercase text-xs font-bold">
                        <th className="px-6 py-3 text-left">Vencimento</th>
                        <th className="px-6 py-3 text-left">Descrição</th>
                        <th className="px-6 py-3 text-left">Categoria</th>
                        <th className="px-6 py-3 text-left">Método</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-vitum-border text-sm">
                    {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                            <td className={`px-6 py-4 whitespace-nowrap font-medium ${tx.status === 'Atrasado' ? 'text-red-500' : 'text-vitum-dark'}`}>
                                {moment(tx.due_date).format('DD/MM/YYYY')}
                            </td>
                            <td className="px-6 py-4">
                                <div className='flex flex-col'>
                                    <span>{tx.description}</span>
                                    {/* EXIBE NOME DO PACIENTE SE A TRANSACAO FOR VINCULADA */}
                                    {tx.patient_id && tx.patients?.full_name && (
                                        <span className='text-xs text-gray-500 flex items-center gap-1 mt-0.5'>
                                            <User size={12}/> Paciente: {tx.patients.full_name}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{tx.category || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{tx.payment_method || (tx.type === 'Pagar' ? 'N/A' : 'Pendente')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">
                                {formatTableCurrency(tx.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(tx.status)}`}>
                                    {tx.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                                {tx.status !== 'Pago' && (
                                    <button
                                        onClick={() => handleMarkAsPaid(tx)}
                                        className="p-1 rounded-full text-vitum-primary hover:bg-vitum-light transition-colors"
                                        title={`Marcar como Pago/Recebido`}
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    className="p-1 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                                    title="Deletar Transação"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
        {filteredTransactions.length === 0 && !loading && <p className="text-center py-4 text-gray-500">Nenhuma conta a {activeTab} registrada.</p>}
      </div>
  );
  
  // ===============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ===============================================

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-extrabold text-vitum-dark mb-4 flex items-center gap-2"><DollarSign className="w-8 h-8 text-vitum-primary"/> Controle de Fluxo de Caixa</h1>
      <p className="text-gray-500 mb-6">Gestão simples de contas a pagar, a receber e análise de relatórios.</p>
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-lg border border-vitum-border">
          <p className="text-sm font-medium text-gray-500">Total a Receber/Pagar Pendente</p>
          <p className={`text-2xl font-bold mt-1 ${getSummaryColor(cashFlowSummary.totalPendente)}`}>
             R$ {Math.abs(cashFlowSummary.totalPendente).toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-lg border border-vitum-border">
          <p className="text-sm font-medium text-gray-500">Total Pago/Recebido (Liquidado)</p>
          <p className={`text-2xl font-bold mt-1 ${getSummaryColor(cashFlowSummary.totalPago)}`}>
            R$ {Math.abs(cashFlowSummary.totalPago).toFixed(2).replace('.', ',')}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-lg border border-vitum-border">
          <p className="text-sm font-medium text-gray-500">Saldo Total (Caixa)</p>
          <p className={`text-2xl font-bold mt-1 ${getSummaryColor(cashFlowSummary.saldo)}`}>
            R$ {cashFlowSummary.saldo.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>
      
      {/* Abas de Visualização (Tabela vs. Relatórios) */}
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
            <ViewButton view="Table" label="Tabela de Contas" icon={<List size={16}/>} />
            <ViewButton view="Reports" label="Relatórios" icon={<BarChartIcon size={16}/>} />
        </div>
        
        <div className='flex gap-4'>
            {activeView === 'Table' && (
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-vitum-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium text-sm shadow-md"
                >
                    <PlusCircle size={16} /> Nova Conta
                </button>
            )}
            <button
                onClick={fetchTransactions}
                className="text-sm text-gray-500 hover:text-vitum-dark transition-colors flex items-center gap-1 p-2 border rounded-lg bg-white"
                title="Atualizar Dados"
            >
                <RefreshCw size={14} /> 
                Atualizar
            </button>
        </div>
      </div>

      {activeView === 'Table' && (
          <div className='mt-6'>
            <div className="flex border-b border-vitum-border mb-6">
                <TabButton tab="Pagar" label="Contas a Pagar" view="Table" />
                <TabButton tab="Receber" label="Contas a Receber" view="Table" />
            </div>
            <TransactionTable />
          </div>
      )}
      
      {activeView === 'Reports' && (
          <div className='mt-6 grid grid-cols-1 gap-6'>
            <MonthlyCashFlowChart data={monthlyCashFlow} />
            
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <CategoryPieChart 
                    data={receitasByCategory} 
                    title="Distribuição de Receitas (Liquidadas)" 
                />
                <CategoryPieChart 
                    data={despesasByCategory} 
                    title="Distribuição de Despesas (Liquidadas)" 
                />
            </div>
          </div>
      )}
      
      
      <TransactionFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={fetchTransactions}
      />
    </div>
  );
};

export default Financials;