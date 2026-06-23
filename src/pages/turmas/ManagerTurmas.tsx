import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Users, 
  GraduationCap, 
  Calendar, 
  Percent, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Clock, 
  BookOpen, 
  UserCheck,
  ChevronRight,
  Database,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* ==========================================================================
   SQL PARA CRIAÇÃO DAS TABELAS NO SUPABASE (Cole no SQL Editor do Supabase)
   ==========================================================================

   -- 1. Criação do Enum para o Turno
   CREATE TYPE class_period AS ENUM ('Matutino', 'Vespertino', 'Noturno', 'Integral');

   -- 2. Criação da Tabela de Turmas
   CREATE TABLE public.classes (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       grade VARCHAR(100) NOT NULL, -- Ex: "9º Ano", "3º Ano EM"
       period class_period NOT NULL DEFAULT 'Matutino',
       room VARCHAR(50), -- Sala de aula
       teacher_name VARCHAR(255) NOT NULL, -- Nome do professor conselheiro/regente
       student_count INT NOT NULL DEFAULT 0, -- Total de alunos na turma (genérico)
       attendance_rate NUMERIC(5, 2) NOT NULL DEFAULT 100.00, -- Média de presença (%)
       created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
   );

   -- 3. Habilitar Row Level Security (RLS) - Opcional, dependendo do seu projeto
   ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

   -- Criar política pública de acesso para desenvolvimento (Ajuste conforme sua necessidade de Auth)
   CREATE POLICY "Permitir acesso total para todos os usuários" 
   ON public.classes 
   FOR ALL 
   USING (true) 
   WITH CHECK (true);

   -- 4. Trigger para atualizar o campo updated_at automaticamente
   CREATE OR REPLACE FUNCTION update_modified_column()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
   END;
   $$ language 'plpgsql';

   CREATE TRIGGER update_classes_modtime
       BEFORE UPDATE ON public.classes
       FOR EACH ROW
       EXECUTE PROCEDURE update_modified_column();

   -- 5. Inserção de dados fictícios para teste inicial
   INSERT INTO public.classes (name, grade, period, room, teacher_name, student_count, attendance_rate)
   VALUES 
   ('Turma A - 2026', '1º Ano Ensino Médio', 'Matutino', 'Sala 102', 'Prof. Roberto Silva', 32, 94.50),
   ('Turma B - 2026', '2º Ano Ensino Médio', 'Vespertino', 'Sala 204', 'Profa. Ana Cláudia', 28, 88.20),
   ('Turma C - 2026', '3º Ano Ensino Médio', 'Integral', 'Laboratório 1', 'Prof. Carlos Souza', 35, 97.80),
   ('Turma Fundamental I', '5º Ano Ensino Fundamental', 'Matutino', 'Sala 05', 'Profa. Juliana Santos', 24, 91.00);
*/


// Mock para simulação local caso as credenciais do Supabase não estejam configuradas
const MOCK_DATA: ClassItem[] = [
  { id: '1', name: 'Turma A - 2026', grade: '1º Ano Ensino Médio', period: 'Matutino', room: 'Sala 102', teacher_name: 'Prof. Roberto Silva', student_count: 32, attendance_rate: 94.5 },
  { id: '2', name: 'Turma B - 2026', grade: '2º Ano Ensino Médio', period: 'Vespertino', room: 'Sala 204', teacher_name: 'Profa. Ana Cláudia', student_count: 28, attendance_rate: 88.2 },
  { id: '3', name: 'Turma C - 2026', grade: '3º Ano Ensino Médio', period: 'Integral', room: 'Laboratório 1', teacher_name: 'Prof. Carlos Souza', student_count: 35, attendance_rate: 97.8 },
  { id: '4', name: 'Turma Fundamental I', grade: '5º Ano Ensino Fundamental', period: 'Matutino', room: 'Sala 05', teacher_name: 'Profa. Juliana Santos', student_count: 24, attendance_rate: 91.0 },
];

// Tipagem da Turma
interface ClassItem {
  id?: string;
  name: string;
  grade: string;
  period: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral';
  room: string;
  teacher_name: string;
  student_count: number;
  attendance_rate: number;
  created_at?: string;
}

export default function App() {
  // Estados da Aplicação
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('todos');
  const [selectedGrade, setSelectedGrade] = useState<string>('todos');
  const [isUsingMock, setIsUsingMock] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);


  // Estados do Formulário/Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<ClassItem, 'id'>>({
    name: '',
    grade: '',
    period: 'Matutino',
    room: '',
    teacher_name: '',
    student_count: 0,
    attendance_rate: 100
  });

  // Estado para modal de confirmação de exclusão customizado (Evitando window.confirm)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null; name: string }>({
    isOpen: false,
    id: null,
    name: ''
  });

  // Mostrar aviso de feedback temporário
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Carregar dados das Turmas (Supabase Client / Mock)
  const fetchClasses = async () => {
    setLoading(true);
    

    try {
      // Uso do clientInstance conforme solicitado
      const { data: classData, error: classErr } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (classErr) {
        throw classErr;
      }

      setClasses(classData || []);
    } catch (error) {
      console.error('Erro na requisição ao Supabase:', error);
      setClasses(MOCK_DATA);
      setIsUsingMock(true);
      showToast('Usando dados de demonstração local. Configure o Supabase para persistência real.', 'info');
    } finally {
      setLoading(false);
    }
  };

  // Monitora alterações no estado de simulação ou instância do cliente para recarregar dados
  useEffect(() => {
    fetchClasses();
  }, [supabase]);

  // Handler para Salvar/Criar Turma (CRUD - Create/Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.grade || !formData.teacher_name) {
      showToast('Preencha todos os campos obrigatórios (*)', 'error');
      return;
    }

    // Operações reais com o Supabase Client
    try {
      setLoading(true);

      if (modalMode === 'create') {
        const { data: classData, error: classErr } = await supabase
          .from('classes')
          .insert([formData])
          .select();

        if (classErr) throw classErr;
        showToast('Turma cadastrada com sucesso!', 'success');
      } else {
        const { data: classData, error: classErr } = await supabase
          .from('classes')
          .update(formData)
          .eq('id', currentId)
          .select();

        if (classErr) throw classErr;
        showToast('Turma atualizada com sucesso!', 'success');
      }

      setIsModalOpen(false);
      resetForm();
      fetchClasses();
    } catch (err) {
      console.error(err);
      showToast('Ocorreu um erro ao salvar os dados no Supabase.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler para iniciar o fluxo de exclusão abrindo o modal de confirmação
  const triggerDelete = (id: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      id,
      name
    });
  };

  // Handler para Deletar Turma de fato (CRUD - Delete) após confirmação
  const handleDelete = async () => {
    const id = deleteConfirmation.id;
    if (!id) return;

    try {
      setLoading(true);
      const { error: classErr } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (classErr) throw classErr;

      showToast('Turma removida com sucesso!', 'success');
      setDeleteConfirmation({ isOpen: false, id: null, name: '' });
      fetchClasses();
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir turma do Supabase.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Abrir Modal para Edição
  const handleEditClick = (item: ClassItem) => {
    setModalMode('edit');
    setCurrentId(item.id || null);
    setFormData({
      name: item.name,
      grade: item.grade,
      period: item.period,
      room: item.room,
      teacher_name: item.teacher_name,
      student_count: item.student_count,
      attendance_rate: item.attendance_rate
    });
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setModalMode('create');
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      grade: '',
      period: 'Matutino',
      room: '',
      teacher_name: '',
      student_count: 0,
      attendance_rate: 100
    });
    setCurrentId(null);
  };

  // Filtros e busca reativos
  const filteredClasses = classes.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.room.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPeriod = selectedPeriod === 'todos' || item.period === selectedPeriod;
    const matchesGrade = selectedGrade === 'todos' || item.grade.includes(selectedGrade);

    return matchesSearch && matchesPeriod && matchesGrade;
  });

  // Extrair séries exclusivas existentes para o filtro de Categoria
  const uniqueGrades = Array.from(new Set(classes.map(c => c.grade)));

  // Cálculos de Estatísticas Gerais (KPIs)
  const totalStudents = filteredClasses.reduce((acc, curr) => acc + Number(curr.student_count), 0);
  const averageAttendance = filteredClasses.length > 0 
    ? (filteredClasses.reduce((acc, curr) => acc + Number(curr.attendance_rate), 0) / filteredClasses.length).toFixed(1)
    : '0';

  // Helper para determinar a cor do indicador de presença
  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', progress: 'bg-emerald-500' };
    if (rate >= 90) return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', progress: 'bg-blue-500' };
    if (rate >= 75) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', progress: 'bg-amber-500' };
    return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', progress: 'bg-red-500' };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
            toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
            'bg-blue-50 border-blue-100 text-blue-800'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header do Sistema */}
      <header className=" p-8  z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className='flex flex-col'>
              <div className="flex items-center gap-4">
                <div className=" text-blue-600">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestor de Turmas</h1>
                </div>
              </div>
              <p className="text-sm text-slate-500">Administre o agrupamento de salas, turmas e acompanhe as taxas de presença escolar.</p>
          </div>
          <button 
            onClick={handleCreateClick}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm focus:ring-2 focus:ring-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            Nova Turma
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Cards de Métricas Rápidas / Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400  tracking-wider">Total de Turmas</span>
              <p className="text-2xl font-bold text-slate-900">{filteredClasses.length}</p>
            </div>
            <div className="p-3 bg-slate-50 text-slate-500 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400  tracking-wider">Alunos Atendidos</span>
              <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400  tracking-wider">Presença Média</span>
              <p className="text-2xl font-bold text-emerald-600">{averageAttendance}%</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Campo de Busca por Texto */}
            <div className="md:col-span-5 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar por turma, professor ou sala..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Filtro por Turno */}
            <div className="md:col-span-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="todos">Todos os Turnos</option>
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Noturno">Noturno</option>
                <option value="Integral">Integral</option>
              </select>
            </div>

            {/* Filtro por Série */}
            <div className="md:col-span-4">
              <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="todos">Todas as Séries</option>
                {uniqueGrades.map((grade, index) => (
                  <option key={index} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Turmas / Listagem */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          {loading && classes.length === 0 ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500">Carregando informações das turmas...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="py-20 text-center max-w-md mx-auto">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">Nenhuma turma encontrada</h3>
              <p className="text-slate-500 mt-1">Experimente alterar as opções de busca ou cadastrar uma nova turma clicando no botão acima.</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedPeriod('todos'); setSelectedGrade('todos'); }}
                className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Limpar filtros de busca
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500  tracking-wider">
                    <th className="py-4 px-6">Identificação da Turma</th>
                    <th className="py-4 px-6">Série / Nível</th>
                    <th className="py-4 px-6">Professor Responsável</th>
                    <th className="py-4 px-6 text-center">Alunos</th>
                    <th className="py-4 px-6 text-center">Turno / Período</th>
                    <th className="py-4 px-6">Indicador de Presença</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredClasses.map((item) => {
                    const statusTheme = getAttendanceColor(item.attendance_rate);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                        
                        {/* Nome / Sala */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                              {item?.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block">{item.name}</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {item.room || 'Sem sala atribuída'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Série */}
                        <td className="py-4 px-6">
                          <span className="text-slate-700 font-medium">{item.grade}</span>
                        </td>

                        {/* Professor */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                              {item.teacher_name.split(' ').pop()?.substring(0, 1).toUpperCase() || 'P'}
                            </div>
                            <span className="text-slate-600 text-sm font-medium">{item.teacher_name}</span>
                          </div>
                        </td>

                        {/* Quantidade de Alunos */}
                        <td className="py-4 px-6 text-center font-medium text-slate-700">
                          {item.student_count}
                        </td>

                        {/* Turno */}
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.period === 'Matutino' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            item.period === 'Vespertino' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                            item.period === 'Noturno' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-teal-50 text-teal-700 border border-teal-100'
                          }`}>
                            {item.period}
                          </span>
                        </td>

                        {/* Indicador de Presença com Porcentagem */}
                        <td className="py-4 px-6">
                          <div className="w-48 max-w-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${statusTheme.text}`}>
                                {item.attendance_rate}% de frequência
                              </span>
                            </div>
                            {/* Barra de Progresso */}
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${statusTheme.progress}`} 
                                style={{ width: `${item.attendance_rate}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditClick(item)}
                              title="Editar turma"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => triggerDelete(item.id!, item.name)}
                              title="Excluir turma"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal / Sidebar lateral de Criar e Editar Turma */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 animate-fadeIn">
          
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>
          
          {/* Painel do Modal */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slideLeft">
            
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {modalMode === 'create' ? 'Cadastrar Nova Turma' : 'Atualizar Dados da Turma'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Preencha as informações necessárias para gerir a turma.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Nome da Turma */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500  tracking-wider block">
                  Nome da Turma <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Turma A - 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Série / Nível Escolar */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500  tracking-wider block">
                  Série ou Nível Escolar <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: 1º Ano Ensino Médio"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Grid Turno e Sala */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Turno */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500  tracking-wider block">
                    Período / Turno
                  </label>
                  <select 
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Noturno">Noturno</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>

                {/* Sala de aula */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500  tracking-wider block">
                    Sala de Aula
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: Sala 202"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Nome do Professor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500  tracking-wider block">
                  Professor Responsável / Conselheiro <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Prof. Geraldo Alckmin"
                  value={formData.teacher_name}
                  onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="border-t border-slate-100 my-6 pt-4">
                <span className="text-xs font-bold text-slate-400  tracking-wider block mb-4">Dados Estatísticos Generificados</span>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Qtd Alunos */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500  tracking-wider block">
                      Total de Alunos
                    </label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={formData.student_count}
                      onChange={(e) => setFormData({ ...formData, student_count: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Frequência */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500  tracking-wider block">
                      Taxa de Presença Média (%)
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.attendance_rate}
                      onChange={(e) => setFormData({ ...formData, attendance_rate: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm focus:ring-2 focus:ring-blue-500/20"
                >
                  {modalMode === 'create' ? 'Salvar Turma' : 'Salvar Alterações'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Customizado de Confirmação de Exclusão */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-sm text-slate-500">
                  Tem certeza de que deseja remover a turma <strong className="text-slate-800">{deleteConfirmation.name}</strong>? Esta ação é permanente e não poderá ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
              >
                Remover Turma
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}