import React, { useState, useMemo, useEffect } from 'react';
import Teachers from './Teachers';
import { supabase } from '../../lib/supabase';
import ModalForm from './components/ModalForm';

// ==========================================
// 1. TIPAGENS E INTERFACES (TypeScript)
// ==========================================

export interface TeacherEducation {
  id: string;
  teacher_id: string;
  degree: 'Graduação' | 'Especialização' | 'Mestrado' | 'Doutorado' | 'Pós-Doutorado';
  institution: string;
  course_name: string;
  completion_year: number;
  certificate_url?: string;
}

export interface TeacherCertification {
  id: string;
  teacher_id: string;
  title: string;
  issuing_organization: string;
  issue_date: string;
  expiration_date?: string;
  certificate_url?: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface Class {
  id: string;
  name: string;
  school_year: string;
  shift: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral';
  active: boolean;
}

export interface TeacherSchedule {
  id: string;
  teacher_id: string;
  weekday: 'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Quinta-feira' | 'Sexta-feira' | 'Sábado';
  start_time: string;
  end_time: string;
}

export interface TeacherEvaluation {
  id: string;
  teacher_id: string;
  evaluator_name: string;
  score: number; // 1 a 5 ou 1 a 10
  comments: string;
  evaluation_date: string;
}

export interface TeacherDocument {
  id: string;
  teacher_id: string;
  document_type: 'RG' | 'CPF' | 'Contrato de Trabalho' | 'Comprovante de Residência' | 'Diploma' | 'Outros';
  file_name: string;
  file_url: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  registration_number: string;
  full_name: string;
  cpf: string;
  rg: string;
  birth_date: string;
  gender: 'Masculino' | 'Feminino' | 'Outro' | 'Prefiro não responder';
  marital_status: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | 'União Estável';
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  photo_url?: string;
  hire_date: string;
  employment_type: 'CLT' | 'PJ' | 'Temporário' | 'Estágio';
  workload_hours: number;
  salary: number;
  status: 'Ativo' | 'Afastado' | 'Inativo';
  observations?: string;
  created_at: string;
  updated_at: string;
  
  // Relações carregadas
  education?: TeacherEducation[];
  certifications?: TeacherCertification[];
  subjects?: string[]; // IDs das disciplinas
  classes?: string[]; // IDs das turmas
  schedules?: TeacherSchedule[];
  evaluations?: TeacherEvaluation[];
  documents?: TeacherDocument[];
}

// ==========================================
// 2. BANCO DE DADOS MOCK INICIAL (Para Demonstração / Fallback)
// ==========================================

const INITIAL_SUBJECTS: Subject[] = [];

const INITIAL_CLASSES: Class[] = [];

const INITIAL_TEACHERS: Teacher[] = [];

export default function App() {

  // Estados dos Dados
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [classes, setClasses] = useState<Class[]>(INITIAL_CLASSES);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de Filtros e Busca de Professores
  const [searchName, setSearchName] = useState('');
  const [searchRegistration, setSearchRegistration] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Estados do Formulário de Edição / Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'pessoais' | 'profissionais' | 'formacao' | 'certificacoes' | 'disciplinas' | 'turmas' | 'horarios' | 'documentos' | 'avaliacoes'>('pessoais');

  // Valores de Rascunho para Subtabelas no Formulário
  const [draftEducation, setDraftEducation] = useState<Omit<TeacherEducation, 'id' | 'teacher_id'>>({ degree: 'Graduação', institution: '', course_name: '', completion_year: 2026 });
  const [draftCertification, setDraftCertification] = useState<Omit<TeacherCertification, 'id' | 'teacher_id'>>({ title: '', issuing_organization: '', issue_date: '', expiration_date: '' });
  const [draftSchedule, setDraftSchedule] = useState({
    weekday: 'Segunda-feira',
    start_time: '',
    end_time: '',
    class_id: ''
  });
  const [draftEvaluation, setDraftEvaluation] = useState<Omit<TeacherEvaluation, 'id' | 'teacher_id'>>({ evaluator_name: '', score: 5, comments: '', evaluation_date: '' });
  const [draftDocument, setDraftDocument] = useState<{ document_type: TeacherDocument['document_type']; file_name: string }>({ document_type: 'RG', file_name: '' });

  // Notificações em Tela
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };


  // Carregar dados de forma assíncrona do Supabase ou Fallback
  const loadAllData = async (clientInstance = supabase) => {
    if (!clientInstance) {
      setTeachers(INITIAL_TEACHERS);
      setSubjects(INITIAL_SUBJECTS);
      setClasses(INITIAL_CLASSES);
      return;
    }
    setIsLoading(true);
    try {
      // 1. Carregar disciplinas
      const { data: subData, error: subErr } = await clientInstance.from('subjects').select('*');
      if (subErr) throw subErr;
      if (subData) setSubjects(subData);

      // 2. Carregar turmas
      const { data: classData, error: classErr } = await clientInstance.from('classes').select('*');
      if (classErr) throw classErr;
      if (classData) setClasses(classData);

      // 3. Carregar professores com as suas tabelas associadas
      const { data: teacherData, error: teachErr } = await clientInstance
        .from('teachers')
        .select(`
          *,
          teacher_education(*),
          teacher_certifications(*),
          teacher_schedules(*),
          teacher_evaluations(*),
          teacher_documents(*),
          teacher_subjects(subject_id),
          teacher_classes(class_id)
        `);
      if (teachErr) throw teachErr;

      if (teacherData) {
        const formattedTeachers: Teacher[] = teacherData.map((t: any) => ({
          ...t,
          education: t.teacher_education || [],
          certifications: t.teacher_certifications || [],
          schedules: t.teacher_schedules || [],
          evaluations: t.teacher_evaluations || [],
          documents: t.teacher_documents || [],
          subjects: (t.teacher_subjects || []).map((s: any) => s.subject_id),
          classes: (t.teacher_classes || []).map((c: any) => c.class_id),
        }));
        setTeachers(formattedTeachers);
      }
    } catch (err: any) {
      showToast(`Erro ao carregar dados do Supabase: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Executar carregamento ao iniciar
  useEffect(() => {
    loadAllData(supabase);
    
  }, [supabase]);

  // ==========================================
  // 4. FILTRAGEM E PAGINAÇÃO DE PROFESSORES
  // ==========================================
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchName = t.full_name.toLowerCase().includes(searchName.toLowerCase());
      const matchReg = t.registration_number.toLowerCase().includes(searchRegistration.toLowerCase());
      const matchStatus = searchStatus ? t.status === searchStatus : true;
      const matchSub = searchSubject ? t.subjects?.includes(searchSubject) : true;
      return matchName && matchReg && matchStatus && matchSub;
    });
  }, [teachers, searchName, searchRegistration, searchStatus, searchSubject]);

  const paginatedTeachers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTeachers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTeachers, currentPage]);

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);

  // ==========================================
  // 5. MANIPULAÇÃO DO FORMULÁRIO DE CADASTRO / EDIÇÃO (CRUD)
  // ==========================================
  const handleOpenCreateModal = () => {
    const nextId = teachers.length + 1;
    const nextReg = `PROF2026${nextId < 10 ? '0' + nextId : nextId}`;
    
    setEditingTeacher({
      id: '',
      registration_number: nextReg,
      full_name: '',
      cpf: '',
      rg: '',
      birth_date: '',
      gender: 'Masculino',
      marital_status: 'Solteiro(a)',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      photo_url: '',
      hire_date: new Date().toISOString().split('T')[0],
      employment_type: 'CLT',
      workload_hours: 40,
      salary: 0,
      status: 'Ativo',
      observations: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      education: [],
      certifications: [],
      subjects: [],
      classes: [],
      schedules: [],
      evaluations: [],
      documents: []
    });
    setActiveFormTab('pessoais');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (teacher: Teacher) => {
    setEditingTeacher(JSON.parse(JSON.stringify(teacher)));
    setActiveFormTab('pessoais');
    setIsModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    if (!editingTeacher.full_name || !editingTeacher.email) {
      showToast('O nome completo e e-mail são obrigatórios!', 'error');
      return;
    }

    setIsLoading(true);

    // Estrutura de dados limpa para inserção na tabela "teachers"
    const dbTeacherData = {
      registration_number: editingTeacher.registration_number,
      full_name: editingTeacher.full_name,
      cpf: editingTeacher.cpf,
      rg: editingTeacher.rg,
      birth_date: editingTeacher.birth_date || null,
      gender: editingTeacher.gender,
      marital_status: editingTeacher.marital_status,
      phone: editingTeacher.phone,
      email: editingTeacher.email,
      address: editingTeacher.address,
      city: editingTeacher.city,
      state: editingTeacher.state,
      zip_code: editingTeacher.zip_code,
      photo_url: editingTeacher.photo_url || null,
      hire_date: editingTeacher.hire_date,
      employment_type: editingTeacher.employment_type,
      workload_hours: editingTeacher.workload_hours,
      salary: editingTeacher.salary,
      status: editingTeacher.status,
      observations: editingTeacher.observations,
    };

    if ( supabase) {
      try {
        let savedId = editingTeacher.id;

        if (!editingTeacher.id) {
          // Operação CREATE no Supabase
          const { data, error } = await supabase
            .from('teachers')
            .insert([dbTeacherData])
            .select()
            .single();

          if (error) throw error;
          savedId = data.id;
        } else {
          // Operação UPDATE no Supabase
          const { error } = await supabase
            .from('teachers')
            .update(dbTeacherData)
            .eq('id', editingTeacher.id);

          if (error) throw error;
        }

        // Sincronizar Subtabelas de relação N:1 (Formação, Certificados, Horários, Avaliações, Documentos)
        // Eliminamos os registos anteriores e inserimos a lista atual (Simulação de UPSERT relacional robusto)
        await supabase.from('teacher_education').delete().eq('teacher_id', savedId);
        if (editingTeacher.education && editingTeacher.education.length > 0) {
          const mapped = editingTeacher.education.map(e => ({
            teacher_id: savedId,
            degree: e.degree,
            institution: e.institution,
            course_name: e.course_name,
            completion_year: e.completion_year,
            certificate_url: e.certificate_url || null
          }));
          await supabase.from('teacher_education').insert(mapped);
        }

        await supabase.from('teacher_certifications').delete().eq('teacher_id', savedId);
        if (editingTeacher.certifications && editingTeacher.certifications.length > 0) {
          const mapped = editingTeacher.certifications.map(c => ({
            teacher_id: savedId,
            title: c.title,
            issuing_organization: c.issuing_organization,
            issue_date: c.issue_date,
            expiration_date: c.expiration_date || null,
            certificate_url: c.certificate_url || null
          }));
          await supabase.from('teacher_certifications').insert(mapped);
        }

        await supabase.from('teacher_schedules').delete().eq('teacher_id', savedId);
        if (editingTeacher.schedules && editingTeacher.schedules.length > 0) {
          const mapped = editingTeacher.schedules.map(s => ({
            teacher_id: savedId,
            weekday: s.weekday,
            start_time: s.start_time,
            end_time: s.end_time
          }));
          await supabase.from('teacher_schedules').insert(mapped);
        }

        await supabase.from('teacher_evaluations').delete().eq('teacher_id', savedId);
        if (editingTeacher.evaluations && editingTeacher.evaluations.length > 0) {
          const mapped = editingTeacher.evaluations.map(ev => ({
            teacher_id: savedId,
            evaluator_name: ev.evaluator_name,
            score: ev.score,
            comments: ev.comments,
            evaluation_date: ev.evaluation_date
          }));
          await supabase.from('teacher_evaluations').insert(mapped);
        }

        await supabase.from('teacher_documents').delete().eq('teacher_id', savedId);
        if (editingTeacher.documents && editingTeacher.documents.length > 0) {
          const mapped = editingTeacher.documents.map(d => ({
            teacher_id: savedId,
            document_type: d.document_type,
            file_url: d.file_url
          }));
          await supabase.from('teacher_documents').insert(mapped);
        }

        // Sincronizar Tabelas Intermédias N:N (Disciplinas e Turmas)
        await supabase.from('teacher_subjects').delete().eq('teacher_id', savedId);
        if (editingTeacher.subjects && editingTeacher.subjects.length > 0) {
          const mapped = editingTeacher.subjects.map(subId => ({
            teacher_id: savedId,
            subject_id: subId
          }));
          await supabase.from('teacher_subjects').insert(mapped);
        }

        await supabase.from('teacher_classes').delete().eq('teacher_id', savedId);
        if (editingTeacher.classes && editingTeacher.classes.length > 0) {
          const mapped = editingTeacher.classes.map(classId => ({
            teacher_id: savedId,
            class_id: classId
          }));
          await supabase.from('teacher_classes').insert(mapped);
        }

        showToast('Dados guardados com sucesso no Supabase!', 'success');
        await loadAllData();
        setIsModalOpen(false);
        setEditingTeacher(null);
      } catch (err: any) {
        showToast(`Erro ao gravar no Supabase: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Modo Demonstrativo (Local Memory Fallback)
      const isNew = !editingTeacher.id;
      let updatedList: Teacher[] = [];

      if (isNew) {
        const newTeacher: Teacher = {
          ...editingTeacher,
          id: `t-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        updatedList = [...teachers, newTeacher];
        showToast('Professor registado localmente com sucesso! (Modo Demo)');
      } else {
        const updatedTeacher = {
          ...editingTeacher,
          updated_at: new Date().toISOString()
        };
        updatedList = teachers.map(t => t.id === editingTeacher.id ? updatedTeacher : t);
        showToast('Cadastro de professor atualizado localmente! (Modo Demo)');
      }

      setTeachers(updatedList);
      setIsModalOpen(false);
      setEditingTeacher(null);
      setIsLoading(false);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Tem a certeza de que deseja eliminar este professor? Todas as formações, certificados e horários vinculados serão removidos por cascata.')) {
      return;
    }

    setIsLoading(true);

    if (supabase) {
      try {
        const { error } = await supabase.from('teachers').delete().eq('id', id);
        if (error) throw error;
        showToast('Docente removido com sucesso do Supabase!', 'success');
        await loadAllData();
      } catch (err: any) {
        showToast(`Erro ao remover no Supabase: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    } else {
      setTeachers(teachers.filter(t => t.id !== id));
      showToast('Docente removido localmente com sucesso! (Modo Demo)');
      setIsLoading(false);
    }
  };

  // Simulação de Upload de Ficheiros para Supabase Storage
  const handleSimulatedUpload = (field: 'photo' | 'education' | 'certification' | 'document', e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editingTeacher) return;
    const file = e.target.files[0];
    
    // Simula gerador de URL do Supabase Storage
    const simulatedUrl = `https://supabase-storage-mock.net/buckets/${field}s/${editingTeacher.id || 'temp'}/${file.name}`;
    
    if (field === 'photo') {
      const reader = new FileReader();
      reader.onload = () => {
        setEditingTeacher({
          ...editingTeacher,
          photo_url: reader.result as string
        });
        showToast('Foto carregada com sucesso! (Armazenamento simulado)');
      };
      reader.readAsDataURL(file);
    } else if (field === 'education') {
      setDraftEducation({ ...draftEducation, certificate_url: simulatedUrl });
      showToast(`Certificado '${file.name}' associado com sucesso.`);
    } else if (field === 'certification') {
      setDraftCertification({ ...draftCertification, certificate_url: simulatedUrl });
      showToast(`Certificado '${file.name}' associado com sucesso.`);
    } else if (field === 'document') {
      setDraftDocument({ ...draftDocument, file_name: file.name });
      showToast(`Ficheiro de documento '${file.name}' preparado.`);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased selection:bg-blue-100">
      
      {/* Indicador de Carregamento Global */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-slate-700">Carregando...</span>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-sm max-w-md animate-bounce transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {toastMessage.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              )}
            </svg>
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col gap-6">
          
          {/* ==========================================
              ABA: GESTÃO DE PROFESSORES (LISTAGEM / BUSCA / CRUD)
              ========================================== */}
          
          {!isModalOpen &&
          <Teachers
            handleOpenCreateModal={handleOpenCreateModal}
            searchName={searchName}
            setSearchName={setSearchName}
            searchRegistration={searchRegistration}
            setSearchRegistration={setSearchRegistration}
            searchSubject={searchSubject}
            setSearchSubject={setSearchSubject}
            subjects={subjects}
            searchStatus={searchStatus}
            setSearchStatus={setSearchStatus}
            paginatedTeachers={paginatedTeachers}
            handleDeleteTeacher={handleDeleteTeacher}
            handleOpenEditModal={handleOpenEditModal}
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            filteredTeachers={filteredTeachers}
          />}
         {/* ====================================================================================
          MANDATORY MODAL: CADASTRO COMPLETO DE PROFESSOR (9 ABAS EXIGIDAS NO BRIEFING)
          ==================================================================================== */}
        {isModalOpen && editingTeacher && (
        <ModalForm
          editingTeacher={editingTeacher}
          setEditingTeacher={setEditingTeacher}
          setIsModalOpen={setIsModalOpen}
          activeFormTab={activeFormTab}
          setActiveFormTab={setActiveFormTab}
          handleSaveTeacher={handleSaveTeacher}
          handleSimulatedUpload={handleSimulatedUpload}
          draftEducation={draftEducation}
          setDraftEducation={setDraftEducation}
          draftCertification={draftCertification}
          setDraftCertification={setDraftCertification}
          draftSchedule={draftSchedule}
          setDraftSchedule={setDraftSchedule}
          draftDocument={draftDocument}
          setDraftDocument={setDraftDocument}
          draftEvaluation={draftEvaluation}
          setDraftEvaluation={setDraftEvaluation}
          classes={classes}
          subjects={subjects}
          showToast={showToast}
        />
        )}
          
        </main>
      </div>

     

    </div>
  );
}