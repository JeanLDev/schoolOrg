import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Filter, User, Calendar, BookOpen, 
  Trash2, Edit, ChevronLeft, ChevronRight, Upload, 
  ArrowLeft, Phone, Mail, MapPin, Heart, Users, 
  FileText, Check, AlertCircle, Eye, LogOut, CheckSquare,
  Sparkles, Paperclip, CheckCircle2, ChevronDown, Database,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// =========================================================================
// DEFINIÇÃO DE TIPOS / INTERFACES
// =========================================================================

export interface Class {
  id: string;
  name: string;
  grade?: string;
}

export interface Student {
  id: string;
  enrollment_number: string;
  full_name: string;
  social_name?: string;
  birth_date: string;
  gender: string;
  cpf: string;
  rg?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  blood_type?: string;
  allergies?: string;
  medications?: string;
  special_needs?: string;
  notes?: string;
  class_id: string;
  status: 'active' | 'inactive' | 'suspended' | 'transferred';
  photo_url?: string;
  created_at?: string;
  updated_at?: string;
  classes?: {
    id: string;
    name: string;
  };
}

export interface StudentResponsible {
  id?: string;
  student_id?: string;
  name: string;
  relationship: string;
  cpf: string;
  email: string;
  phone: string;
  whatsapp: string;
  financial_responsible: boolean;
  pedagogical_responsible: boolean;
  emergency_contact: boolean;
}

export interface StudentDocument {
  id?: string;
  student_id?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_at?: string;
}

// =========================================================================
// BANCO DE DADOS LOCAL (FALLBACK PARA DEMONSTRAÇÃO E OFFLINE)
// =========================================================================
const INITIAL_CLASSES: Class[] = [];

const INITIAL_STUDENTS: Student[] = [];

const INITIAL_RESPONSIBLES: StudentResponsible[] = [];

const INITIAL_DOCUMENTS: StudentDocument[] = [];

// =========================================================================
// HOOK DE GESTÃO DE ALUNOS (DUAL-MODE: SUPABASE INTEGRADO + FALLBACK LOCAL)
// =========================================================================

export function useStudents() {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [classesList, setClassesList] = useState<Class[]>(INITIAL_CLASSES);
  const [responsibles, setResponsibles] = useState<StudentResponsible[]>(INITIAL_RESPONSIBLES);
  const [documents, setDocuments] = useState<StudentDocument[]>(INITIAL_DOCUMENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar turmas
  const fetchClasses = async () => {
    if (!supabase) return;
    try {
      const { data: classesData, error: classesErr } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (classesErr) throw classesErr;
      if (classesData && classesData.length > 0) {
        setClassesList(classesData);
      }
    } catch (err: any) {
      console.warn('Erro ao buscar turmas no Supabase. Usando fallback local:', err.message);
    }
  };
  

  // Carregar lista de alunos
  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    if ( !supabase) {
      // Simulação rápida de loading para o modo demonstrativo local
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoading(false);
      return;
    }

    try {
      const { data: studentsData, error: studentsErr } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id (
            id,
            name
          )
        `)
        .order('full_name', { ascending: true });

      if (studentsErr) throw studentsErr;
      if (studentsData) {
        setStudents(studentsData);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar estudantes do Supabase. Operando em modo local.');
    } finally {
      setLoading(false);
    }
  };

  // Recarregar dados quando o Supabase estiver pronto
  useEffect(() => {
    if (supabase) {
      fetchClasses();
      fetchStudents();
    }
  }, [supabase]);

  // Obter prontuário do aluno (Aluno + Responsáveis + Documentos)
  const getStudentWithRelations = async (id: string) => {
    setLoading(true);
    setError(null);

    // Se estiver em modo local
    if ( !supabase) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const s = students.find(item => item.id === id);
      const resps = responsibles.filter(r => r.student_id === id);
      const docs = documents.filter(d => d.student_id === id);
      setLoading(false);
      return { student: s, responsibles: resps, documents: docs };
    }

    try {
      const [studentReq, responsiblesReq, documentsReq] = await Promise.all([
        supabase
          .from('students')
          .select('*, classes:class_id(id, name)')
          .eq('id', id)
          .single(),
        supabase
          .from('student_responsibles')
          .select('*')
          .eq('student_id', id),
        supabase
          .from('student_documents')
          .select('*')
          .eq('student_id', id)
      ]);

      const { data: student, error: studentErr } = studentReq;
      const { data: responsiblesData, error: respErr } = responsiblesReq;
      const { data: documentsData, error: docErr } = documentsReq;

      if (studentErr) throw studentErr;
      if (respErr) throw respErr;
      if (docErr) throw docErr;

      return {
        student,
        responsibles: responsiblesData || [],
        documents: documentsData || []
      };
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar prontuário');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Criar Aluno completo
  const createStudent = async (
    studentData: Omit<Student, 'id' | 'enrollment_number' | 'created_at' | 'updated_at'>,
    responsiblesList: Omit<StudentResponsible, 'id' | 'student_id'>[],
    documentsList: Omit<StudentDocument, 'id' | 'student_id' | 'uploaded_at'>[]
  ) => {
    setLoading(true);
    const enrollment = 'MAT-2026-' + Math.floor(1000 + Math.random() * 9000);
    console.log(studentData)


    try {
      const { data: newStudent, error: studentErr } = await supabase
        .from('students')
        .insert([{ ...studentData, enrollment_number: enrollment }])
        .select()
        .single();

      if (studentErr) console.error(studentErr)

      if (responsiblesList.length > 0) {
        const formattedResps = responsiblesList.map(r => ({ ...r, student_id: newStudent.id }));
        const { error: respErr } = await supabase
          .from('student_responsibles')
          .insert(formattedResps);
        if (respErr) console.error(respErr) ;
      }

      if (documentsList.length > 0) {
        const formattedDocs = documentsList.map(d => ({ ...d, student_id: newStudent.id }));
        const { error: docErr } = await supabase
          .from('student_documents')
          .insert(formattedDocs);
        if (docErr) console.error(docErr)
      }

      await fetchStudents();
      return newStudent;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Atualizar Aluno
  const updateStudent = async (
    id: string,
    studentData: Partial<Student>,
    responsiblesList: StudentResponsible[],
    documentsList: StudentDocument[]
  ) => {
    setLoading(true);

  

    try {
      const { error: studentErr } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', id);

      if (studentErr) throw studentErr;

      // Limpa e reinsere responsáveis
      const { error: deleteRespErr } = await supabase
        .from('student_responsibles')
        .delete()
        .eq('student_id', id);

      if (deleteRespErr) throw deleteRespErr;

      if (responsiblesList.length > 0) {
        const formattedResps = responsiblesList.map(({ id: _, student_id: __, ...r }) => ({
          ...r,
          student_id: id
        }));
        const { error: insertRespErr } = await supabase
          .from('student_responsibles')
          .insert(formattedResps);
        if (insertRespErr) throw insertRespErr;
      }

      // Limpa e reinsere documentos
      const { error: deleteDocErr } = await supabase
        .from('student_documents')
        .delete()
        .eq('student_id', id);

      if (deleteDocErr) throw deleteDocErr;

      if (documentsList.length > 0) {
        const formattedDocs = documentsList.map(({ id: _, student_id: __, ...d }) => ({
          ...d,
          student_id: id
        }));
        const { error: insertDocErr } = await supabase
          .from('student_documents')
          .insert(formattedDocs);
        if (insertDocErr) throw insertDocErr;
      }

      await fetchStudents();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Excluir aluno
  const deleteStudent = async (id: string) => {
    setLoading(true);
    if ( !supabase) {
      await new Promise(resolve => setTimeout(resolve, 400));
      setStudents(prev => prev.filter(s => s.id !== id));
      setResponsibles(prev => prev.filter(r => r.student_id !== id));
      setDocuments(prev => prev.filter(d => d.student_id !== id));
      setLoading(false);
      return true;
    }

    try {
      const { error: deleteErr } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;
      await fetchStudents();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao remover registro');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Upload no Bucket Storage
  const uploadDocumentFile = async (file: File, path: string) => {
    if ( !supabase) {
      return '#';
    }
    try {
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('student-documents')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('student-documents')
        .getPublicUrl(uploadData.path);

      return urlData.publicUrl;
    } catch (err: any) {
      console.warn('Erro de upload no bucket:', err);
      return '#';
    }
  };

  return {
    students,
    classesList,
    loading,
    error,
    getStudentWithRelations,
    createStudent,
    updateStudent,
    deleteStudent,
    uploadDocumentFile,
    refetchStudents: fetchStudents
  };
}

// =========================================================================
// COMPONENTE PRINCIPAL (APP)
// =========================================================================

export default function ManagerStudents() {
  const {
    students,
    classesList,
    loading,
    error,
    createStudent,
    updateStudent,
    deleteStudent,
    getStudentWithRelations,
    uploadDocumentFile,
    refetchStudents
  } = useStudents();

  // Estados de navegação
  const [view, setView] = useState<'list' | 'profile' | 'form'>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Estados de Filtro na Listagem
  const [searchName, setSearchName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'enrollment'>('name');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Exibição de Alertas
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Filtragem e Ordenação dos Alunos Carregados
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchName = student.full_name.toLowerCase().includes(searchName.toLowerCase()) || 
                          student.enrollment_number.toLowerCase().includes(searchName.toLowerCase());
      const matchClass = selectedClass ? student.class_id === selectedClass : true;
      const matchStatus = selectedStatus ? student.status === selectedStatus : true;
      return matchName && matchClass && matchStatus;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return a.full_name.localeCompare(b.full_name);
      } else {
        return a.enrollment_number.localeCompare(b.enrollment_number);
      }
    });
  }, [students, searchName, selectedClass, selectedStatus, sortBy]);

  // Paginação
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, selectedClass, selectedStatus]);

  // Handlers
  const handleOpenProfile = (id: string) => {
    setSelectedStudentId(id);
    setView('profile');
  };

  const handleOpenCreate = () => {
    setSelectedStudentId(null);
    setView('form');
  };

  const handleOpenEdit = (id: string) => {
    setSelectedStudentId(id);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Deseja realmente excluir este aluno de forma permanente? Todas as informações de responsáveis e documentos associados serão removidos.');
    if (confirmDelete) {
      try {
        await deleteStudent(id);
        showToast('Aluno removido com sucesso.', 'success');
        if (view === 'profile' || selectedStudentId === id) {
          setView('list');
        }
      } catch (err: any) {
        showToast(err.message || 'Erro ao remover o aluno.', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans antialiased text-[14px]">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn flex items-center gap-3 bg-white border border-slate-200 shadow-lg rounded-xl p-4 transition-all">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0" />}
          <span className="text-[14px] text-slate-800 font-medium">{toast.message}</span>
        </div>
      )}

      {/* Container Principal de Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fadeIn">
        
        {/* NAVEGAÇÃO: LISTA DE ALUNOS */}
        {view === 'list' && (
          <div className="space-y-6">
            
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ">
              <div className="flex items-center gap-4">
                <div className="text-blue-600">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Gestão de Alunos</h2>
                  <p className="text-[14px] text-slate-500 mt-0.5">Cadastre, acompanhe dados de saúde, responsáveis e visualize documentos dos estudantes</p>
                </div>
              </div>
              <button 
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[14px] font-medium transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Novo aluno
              </button>
            </div>

            {/* Grid de Filtros */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Pesquisa */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou matrícula..." 
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

              {/* Filtro de Turma */}
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Todas as turmas</option>
                  {classesList.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Filtro de Status */}
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Todos os status</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="suspended">Suspenso</option>
                  <option value="transferred">Transferido</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Ordenação */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="name">Ordenar por nome</option>
                  <option value="enrollment">Ordenar por matrícula</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

            </div>

            {/* Listagem de Estudantes (Tabela) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mb-4"></div>
                  <p className="text-[14px]">Carregando estudantes...</p>
                </div>
              ) : paginatedStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-4 px-6 text-[12px] font-semibold text-slate-500 tracking-wider">Aluno</th>
                        <th className="py-4 px-6 text-[12px] font-semibold text-slate-500 tracking-wider">Matrícula</th>
                        <th className="py-4 px-6 text-[12px] font-semibold text-slate-500 tracking-wider">Turma</th>
                        <th className="py-4 px-6 text-[12px] font-semibold text-slate-500 tracking-wider">Contato</th>
                        <th className="py-4 px-6 text-[12px] font-semibold text-slate-500 tracking-wider">Status</th>
                        <th className="py-4 px-6 text-[12px] font-semibold text-slate-500 tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {student.photo_url ? (
                                <img 
                                  src={student.photo_url} 
                                  alt={student.full_name} 
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                  <User className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-slate-900 text-[14px]">{student.full_name}</div>
                                {student.social_name && (
                                  <div className="text-[12px] text-slate-400">Nome social: {student.social_name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap text-[14px] font-mono text-slate-600">
                            {student.enrollment_number}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap text-[14px] text-slate-600">
                            {student.classes?.name || 'Não alocado'}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap text-[14px] text-slate-500">
                            {student.phone}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium ${
                              student.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              student.status === 'inactive' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                              student.status === 'suspended' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {student.status === 'active' && 'Ativo'}
                              {student.status === 'inactive' && 'Inativo'}
                              {student.status === 'suspended' && 'Suspenso'}
                              {student.status === 'transferred' && 'Transferido'}
                            </span>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => handleOpenProfile(student.id)}
                                title="Visualizar Perfil"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                              >
                                <Eye className="w-4.5 h-4.5" />
                              </button>
                              <button 
                                onClick={() => handleOpenEdit(student.id)}
                                title="Editar Cadastro"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                              >
                                <Edit className="w-4.5 h-4.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(student.id)}
                                title="Excluir Aluno"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Estado Vazio */
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-4 text-slate-300">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-slate-950">Nenhum aluno encontrado</h3>
                  <p className="text-[14px] text-slate-400 mt-1 max-w-sm">
                    Tente ajustar os critérios de busca ou crie um novo cadastro clicando no botão abaixo.
                  </p>
                  <button 
                    onClick={handleOpenCreate}
                    className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[14px] font-medium transition-all"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    Novo Aluno
                  </button>
                </div>
              )}

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[14px] text-slate-500">
                    Mostrando <strong className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</strong> de <strong className="font-semibold text-slate-700">{filteredStudents.length}</strong> alunos
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-all ${
                          currentPage === idx + 1 
                            ? 'bg-blue-600 text-white' 
                            : 'border border-slate-200 hover:bg-white text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Contador total no final do painel */}
            <div className="flex gap-4">
              <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-[14px] text-slate-500">
                  <strong className="text-slate-800 font-semibold">{students.filter(s => s.status === 'active').length}</strong> Alunos Ativos
                </span>
              </div>
              <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <span className="text-[14px] text-slate-500">
                  <strong className="text-slate-800 font-semibold">{students.filter(s => s.status === 'inactive').length}</strong> Inativos
                </span>
              </div>
            </div>

          </div>
        )}

        {/* NAVEGAÇÃO: FORMULÁRIO DE CADASTRO/EDIÇÃO */}
        {view === 'form' && (
          <StudentFormWrapper 
            studentId={selectedStudentId}
            onBack={() => setView('list')}
            onSaveSuccess={(msg) => {
              showToast(msg, 'success');
              setView('list');
            }}
            getStudent={getStudentWithRelations}
            createStudent={createStudent}
            updateStudent={updateStudent}
            classesList={classesList}
            uploadDocumentFile={uploadDocumentFile}
          />
        )}

        {/* NAVEGAÇÃO: PERFIL INDIVIDUAL DO ALUNO */}
        {view === 'profile' && selectedStudentId && (
          <StudentProfileView 
            studentId={selectedStudentId}
            onBack={() => setView('list')}
            onEdit={() => setView('form')}
            getStudent={getStudentWithRelations}
            onDelete={handleDelete}
          />
        )}

      </main>
    </div>
  );
}

// =========================================================================
// COMPONENTE: FORMULÁRIO DE CADASTRO / EDIÇÃO COMPLETO
// =========================================================================

interface StudentFormProps {
  studentId: string | null;
  onBack: () => void;
  onSaveSuccess: (message: string) => void;
  getStudent: (id: string) => Promise<any>;
  createStudent: any;
  updateStudent: any;
  classesList: Class[];
  uploadDocumentFile: (file: File, path: string) => Promise<string>;
}

function StudentFormWrapper({ 
  studentId, 
  onBack, 
  onSaveSuccess, 
  getStudent, 
  createStudent, 
  updateStudent,
  classesList,
  uploadDocumentFile
}: StudentFormProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'health' | 'responsibles' | 'documents' | 'notes'>('personal');
  const [loading, setLoading] = useState(false);

  // Estados dos Campos do Aluno
  const [fullName, setFullName] = useState('');
  const [socialName, setSocialName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Masculino');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  
  // Saúde
  const [bloodType, setBloodType] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');
  
  // Turma e Status
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended' | 'transferred'>('active');
  const [photoUrl, setPhotoUrl] = useState('');

  // Observações
  const [notes, setNotes] = useState('');

  // CRUD Interno de Responsáveis
  const [responsiblesList, setResponsiblesList] = useState<StudentResponsible[]>([]);
  const [newResp, setNewResp] = useState<Omit<StudentResponsible, 'id' | 'student_id'>>({
    name: '',
    relationship: 'Mãe',
    cpf: '',
    email: '',
    phone: '',
    whatsapp: '',
    financial_responsible: false,
    pedagogical_responsible: false,
    emergency_contact: false
  });

  // Upload/Listagem Interna de Documentos
  const [documentsList, setDocumentsList] = useState<StudentDocument[]>([]);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Carregar dados se for modo de edição
  useEffect(() => {
    if (classesList.length > 0 && !classId) {
      setClassId(classesList[0].id);
    }
  }, [classesList]);

  useEffect(() => {
    if (studentId) {
      setLoading(true);
      getStudent(studentId).then(data => {
        const s = data.student;
        setFullName(s.full_name || '');
        setSocialName(s.social_name || '');
        setBirthDate(s.birth_date || '');
        setGender(s.gender || 'Masculino');
        setCpf(s.cpf || '');
        setRg(s.rg || '');
        setEmail(s.email || '');
        setPhone(s.phone || '');
        setAddress(s.address || '');
        setCity(s.city || '');
        setState(s.state || 'SP');
        setZipCode(s.zip_code || '');
        setBloodType(s.blood_type || 'O+');
        setAllergies(s.allergies || '');
        setMedications(s.medications || '');
        setSpecialNeeds(s.special_needs || '');
        setClassId(s.class_id || '');
        setStatus(s.status || 'active');
        setPhotoUrl(s.photo_url || '');
        setNotes(s.notes || '');

        setResponsiblesList(data.responsibles);
        setDocumentsList(data.documents);
      }).catch((err) => {
        console.error(err);
        alert('Erro ao carregar dados do aluno para edição.');
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [studentId]);

  // Handler de salvar completo
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !birthDate) {
      alert('Nome completo e data de nascimento são obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const studentData = {
        full_name: fullName,
        social_name: socialName,
        birth_date: birthDate,
        gender,
        cpf,
        rg,
        email,
        phone,
        address,
        city,
        state,
        zip_code: zipCode,
        blood_type: bloodType,
        allergies,
        medications,
        special_needs: specialNeeds,
        class_id: classId,
        status,
        photo_url: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60',
        notes
      };

      if (studentId) {
        await updateStudent(studentId, studentData, responsiblesList, documentsList);
        onSaveSuccess('Cadastro do aluno atualizado com sucesso.');
      } else {
        await createStudent(studentData, responsiblesList, documentsList);
        onSaveSuccess('Novo aluno cadastrado com sucesso.');
      }
    } catch (err: any) {
      alert('Ocorreu um erro ao salvar o aluno: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funções de CRUD de Responsáveis
  const addResponsible = () => {
    if (!newResp.name || !newResp.phone) {
      alert('Nome e telefone do responsável são obrigatórios.');
      return;
    }
    const created: StudentResponsible = {
      ...newResp,
      id: 'r_local_' + Math.random().toString(36).substr(2, 9),
      student_id: studentId || undefined
    };
    setResponsiblesList(prev => [...prev, created]);
    setNewResp({
      name: '',
      relationship: 'Mãe',
      cpf: '',
      email: '',
      phone: '',
      whatsapp: '',
      financial_responsible: false,
      pedagogical_responsible: false,
      emergency_contact: false
    });
  };

  const removeResponsible = (id?: string) => {
    setResponsiblesList(prev => prev.filter(r => r.id !== id));
  };

  // Handlers de Upload de arquivos usando Supabase Storage
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('O arquivo excede o limite de tamanho permitido de 10 MB.');
        return;
      }
      setSelectedFile(file);
      if (!docName) {
        setDocName(file.name.split('.').slice(0, -1).join('.'));
      }
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) {
      alert('Informe o nome descritivo do documento.');
      return;
    }

    setUploadingDoc(true);
    try {
      let fileUrl = '#';
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${studentId || 'temp'}_${Date.now()}.${fileExt}`;
        const path = `documents/${fileName}`;
        
        fileUrl = await uploadDocumentFile(selectedFile, path);
      }

      const newDoc: StudentDocument = {
        id: 'd_local_' + Math.random().toString(36).substr(2, 9),
        student_id: studentId || undefined,
        file_name: docName + '.' + docType,
        file_url: fileUrl,
        file_type: docType === 'pdf' ? 'application/pdf' : 'image/jpeg',
      };

      setDocumentsList(prev => [...prev, newDoc]);
      setDocName('');
      setSelectedFile(null);
    } catch (err: any) {
      alert('Erro ao enviar documento: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeDocument = (id?: string) => {
    setDocumentsList(prev => prev.filter(d => d.id !== id));
  };

  if (loading && !fullName) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mb-4"></div>
        <p className="text-[14px]">Carregando módulo de cadastro...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-[18px] font-semibold text-slate-950">
              {studentId ? 'Editar Aluno' : 'Novo Cadastro de Aluno'}
            </h2>
            <p className="text-[13px] text-slate-500">
              {studentId ? 'Altere as informações abaixo nas abas correspondentes' : 'Preencha os dados do estudante, responsáveis e adicione arquivos'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[14px] font-medium transition-all"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[14px] font-medium transition-all shadow-sm disabled:opacity-50"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            Salvar Registro
          </button>
        </div>
      </div>

      {/* Menu em abas */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
            activeTab === 'personal' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Dados Pessoais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
            activeTab === 'health' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Saúde
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('responsibles')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
            activeTab === 'responsibles' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Responsáveis ({responsiblesList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
            activeTab === 'documents' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Documentos ({documentsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
            activeTab === 'notes' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Observações
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* TAB 1: DADOS PESSOAIS */}
        {activeTab === 'personal' && (
          <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-[16px] font-semibold text-slate-900">Identificação Escolar e Pessoal</h3>
              <p className="text-[13px] text-slate-500">Dados fundamentais do registro de matrícula.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Nome Completo do Aluno</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Pedro Henrique de Souza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Nome Social (Se aplicável)</label>
                <input 
                  type="text" 
                  placeholder="Como o aluno prefere ser chamado"
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Turma Alocada</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all cursor-pointer"
                >
                  {classesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Data de Nascimento</label>
                <input 
                  type="date" 
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Gênero</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Status da Matrícula</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="suspended">Suspenso</option>
                  <option value="transferred">Transferido</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">CPF</label>
                <input 
                  type="text" 
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">RG</label>
                <input 
                  type="text" 
                  placeholder="00.000.000-0"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">E-mail do Aluno</label>
                <input 
                  type="email" 
                  placeholder="contato.aluno@provedor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Telefone Principal</label>
                <input 
                  type="text" 
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Link da Foto de Perfil</label>
                <input 
                  type="url" 
                  placeholder="Insira a URL de uma imagem para o avatar do aluno"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

            </div>

            {/* Seção Endereço */}
            <div className="border-t border-slate-100 pt-6 space-y-6">
              <div>
                <h4 className="text-[15px] font-semibold text-slate-900">Localização e Endereço</h4>
                <p className="text-[13px] text-slate-500">Local de moradia principal do estudante.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <div className="md:col-span-2">
                  <label className="block text-[13px] font-medium text-slate-600 mb-2">Endereço Completo (Rua, Número, Comp.)</label>
                  <input 
                    type="text" 
                    placeholder="Rua, Alameda, Avenida, Número e Complementos"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-2">Cidade</label>
                  <input 
                    type="text" 
                    placeholder="Ex: São Paulo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                  />
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-600 mb-2">Estado</label>
                      <input 
                        type="text" 
                        maxLength={2}
                        placeholder="UF"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-600 mb-2">CEP</label>
                      <input 
                        type="text" 
                        placeholder="00000-000"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SAÚDE DO ALUNO */}
        {activeTab === 'health' && (
          <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-[16px] font-semibold text-slate-900">Histórico de Saúde e Alertas</h3>
              <p className="text-[13px] text-slate-500">Informações vitais em casos de emergência médica na escola.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Tipo Sanguíneo</label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all cursor-pointer"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Alergias Alimentares / Medicamentosas</label>
                <input 
                  type="text" 
                  placeholder="Ex: Alergia a amendoim, frutos do mar, dipirona..."
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Medicamentos de Uso Contínuo</label>
                <textarea 
                  rows={3}
                  placeholder="Especifique os remédios, dosagens e horários que devem ser ministrados se necessário."
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[13px] font-medium text-slate-600 mb-2">Necessidades Especiais ou Restrições</label>
                <textarea 
                  rows={3}
                  placeholder="Ex: TDAH, Autismo, Baixa visão. Descreva suporte necessário de acessibilidade pedagógica."
                  value={specialNeeds}
                  onChange={(e) => setSpecialNeeds(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all resize-none"
                />
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: RESPONSÁVEIS (CRUD INTERNO) */}
        {activeTab === 'responsibles' && (
          <div className="space-y-6">
            
            {/* Formulário para Adicionar */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-[16px] font-semibold text-slate-900">Vincular Novo Responsável</h3>
                <p className="text-[13px] text-slate-500">Preencha e clique em "Vincular" para inserir na listagem abaixo.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">Nome Completo</label>
                  <input 
                    type="text"
                    placeholder="Nome do pai, mãe, tutor"
                    value={newResp.name}
                    onChange={(e) => setNewResp(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">Parentesco</label>
                  <select
                    value={newResp.relationship}
                    onChange={(e) => setNewResp(prev => ({ ...prev, relationship: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[13px]"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Avó/Avô">Avó/Avô</option>
                    <option value="Tio/Tia">Tio/Tia</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">CPF</label>
                  <input 
                    type="text"
                    placeholder="000.000.000-00"
                    value={newResp.cpf}
                    onChange={(e) => setNewResp(prev => ({ ...prev, cpf: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">Telefone Celular</label>
                  <input 
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={newResp.phone}
                    onChange={(e) => setNewResp(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">E-mail</label>
                  <input 
                    type="email"
                    placeholder="email@dominio.com"
                    value={newResp.email}
                    onChange={(e) => setNewResp(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">WhatsApp</label>
                  <input 
                    type="text"
                    placeholder="Mesmo número ou outro"
                    value={newResp.whatsapp}
                    onChange={(e) => setNewResp(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[13px]"
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <div className="grid grid-cols-3 gap-3 w-full">
                    <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                      <input 
                        type="checkbox"
                        checked={newResp.financial_responsible}
                        onChange={(e) => setNewResp(prev => ({ ...prev, financial_responsible: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-[12px] text-slate-600 leading-none">Financ.</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                      <input 
                        type="checkbox"
                        checked={newResp.pedagogical_responsible}
                        onChange={(e) => setNewResp(prev => ({ ...prev, pedagogical_responsible: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-[12px] text-slate-600 leading-none">Pedagóg.</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                      <input 
                        type="checkbox"
                        checked={newResp.emergency_contact}
                        onChange={(e) => setNewResp(prev => ({ ...prev, emergency_contact: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-[12px] text-slate-600 leading-none">Emergên.</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={addResponsible}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[13px] font-medium transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Vincular Responsável
                </button>
              </div>
            </div>

            {/* Listagem de Vinculados */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <h4 className="text-[14px] font-semibold text-slate-800">Responsáveis Atribuídos ({responsiblesList.length})</h4>
              </div>
              {responsiblesList.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {responsiblesList.map((resp) => (
                    <div key={resp.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-[14px] font-semibold text-slate-800">{resp.name}</strong>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-medium">
                            {resp.relationship}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-[12px] text-slate-500">
                          <span>CPF: {resp.cpf || 'Não inf.'}</span>
                          <span>Tel: {resp.phone}</span>
                          <span>E-mail: {resp.email || 'Não inf.'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {resp.financial_responsible && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[11px]">
                              Financiador
                            </span>
                          )}
                          {resp.pedagogical_responsible && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[11px]">
                              Pedagógico
                            </span>
                          )}
                          {resp.emergency_contact && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[11px]">
                              Emergência
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeResponsible(resp.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-[13px]">
                  Nenhum responsável vinculado a este aluno ainda. Adicione pelo menos um no painel acima.
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: DOCUMENTOS (UPLOAD/LISTA) */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            
            {/* Upload form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-[16px] font-semibold text-slate-900">Anexar Documentação Digitalizada</h3>
                <p className="text-[13px] text-slate-500">Carregue arquivos em PDF, PNG ou JPG de até 10 MB para guarda digital.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">Descrição do Documento</label>
                  <input 
                    type="text"
                    placeholder="Ex: Histórico Escolar, Certidão de Nasc."
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">Tipo de Arquivo</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[13px]"
                  >
                    <option value="pdf">Documento PDF (.pdf)</option>
                    <option value="jpg">Imagem JPG (.jpg)</option>
                    <option value="png">Imagem PNG (.png)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-500 mb-1">Selecionar Arquivo</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer py-1.5 px-3 flex items-center justify-center text-[12px] text-slate-500 font-medium overflow-hidden">
                      <Upload className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                      <span className="truncate">{selectedFile ? selectedFile.name : 'Selecionar arquivo...'}</span>
                      <input 
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleUploadDocument}
                      disabled={uploadingDoc}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl text-[13px] font-medium transition-all shadow-sm flex items-center gap-1.5"
                    >
                      {uploadingDoc && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Listagem de Documentos */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <h4 className="text-[14px] font-semibold text-slate-800">Documentos Salvos ({documentsList.length})</h4>
              </div>
              {documentsList.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {documentsList.map((doc) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <strong className="text-[14px] font-semibold text-slate-800 block">{doc.file_name}</strong>
                          <span className="text-[11px] text-slate-400">
                            {doc.uploaded_at ? `Enviado em: ${new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}` : 'Pendente de sincronização'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a 
                          href={doc.file_url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Baixar/Visualizar"
                        >
                          <Paperclip className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-[13px]">
                  Nenhum documento anexado ainda para este aluno.
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 5: OBSERVAÇÕES */}
        {activeTab === 'notes' && (
          <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-[16px] font-semibold text-slate-900">Observações Gerais / Parecer Pedagógico</h3>
              <p className="text-[13px] text-slate-500">Campo livre para registro de notas de comportamento, histórico comportamental ou pedagógico do aluno.</p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">Histórico ou Parecer Livre</label>
              <textarea 
                rows={10}
                placeholder="Insira aqui observações de conselho de classe, acompanhamentos da coordenação ou outras anotações importantes."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-[14px] text-slate-700 outline-none transition-all resize-none"
              />
            </div>

          </div>
        )}

      </form>
    </div>
  );
}

// =========================================================================
// COMPONENTE: VISUALIZAÇÃO DE PERFIL DETALHADO DO ESTUDANTE (ESTILO CRM)
// =========================================================================

interface StudentProfileViewProps {
  studentId: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  getStudent: (id: string) => Promise<any>;
}

function StudentProfileView({ studentId, onBack, onEdit, onDelete, getStudent }: StudentProfileViewProps) {
  const [profileData, setProfileData] = useState<{
    student: Student;
    responsibles: StudentResponsible[];
    documents: StudentDocument[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudent(studentId).then(data => {
      setProfileData(data);
    }).catch((err) => {
      console.error(err);
      alert('Erro ao carregar perfil detalhado.');
    }).finally(() => {
      setLoading(false);
    });
  }, [studentId]);

  if (loading || !profileData) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mb-4"></div>
        <p className="text-[14px]">Buscando dados no banco de dados...</p>
      </div>
    );
  }

  const { student, responsibles, documents } = profileData;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Barra de Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para listagem
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-[14px] font-medium transition-all text-slate-700"
          >
            <Edit className="w-4 h-4" />
            Editar Cadastro
          </button>
          <button 
            onClick={() => onDelete(student.id)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 rounded-xl text-[14px] font-medium transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Aluno
          </button>
        </div>
      </div>

      {/* Grid do CRM Escolar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Perfil Rápido */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
            <div className="relative inline-block mx-auto">
              {student.photo_url ? (
                <img 
                  src={student.photo_url} 
                  alt={student.full_name} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-inner"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <User className="w-10 h-10" />
                </div>
              )}
              <span className={`absolute bottom-1 right-1 w-4.5 h-4.5 rounded-full border-2 border-white ${
                student.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}></span>
            </div>

            <div>
              <h3 className="text-[18px] font-semibold text-slate-950">{student.full_name}</h3>
              {student.social_name && (
                <span className="text-[12px] text-slate-400 block mt-0.5">Nome social: {student.social_name}</span>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-400">Matrícula:</span>
                <span className="font-mono font-medium text-slate-700">{student.enrollment_number}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-400">Turma:</span>
                <span className="font-medium text-slate-700">{student.classes?.name || 'Não alocado'}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-400">Status:</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                  student.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                }`}>
                  {student.status === 'active' ? 'Matriculado' : student.status}
                </span>
              </div>
            </div>
          </div>

          {/* Dados de Saúde Rápidos */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Heart className="w-4.5 h-4.5 text-rose-500" />
              Saúde do Aluno
            </h4>
            <div className="space-y-3 text-[13px]">
              <div>
                <span className="text-slate-400 block mb-0.5">Tipo Sanguíneo:</span>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded font-semibold text-[11px]">
                  {student.blood_type || 'Não inf.'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Alergias:</span>
                <span className="text-slate-700 font-medium">{student.allergies || 'Sem alergias declaradas'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Uso de Remédios:</span>
                <span className="text-slate-700 font-medium">{student.medications || 'Nenhum medicamento listado'}</span>
              </div>
              {student.special_needs && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Atendimento Especial:</span>
                  <span className="text-slate-700 font-medium">{student.special_needs}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Lado Direito: CRM Históricos, Responsáveis e Ficha Detalhada */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Ficha Geral */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <h4 className="text-[15px] font-semibold text-slate-900 border-b border-slate-100 pb-3">Ficha de Identificação</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-[13px]">
              <div>
                <span className="text-slate-400 block">CPF do Aluno</span>
                <span className="text-slate-700 font-medium">{student.cpf || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">RG do Aluno</span>
                <span className="text-slate-700 font-medium">{student.rg || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Data de Nascimento</span>
                <span className="text-slate-700 font-medium">
                  {new Date(student.birth_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Gênero</span>
                <span className="text-slate-700 font-medium">{student.gender || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">E-mail Cadastrado</span>
                <span className="text-slate-700 font-medium">{student.email || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Telefone Principal</span>
                <span className="text-slate-700 font-medium">{student.phone || 'Não informado'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-400 block">Endereço Residencial</span>
                <span className="text-slate-700 font-medium">
                  {student.address}, {student.city} - {student.state}, CEP: {student.zip_code}
                </span>
              </div>
            </div>
          </div>

          {/* Responsáveis */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-4.5 h-4.5 text-blue-600" />
              Contatos de Responsáveis Atribuídos
            </h4>
            {responsibles.length > 0 ? (
              <div className="space-y-4">
                {responsibles.map(resp => (
                  <div key={resp.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-slate-800">{resp.name}</span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] font-medium">
                          {resp.relationship}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-[12px] text-slate-500 mt-1">
                        <span>CPF: {resp.cpf || 'Não inf.'}</span>
                        <span>E-mail: {resp.email || 'Não inf.'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {resp.financial_responsible && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-semibold">
                            Financiador
                          </span>
                        )}
                        {resp.pedagogical_responsible && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-semibold">
                            Pedagógico
                          </span>
                        )}
                        {resp.emergency_contact && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] font-semibold">
                            Contato Emergencial
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${resp.phone}`} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[12px] font-medium text-slate-600 transition-all">
                        <Phone className="w-3.5 h-3.5" />
                        Ligar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-[13px]">
                Nenhum responsável cadastrado. Esse aluno pode ficar retido para emissão de relatórios acadêmicos oficiais.
              </div>
            )}
          </div>

          {/* Documentos Digitais */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4.5 h-4.5 text-blue-600" />
              Documentos Digitalizados no Prontuário
            </h4>
            {documents.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {documents.map(doc => (
                  <div key={doc.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-500">
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <strong className="text-[13px] font-semibold text-slate-800 block">{doc.file_name}</strong>
                        {doc.uploaded_at && (
                          <span className="text-[11px] text-slate-400">
                            Carregado em: {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <a 
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[12px] font-medium transition-all"
                    >
                      Ver Arquivo
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-slate-400">Nenhum documento digitalizado para este registro escolar.</p>
            )}
          </div>

          {/* Notas livres */}
          {student.notes && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-[15px] font-semibold text-slate-900 border-b border-slate-100 pb-2">Observações Internas da Coordenação</h4>
              <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">{student.notes}</p>
            </div>
          )}

          {/* Seção Reservada para Expansões Futuras */}
          <div className="bg-slate-100 p-4 rounded-xl border border-dashed border-slate-300 text-center">
            <h4 className="text-[13px] font-semibold text-slate-600">Históricos Escolares Adicionais</h4>
            <p className="text-[11px] text-slate-400 mt-1">Este prontuário está preparado para integração com módulos de Notas, Faltas, Boletins Finais e Ocorrências Disciplinares.</p>
          </div>

        </div>

      </div>

    </div>
  );
}