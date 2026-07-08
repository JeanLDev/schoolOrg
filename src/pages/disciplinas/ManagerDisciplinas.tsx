import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Filter, 
  Database,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  User,
  Copy,
  Settings,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import storage from "@/src/utilies/storage"

// --- DEFINIÇÃO DE INTERFACES ---
interface Subject {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  user_id: string | null;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | null;
}


export default function App() {
 
  // --- ESTADOS DA LISTA E FILTROS ---
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'app' | 'sql'>('app');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all'); // 'all', 'true', 'false'
  const [filterUser, setFilterUser] = useState<string>('all'); // 'all', 'assigned', 'unassigned'

  // --- ESTADOS DOS MODAIS ---
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // --- ESTADOS DOS CAMPOS DO FORMULÁRIO ---
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);
  const [userId, setUserId] = useState<string>('');

  // --- FEEDBACKS E TOASTS ---
  const [toast, setToast] = useState<ToastState>({ message: '', type: null });


  // --- GERENCIADOR DE TOASTS ---
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 4000);
  };

  // --- CRUD DISCIPLINAS ---

  // 1. CARREGAR (READ) utilizando a sintaxe nativa 'supabase.from()'
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

     if (!error) {
        setSubjects(data);
      }
    } catch (err: any) {
      showToast("Conexão falhou.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);


  // 2. CRIAR & ATUALIZAR (CREATE / UPDATE) utilizando a sintaxe nativa 'supabase.from()'
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("O nome da disciplina é obrigatório.", "error");
      return;
    }

    setLoading(true);
    const collab = await storage.getCollaborator()
    const cleanedUserId = collab?.user_id;
    const payload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      active: active,
      user_id: cleanedUserId
    };

    try {
      if (editingSubject) {
        // FORMATO REQUISITADO: UPDATE com .from().update().eq()
        const { error } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', editingSubject.id);

        if (error) throw error;
        showToast("Disciplina atualizada com sucesso!", "success");
      } else {
        // FORMATO REQUISITADO: INSERT com .from().insert()
        const { error } = await supabase
          .from('subjects')
          .insert([{ ...payload, id: crypto.randomUUID() }]);

        if (error) throw error;
        showToast("Disciplina cadastrada com sucesso!", "success");
      }
      setIsFormModalOpen(false);
      fetchSubjects();
    } catch (err: any) {
      showToast(`Falha na operação: ${err.message || "Erro de constraint ou duplicidade"}`, "error");
    } finally {
        setLoading(false);
    }
  };

  // 3. EXCLUIR (DELETE) utilizando a sintaxe nativa 'supabase.from()'
  const handleDeleteConfirm = async () => {
    if (!subjectToDelete) return;
    setLoading(true);

    try {
      // FORMATO REQUISITADO: DELETE com .from().delete().eq()
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectToDelete.id);

      if (error) throw error;
      showToast(`Disciplina "${subjectToDelete.name}" removida com sucesso.`, "success");
      fetchSubjects();
    } catch (err: any) {
      showToast(`Não foi possível remover: ${err.message || "Erro de integridade de banco"}`, "error");
    } finally {
      setIsDeleteModalOpen(false);
      setSubjectToDelete(null);
    }
  };

  // --- CONTROLES DE INTERFACE ---
  const handleOpenCreate = () => {
    setEditingSubject(null);
    setName('');
    setDescription('');
    setActive(true);
    setUserId('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setDescription(subject.description || '');
    setActive(subject.active);
    setUserId(subject.user_id || '');
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (subject: Subject) => {
    setSubjectToDelete(subject);
    setIsDeleteModalOpen(true);
  };

  // --- PROCESSAMENTO DE FILTROS ---
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (subject.description && subject.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      subject.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesActive = 
      filterActive === 'all' ? true : 
      filterActive === 'true' ? subject.active === true : 
      subject.active === false;

    const matchesUser = 
      filterUser === 'all' ? true :
      filterUser === 'assigned' ? subject.user_id !== null :
      subject.user_id === null;

    return matchesSearch && matchesActive && matchesUser;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased">
      
      {/* --- BANNER DE FEEDBACK (Toast) --- */}
      {toast.type && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border transition-all duration-300 animate-fadeIn ${
          toast.type === 'success' 
            ? 'bg-white border-emerald-200 text-emerald-900 shadow-emerald-100/55' 
            : 'bg-white border-rose-200 text-rose-900 shadow-rose-100/55'
        }`}>
          {toast.type === 'success' ? (
            <div className="p-1 bg-emerald-100 rounded-lg text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          ) : (
            <div className="p-1 bg-rose-100 rounded-lg text-rose-600">
              <AlertCircle size={18} />
            </div>
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* --- CONTAINER PRINCIPAL --- */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* --- ABA 1: CRUD --- */}
        {activeTab === 'app' && (
          <div className="space-y-6">
            
            {/* --- CABEÇALHO DA TABELA --- */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 ">

                <div>
                    <div className="flex items-start gap-4">
                        <div className="text-blue-600 rounded-xl border border-blue-100">
                        <BookOpen size={24} />
                        </div>
                        <div>
                        <h1 className="text-2xl font-bold text-slate-900">Disciplinas Acadêmicas</h1>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                    Painel de gerenciamento do catálogo de disciplinas da instituição e vínculo de docentes responsáveis.
                    </p>
                </div>

              <button 
                onClick={handleOpenCreate}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-98 self-start md:self-center"
              >
                <Plus size={18} />
                Adicionar Disciplina
              </button>
            </div>

            {/* --- CARD FILTROS --- */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600  tracking-wider">
                <Filter size={14} />
                Busca & Filtros Rápidos
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Campo de Pesquisa Textual */}
                <div className="relative md:col-span-2">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-600">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por nome, descrição ou ID..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-600 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-600 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Filtro Ativo */}
                <div>
                  <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  >
                    <option value="all">Status: Todos</option>
                    <option value="true">Apenas Ativos</option>
                    <option value="false">Apenas Inativos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* --- TABELA DE DISCIPLINAS --- */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {loading && subjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="animate-spin text-blue-500" size={32} />
                  <p className="text-sm text-slate-500 font-medium">Buscando informações acadêmicas...</p>
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="p-3 bg-slate-50 rounded-full text-slate-600 mb-3">
                    <Search size={24} />
                  </div>
                  <h3 className="font-bold text-slate-800">Nenhum resultado correspondente</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">
                    Tente modificar as palavras da busca ou limpar os filtros de status selecionados.
                  </p>
                  {(searchQuery || filterActive !== 'all' || filterUser !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterActive('all');
                        setFilterUser('all');
                      }}
                      className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-600  tracking-wider">Identidade da Disciplina</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-600  tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-600  tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSubjects.map((subject) => (
                        <tr key={subject.id} className="hover:bg-slate-50/50 transition-all group">
                          
                          {/* Nome e Descrição */}
                          <td className="px-6 py-4 max-w-md">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs ">
                                {subject?.name?.toUpperCase()?.substring(0, 2)}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {subject.name}
                                </div>
                                <div className="text-xs text-slate-500 line-clamp-1 mt-0.5" title={subject.description || ''}>
                                  {subject.description || <span className="text-slate-600 italic">Nenhuma descrição informada</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {subject.active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Inativo
                              </span>
                            )}
                          </td>

                          

                          {/* Ações */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(subject)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Editar disciplina"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenDelete(subject)}
                                className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Remover disciplina"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Rodapé da Tabela */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
                <div>
                  Mostrando <span className="text-slate-800 font-bold">{filteredSubjects.length}</span> de <span className="text-slate-800 font-bold">{subjects.length}</span> registros.
                </div>
                
              </div>
            </div>

          </div>
        )}
      </div>

      {/* --- FORM MODAL: CRIAR / EDITAR (Customizado) --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {editingSubject ? "Editar Disciplina" : "Nova Disciplina"}
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {editingSubject ? "Modifique as propriedades deste registro acadêmico." : "Preencha os campos para salvar a nova disciplina no Supabase."}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-600 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSubject}>
              <div className="p-6 space-y-4">
                
                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600  tracking-wider">
                    Nome da Disciplina <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Introdução à Inteligência Artificial"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-600 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-slate-600">Deve ser único em todo o sistema institucional.</p>
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600  tracking-wider">
                    Descrição Curricular
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Tópicos de aprendizado de máquina, redes neurais e aplicações práticas de IA..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-600 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  />
                </div>

                {/* Ativo Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="w-4.5 h-4.5 text-blue-600 bg-slate-50 border-slate-200 rounded-md focus:ring-0"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-700">Disciplina Ativa</span>
                      <p className="text-[11px] text-slate-600">Desative para ocultar temporariamente da grade de matrícula.</p>
                    </div>
                  </label>
                </div>

              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  {loading && <RefreshCw className="animate-spin" size={12} />}
                  Salvar Registro
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL (Customizado Antifalhas) --- */}
      {isDeleteModalOpen && subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-scaleUp">
            
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex-shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Confirmar Exclusão</h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    Você tem certeza de que deseja remover permanentemente a disciplina 
                    <span className="text-slate-800 font-bold"> "{subjectToDelete.name}"</span>? Esta ação não poderá ser desfeita.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSubjectToDelete(null);
                }}
                disabled={loading}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                {loading && <RefreshCw className="animate-spin" size={12} />}
                Confirmar Exclusão
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}