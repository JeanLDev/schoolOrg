import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Users, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  Save, 
  ChevronRight, 
  AlertCircle,
  TrendingUp,
  Award,
  AlertTriangle,
  Info,
  Database,
  Link2,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../../lib/supabase';


// Interfaces de tipos correspondentes ao Supabase Schema
interface Teacher {
  id: string;
  registration_number: string;
  full_name: string;
  email: string;
  status: string;
  photo_url?: string;
}

interface ClassEntity {
  id: string;
  name: string;
  grade: string;
  period: string;
  room?: string;
}

interface Subject {
  id: string;
  name: string;
  description?: string;
}

interface Student {
  id: string;
  enrollment_number: string;
  full_name: string;
  photo_url?: string;
  class_id: string;
}

interface Assessment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  title: string;
  description?: string;
  assessment_type: 'Prova' | 'Trabalho' | 'Atividade' | 'Recuperação';
  max_score: number;
  assessment_date: string;
}

interface StudentGrade {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number;
  notes?: string;
}

interface GradeEntry {
  studentId: string;
  fullName: string;
  enrollmentNumber: string;
  photoUrl?: string;
  gradeId?: string;
  score: string;
  notes?: string;
}

export default function App() {

  // Estados de Fluxo & Autenticação do Professor
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dados estruturais carregados em tempo real do banco de dados
  const [myClasses, setMyClasses] = useState<ClassEntity[]>([]);
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // CRUD de Avaliações
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  
  // Estado do formulário de Avaliação (Criar / Editar)
  const [assessmentForm, setAssessmentForm] = useState({
    id: '',
    title: '',
    description: '',
    assessment_type: 'Prova' as 'Prova' | 'Trabalho' | 'Atividade' | 'Recuperação',
    max_score: 10,
    assessment_date: new Date().toISOString().split('T')[0]
  });
  const [isEditingAssessment, setIsEditingAssessment] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);

  // Lista de Notas dos Alunos para a avaliação selecionada
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
  const [hasUnsavedGrades, setHasUnsavedGrades] = useState(false);

  // Estatísticas calculadas
  const [stats, setStats] = useState({
    average: 0,
    highest: 0,
    lowest: 0,
    passed: 0,
    failed: 0,
    total: 0
  });

  // Consulta cruzada/pedagógica
  const [showInquiryAnswer, setShowInquiryAnswer] = useState(false);
  const [inquiryEnrollment, setInquiryEnrollment] = useState('');
  const [inquiryAssessment, setInquiryAssessment] = useState('');
  const [inquiryResult, setInquiryResult] = useState<any>(null);


  // 1. Identificar/Autenticar professor
  const handleTeacherLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!registrationNumber.trim()) {
      setErrorMsg('Indique um número de matrícula válido.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (supabase) {
        // Fluxo Supabase Real
        const { data: teacher, error: tError } = await supabase
          .from('teachers')
          .select('*')
          .eq('registration_number', registrationNumber.trim())
          .single();

        if (tError || !teacher) {
          throw new Error('Nenhum professor localizado no Supabase com esta matrícula.');
        }

        setCurrentTeacher(teacher);
        setSuccessMsg(`Autenticado: Prof. ${teacher.full_name}`);

        // Procurar turmas do professor
        const { data: tcRelations, error: tcError } = await supabase
          .from('teacher_classes')
          .select('class_id')
          .eq('teacher_id', teacher.id);

        if (tcError) throw tcError;

        if (tcRelations && tcRelations.length > 0) {
          const classIds = tcRelations.map((r: any) => r.class_id);
          const { data: teacherClasses, error: cError } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);

          if (cError) throw cError;
          setMyClasses(teacherClasses || []);
        } else {
          setMyClasses([]);
        }
      } else {
        throw new Error('Configure o Supabase ou ative o Modo de Simulação primeiro.');
      }

      // Limpar seleções
      setSelectedClassId('');
      setSelectedSubjectId('');
      setAssessments([]);
      setSelectedAssessment(null);
      setGradeEntries([]);

    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Efeito ao selecionar Turma: Carregar disciplinas vinculadas ao professor
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedClassId || !currentTeacher) {
        setMySubjects([]);
        setSelectedSubjectId('');
        return;
      }

      try {
        if (supabase) {
          const { data: tsRelations, error: tsError } = await supabase
            .from('teacher_subjects')
            .select('subject_id')
            .eq('teacher_id', currentTeacher.id);

          if (tsError) throw tsError;

          if (tsRelations && tsRelations.length > 0) {
            const subjectIds = tsRelations.map((r: any) => r.subject_id);
            const { data: teacherSubjects, error: sError } = await supabase
              .from('subjects')
              .select('*')
              .in('id', subjectIds);

            if (sError) throw sError;
            setMySubjects(teacherSubjects || []);
          } else {
            setMySubjects([]);
          }
        }
        setSelectedSubjectId('');
        setSelectedAssessment(null);
        setGradeEntries([]);
      } catch (err: any) {
        setErrorMsg(`Erro ao carregar disciplinas: ${err.message}`);
      }
    };

    fetchSubjects();
  }, [selectedClassId, currentTeacher, supabase]);

  // 3. Carregar avaliações existentes
  const loadAssessments = async () => {
    if (!selectedClassId || !selectedSubjectId || !currentTeacher) {
      setAssessments([]);
      return;
    }

    try {
      if (supabase) {
        const { data: list, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('class_id', selectedClassId)
          .eq('subject_id', selectedSubjectId)
          .eq('teacher_id', currentTeacher.id);

        if (error) throw error;
        setAssessments(list || []);
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao carregar avaliações: ${err.message}`);
    }
  };

  useEffect(() => {
    loadAssessments();
    setSelectedAssessment(null);
    setGradeEntries([]);
  }, [selectedClassId, selectedSubjectId, supabase]);

  // 4. Salvar/Criar Avaliação (CRUD - Create & Update)
  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentTeacher || !selectedClassId || !selectedSubjectId) {
      setErrorMsg('Filtros em falta. Selecione uma turma e uma disciplina primeiro.');
      return;
    }

    if (!assessmentForm.title.trim()) {
      setErrorMsg('O título da avaliação é obrigatório.');
      return;
    }

    const assessmentData: Assessment = {
      id: isEditingAssessment ? assessmentForm.id : crypto.randomUUID(),
      teacher_id: currentTeacher.id,
      class_id: selectedClassId,
      subject_id: selectedSubjectId,
      title: assessmentForm.title.trim(),
      description: assessmentForm.description.trim(),
      assessment_type: assessmentForm.assessment_type,
      max_score: Number(assessmentForm.max_score),
      assessment_date: assessmentForm.assessment_date
    };

    try {
      if (supabase) {
        const payload = {
          teacher_id: assessmentData.teacher_id,
          class_id: assessmentData.class_id,
          subject_id: assessmentData.subject_id,
          title: assessmentData.title,
          description: assessmentData.description,
          assessment_type: assessmentData.assessment_type,
          max_score: assessmentData.max_score,
          assessment_date: assessmentData.assessment_date
        };

        let resultError;
        if (isEditingAssessment) {
          const { error } = await supabase
            .from('assessments')
            .update(payload)
            .eq('id', assessmentForm.id);
          resultError = error;
        } else {
          const { error } = await supabase
            .from('assessments')
            .insert([{ id: assessmentData.id, ...payload }]);
          resultError = error;
        }

        if (resultError) throw resultError;
        setSuccessMsg(`Avaliação guardada com sucesso no Supabase!`);
      }

      await loadAssessments();
      setSelectedAssessment(assessmentData);
      setShowAssessmentForm(false);
      setIsEditingAssessment(false);

      // Limpar formulário
      setAssessmentForm({
        id: '',
        title: '',
        description: '',
        assessment_type: 'Prova',
        max_score: 10,
        assessment_date: new Date().toISOString().split('T')[0]
      });

    } catch (err: any) {
      setErrorMsg(`Erro ao guardar avaliação: ${err.message}`);
    }
  };

  // Excluir avaliação (CRUD - Delete)
  const handleDeleteAssessment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem a certeza de que deseja eliminar esta avaliação? Todas as notas associadas serão perdidas permanentemente.')) {
      return;
    }

    try {
      if (supabase) {
        const { error } = await supabase
          .from('assessments')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSuccessMsg('Avaliação eliminada com sucesso do Supabase.');
      }

      await loadAssessments();
      if (selectedAssessment?.id === id) {
        setSelectedAssessment(null);
        setGradeEntries([]);
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao eliminar avaliação: ${err.message}`);
    }
  };

  // Carregar alunos e as respetivas classificações da avaliação selecionada
  const loadGradesForSelectedAssessment = async () => {
    if (!selectedAssessment) {
      setGradeEntries([]);
      return;
    }

    try {
      if (supabase) {
        // 1. Procurar alunos da turma
        const { data: classStudents, error: sError } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', selectedAssessment.class_id);

        if (sError) throw sError;

        // 2. Procurar notas já guardadas
        const { data: associatedGrades, error: gError } = await supabase
          .from('student_grades')
          .select('*')
          .eq('assessment_id', selectedAssessment.id);

        if (gError) throw gError;

        const entries = (classStudents || []).map((student: any) => {
          const record = (associatedGrades || []).find((g: any) => g.student_id === student.id);
          return {
            studentId: student.id,
            fullName: student.full_name,
            enrollmentNumber: student.enrollment_number,
            photoUrl: student.photo_url,
            gradeId: record?.id,
            score: record ? String(record.score) : '',
            notes: record?.notes || ''
          };
        });

        setGradeEntries(entries);
        setHasUnsavedGrades(false);
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao carregar dados dos alunos: ${err.message}`);
    }
  };

  useEffect(() => {
    loadGradesForSelectedAssessment();
  }, [selectedAssessment, supabase]);

  // Alterações temporárias das notas na UI
  const handleScoreChange = (studentId: string, value: string) => {
    const cleanVal = value.replace(',', '.');
    const scoreNum = Number(cleanVal);
    
    if (value !== '' && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > (selectedAssessment?.max_score || 10))) {
      return; // Previne entradas fora do limite estabelecido
    }

    setGradeEntries(prev => prev.map(entry => {
      if (entry.studentId === studentId) {
        return { ...entry, score: value };
      }
      return entry;
    }));
    setHasUnsavedGrades(true);
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setGradeEntries(prev => prev.map(entry => {
      if (entry.studentId === studentId) {
        return { ...entry, notes };
      }
      return entry;
    }));
    setHasUnsavedGrades(true);
  };

  // Gravar notas (CRUD - Create/Update das classificações de cada aluno)
  const handleSaveGrades = async () => {
    if (!selectedAssessment) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const recordsToUpsert = gradeEntries
        .filter(entry => entry.score !== '')
        .map(entry => ({
          id: entry.gradeId || crypto.randomUUID(),
          assessment_id: selectedAssessment.id,
          student_id: entry.studentId,
          score: Number(entry.score.replace(',', '.')),
          notes: entry.notes || ''
        }));

      if (supabase) {
        // Envia para o Supabase via operação UPSERT relacional
        const { error } = await supabase
          .from('student_grades')
          .upsert(recordsToUpsert, { onConflict: 'assessment_id, student_id' });

        if (error) throw error;
        setSuccessMsg('Pauta de avaliações atualizada com sucesso !');
      }

      await loadGradesForSelectedAssessment();
    } catch (err: any) {
      setErrorMsg(`Erro ao guardar classificações: ${err.message}`);
    }
  };

  // Cálculo de Classificações e Métricas Globais da Turma
  useEffect(() => {
    const scores = gradeEntries
      .map(e => Number(e.score.replace(',', '.')))
      .filter(s => !isNaN(s) && s !== null && s >= 0);

    if (scores.length === 0) {
      setStats({ average: 0, highest: 0, lowest: 0, passed: 0, failed: 0, total: 0 });
      return;
    }

    const total = scores.length;
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const average = sum / total;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    
    // Regra pedagógica padrão de passagem: >= 60% da nota máxima
    const passThreshold = (selectedAssessment?.max_score || 10) * 0.6;
    const passed = scores.filter(s => s >= passThreshold).length;
    const failed = total - passed;

    setStats({
      average: Number(average.toFixed(2)),
      highest,
      lowest,
      passed,
      failed,
      total
    });
  }, [gradeEntries, selectedAssessment]);

  // Executar a Pesquisa Cruzada / Objetivo do Utilizador
  const handleInquirySearch = async () => {
    setInquiryResult(null);
    if (!inquiryEnrollment.trim() || !inquiryAssessment) {
      setInquiryResult({ error: 'Indique a matrícula do aluno e escolha uma avaliação.' });
      return;
    }

    try {
      if (supabase) {
        // Encontra o registo do aluno
        const { data: student, error: sError } = await supabase
          .from('students')
          .select('*')
          .eq('enrollment_number', inquiryEnrollment.trim())
          .single();

        if (sError || !student) throw new Error('Número de matrícula de aluno não registado.');

        // Encontra a avaliação correspondente
        const { data: assessment, error: aError } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', inquiryAssessment)
          .single();

        if (aError || !assessment) throw new Error('Avaliação de destino não localizada.');

        // Encontra a nota atribuída
        const { data: grade, error: gError } = await supabase
          .from('student_grades')
          .select('*')
          .eq('student_id', student.id)
          .eq('assessment_id', assessment.id)
          .maybeSingle();

        // Encontra as entidades de relação para preencher o ecrã
        const { data: teacher } = await supabase.from('teachers').select('full_name').eq('id', assessment.teacher_id).single();
        const { data: subject } = await supabase.from('subjects').select('name').eq('id', assessment.subject_id).single();
        const { data: classObj } = await supabase.from('classes').select('name').eq('id', assessment.class_id).single();

        setInquiryResult({
          studentName: student.full_name,
          enrollment: student.enrollment_number,
          assessmentTitle: assessment.title,
          assessmentDate: assessment.assessment_date,
          teacherName: teacher?.full_name || 'Desconhecido',
          subjectName: subject?.name || 'Não informada',
          className: classObj?.name || 'Não localizada',
          score: grade ? `${grade.score} / ${assessment.max_score}` : 'Nota não lançada',
          notes: grade?.notes || 'Nenhuma nota de rodapé registada'
        });
      }
    } catch (err: any) {
      setInquiryResult({ error: err.message });
    }
  };

  const startEditAssessment = (assessment: Assessment, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssessmentForm({
      id: assessment.id,
      title: assessment.title,
      description: assessment.description || '',
      assessment_type: assessment.assessment_type,
      max_score: assessment.max_score,
      assessment_date: assessment.assessment_date
    });
    setIsEditingAssessment(true);
    setShowAssessmentForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col">
      
      {/* CABEÇALHO ADMINISTRATIVO SaaS */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950 tracking-tight">Lançamento de Notas</h1>
              <p className="text-xs text-slate-500 font-medium">Lançamento de Notas Educacionais</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {currentTeacher && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                  {currentTeacher.full_name.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-700">{currentTeacher.full_name}</span>
                <span className="inline-flex items-center bg-blue-50 text-blue-700 text-sm font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                  {currentTeacher.registration_number}
                </span>
                <button 
                  onClick={() => {
                    setCurrentTeacher(null);
                    setMyClasses([]);
                    setSelectedClassId('');
                    setSelectedSubjectId('');
                  }} 
                  className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer ml-1"
                >
                  Sair
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setShowInquiryAnswer(!showInquiryAnswer)} 
              className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-2 rounded-xl border border-blue-200 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              Consulta Cruzada de Notas
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        

        {/* FEEDBACK DE NOTIFICAÇÕES */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 text-sm font-semibold">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 text-sm font-semibold">✕</button>
          </div>
        )}

        {/* CONSULTA CRUZADA (OBJETIVO DE RESPOSTA PEDAGÓGICA) */}
        {showInquiryAnswer && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-fadeIn">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Pesquisa Cruzada de Nota</h3>
                <p className="text-xs text-slate-500">Localize exatamente qual nota o aluno obteve em determinada avaliação, turma, disciplina, professor e data.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500  tracking-wider mb-1.5">Matrícula do Aluno</label>
                <input 
                  type="text" 
                  value={inquiryEnrollment} 
                  onChange={(e) => setInquiryEnrollment(e.target.value)}
                  placeholder="Ex: ALU001" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500  tracking-wider mb-1.5">Avaliação</label>
                <select 
                  value={inquiryAssessment} 
                  onChange={(e) => setInquiryAssessment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-hidden focus:border-blue-500 transition-all"
                >
                  <option value="">Selecione uma avaliação ativa...</option>
                  {(assessments).map(a => {
                    const subj = (mySubjects).find(s => s.id === a.subject_id);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.title} ({subj?.name || 'Classificação'}) - {a.assessment_date}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleInquirySearch}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Pesquisar Registo
                </button>
              </div>
            </div>

            {inquiryResult && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 animate-fadeIn">
                {inquiryResult.error ? (
                  <div className="text-red-600 flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    {inquiryResult.error}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                      <p className="text-slate-600 font-medium mb-1">Estudante</p>
                      <p className="font-semibold text-slate-900 text-sm">{inquiryResult.studentName}</p>
                      <p className="text-blue-600 font-mono mt-0.5">{inquiryResult.enrollment}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                      <p className="text-slate-600 font-medium mb-1">Disciplina / Turma</p>
                      <p className="font-semibold text-slate-900 text-sm">{inquiryResult.subjectName}</p>
                      <p className="text-slate-600 font-medium mt-0.5">{inquiryResult.className}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                      <p className="text-slate-600 font-medium mb-1">Professor &amp; Data</p>
                      <p className="font-semibold text-slate-900 text-sm">{inquiryResult.teacherName}</p>
                      <p className="text-slate-500 mt-0.5">{inquiryResult.assessmentDate.split('-').reverse().join('/')}</p>
                    </div>
                    <div className="bg-blue-600 text-white p-3 rounded-lg flex flex-col justify-between">
                      <div>
                        <p className="text-blue-100 font-medium">Classificação</p>
                        <p className="text-lg font-bold mt-1">{inquiryResult.score}</p>
                      </div>
                      <p className="text-sm text-blue-200 truncate mt-1">Obs: {inquiryResult.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* LIGAÇÃO ESTABELECIDA: AUTENTICAR DOCENTE */}
        {!currentTeacher && (
          <div className="max-w-md w-full mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-8 mt-6 animate-fadeIn">
            <div className="text-center mb-6">
              <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Acesso de Docente</h2>
              <p className="text-xs text-slate-500 mt-1">Identifique-se com a sua matrícula de professor para carregar as pautas de avaliação.</p>
            </div>

            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500  tracking-wider mb-1.5">Matrícula do Professor</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="Ex: PROF123"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-hidden focus:border-blue-500 transition-all font-medium"
                    required
                  />
                </div>
                <div className="mt-2.5 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <p>
                    Dica do sistema: Escreva <strong className="text-slate-700 font-mono">PROF123</strong> no campo acima para simular o painel do Prof. Alan Turing.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'A carregar...' : 'Identificar Docente'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ÁREA ADMINISTRATIVA DO DOCENTE AUTENTICADO */}
        {currentTeacher && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* TURMAS E DISCIPLINAS ASSOCIADAS */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Selecione os dados de lançamento
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Seleção de Turma */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500  tracking-wider mb-2">Turma Disponível</label>
                  <div className="grid grid-cols-1 gap-2">
                    {myClasses.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedClassId(item.id)}
                        className={`text-left p-4 rounded-xl border transition-all flex justify-between items-center cursor-pointer ${
                          selectedClassId === item.id
                            ? 'border-blue-500 bg-blue-50/40 text-blue-900 ring-1 ring-blue-500'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-sm">{item.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.grade} • Período {item.period}</p>
                        </div>
                        <span className="text-sm  font-semibold tracking-wider text-slate-600 bg-slate-100 py-1 px-2 rounded-md">
                          {item.room || 'Sem Sala'}
                        </span>
                      </button>
                    ))}
                    {myClasses.length === 0 && (
                      <div className="border border-dashed border-slate-200 bg-slate-50 rounded-xl p-6 text-center text-slate-600">
                        <AlertCircle className="w-5 h-5 mx-auto mb-2 text-slate-600" />
                        <p className="text-xs">Nenhuma turma encontrada vinculada a esta conta.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seleção de Disciplina */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500  tracking-wider mb-2">Disciplina Atribuída</label>
                  {!selectedClassId ? (
                    <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-8 text-center text-slate-600 flex flex-col items-center justify-center h-[126px]">
                      <AlertCircle className="w-5 h-5 text-slate-600 mb-1.5" />
                      <p className="text-xs font-medium">Escolha uma turma para carregar as disciplinas correspondentes</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {mySubjects.map((subj) => (
                        <button
                          key={subj.id}
                          onClick={() => setSelectedSubjectId(subj.id)}
                          className={`text-left p-4 rounded-xl border transition-all flex justify-between items-center cursor-pointer ${
                            selectedSubjectId === subj.id
                              ? 'border-blue-500 bg-blue-50/40 text-blue-900 ring-1 ring-blue-500'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                        >
                          <div>
                            <p className="font-semibold text-sm">{subj.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{subj.description || 'Sem descrição'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FLUXO COMPLETO DE LANÇAMENTO E CRUD DE NOTAS */}
            {selectedClassId && selectedSubjectId && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUNA ESQUERDA: LISTA DE AVALIAÇÕES */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                      Avaliações Ativas
                    </h3>
                    <button
                      onClick={() => {
                        setIsEditingAssessment(false);
                        setAssessmentForm({
                          id: '',
                          title: '',
                          description: '',
                          assessment_type: 'Prova',
                          max_score: 10,
                          assessment_date: new Date().toISOString().split('T')[0]
                        });
                        setShowAssessmentForm(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Criar
                    </button>
                  </div>

                  {/* FORMULÁRIO DE NOVA / EDITAR AVALIAÇÃO (CREATE & UPDATE) */}
                  {showAssessmentForm && (
                    <form onSubmit={handleSaveAssessment} className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fadeIn">
                      <h4 className="text-xs font-semibold text-slate-700">
                        {isEditingAssessment ? 'Modificar Avaliação' : 'Registar Avaliação'}
                      </h4>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600  mb-1">Título</label>
                        <input
                          type="text"
                          placeholder="Ex: Exame Época Normal"
                          value={assessmentForm.title}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-blue-500 transition-all font-medium"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600  mb-1">Anotações / Descrição</label>
                        <textarea
                          placeholder="Ex: Unidades temáticas 1, 2 e 3..."
                          value={assessmentForm.description}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, description: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-blue-500 transition-all font-medium h-12 resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-semibold text-slate-600  mb-1">Tipo</label>
                          <select
                            value={assessmentForm.assessment_type}
                            onChange={(e: any) => setAssessmentForm({ ...assessmentForm, assessment_type: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-hidden focus:border-blue-500 transition-all"
                          >
                            <option value="Prova">Prova</option>
                            <option value="Trabalho">Trabalho</option>
                            <option value="Atividade">Atividade</option>
                            <option value="Recuperação">Recuperação</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-600  mb-1">Cotação Máxima</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={assessmentForm.max_score}
                            onChange={(e) => setAssessmentForm({ ...assessmentForm, max_score: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-hidden focus:border-blue-500 transition-all font-semibold"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600  mb-1">Data</label>
                        <input
                          type="date"
                          value={assessmentForm.assessment_date}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_date: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-hidden focus:border-blue-500 transition-all"
                          required
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAssessmentForm(false);
                            setIsEditingAssessment(false);
                          }}
                          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* LISTAGEM DE AVALIAÇÕES */}
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {assessments.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAssessment(a)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedAssessment?.id === a.id
                            ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500'
                            : 'border-slate-100 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="inline-flex items-center bg-slate-100 text-slate-600 text-xs font-semibold px-1.5 py-0.5 rounded-sm mb-1.5 ">
                              {a.assessment_type}
                            </span>
                            <h4 className="font-semibold text-slate-900 text-xs leading-tight">{a.title}</h4>
                            <p className="text-sm text-slate-600 mt-1">Realizada em: {a.assessment_date}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => startEditAssessment(a, e)}
                              className="text-slate-600 hover:text-blue-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteAssessment(a.id, e)}
                              className="text-slate-600 hover:text-red-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex justify-between items-center text-sm">
                          <span className="text-slate-600">Classificação Máxima</span>
                          <span className="font-semibold text-slate-700">{a.max_score} pontos</span>
                        </div>
                      </div>
                    ))}

                    {assessments.length === 0 && (
                      <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-600 font-medium">Nenhum registo de avaliação de momento.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUNA DIREITA (Pauta de alunos e estatísticas) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {!selectedAssessment ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-600 flex flex-col items-center justify-center min-h-[350px] shadow-sm">
                      <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">Nenhuma avaliação ativa</p>
                      <p className="text-xs text-slate-600 max-w-xs mt-1">Crie ou selecione uma das avaliações à esquerda para introduzir ou visualizar as notas correspondentes.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-fadeIn">
                      
                      {/* INFORMAÇÕES RESUMIDAS DA AVALIAÇÃO ATIVA */}
                      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-semibold px-2 py-0.5 rounded-full border border-blue-200 ">
                              {selectedAssessment.assessment_type}
                            </span>
                            <span className="text-sm text-slate-600 font-mono">ID: {selectedAssessment.id}</span>
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 mt-1">{selectedAssessment.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{selectedAssessment.description || 'Sem anotações adicionais'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-center">
                            <span className="block text-xs font-semibold text-slate-600 ">Classificação Máxima</span>
                            <span className="text-sm font-bold text-slate-800">{selectedAssessment.max_score}</span>
                          </div>
                          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-center">
                            <span className="block text-xs font-semibold text-slate-600 ">Data Realização</span>
                            <span className="text-xs font-semibold text-slate-700">{selectedAssessment.assessment_date.split('-').reverse().join('/')}</span>
                          </div>
                        </div>
                      </div>

                      {/* PAINEL DE ESTATÍSTICAS DA CLASSE */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 border-b border-slate-200 bg-white">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="block text-xs font-semibold text-slate-600 ">Média</span>
                          <span className={`text-sm font-bold flex items-center justify-center gap-1 mt-0.5 ${stats.average >= (selectedAssessment.max_score * 0.6) ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <TrendingUp className="w-3.5 h-3.5" />
                            {stats.average}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="block text-xs font-semibold text-slate-600 ">Nota Mais Alta</span>
                          <span className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                            <Award className="w-3.5 h-3.5 text-blue-500" />
                            {stats.highest}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="block text-xs font-semibold text-slate-600 ">Nota Mais Baixa</span>
                          <span className="text-sm font-bold text-slate-800 block mt-0.5">
                            {stats.lowest}
                          </span>
                        </div>
                        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-center">
                          <span className="block text-xs font-semibold text-emerald-600 ">Aprovados</span>
                          <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                            {stats.passed}
                          </span>
                        </div>
                        <div className="bg-red-50/50 p-3 rounded-lg border border-red-100 text-center">
                          <span className="block text-xs font-semibold text-red-600 ">Reprovados</span>
                          <span className="text-sm font-bold text-red-700 block mt-0.5">
                            {stats.failed}
                          </span>
                        </div>
                      </div>

                      {/* PAUTA NOMINAL COM ENTRADA DE CLASSIFICAÇÕES */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                              <th className="p-4 text-xs font-semibold text-slate-500 tracking-wider">Aluno</th>
                              <th className="p-4 text-xs font-semibold text-slate-500 tracking-wider">Nº Matrícula</th>
                              <th className="p-4 text-xs font-semibold text-slate-500 tracking-wider w-32">Classificação</th>
                              <th className="p-4 text-xs font-semibold text-slate-500 tracking-wider">Anotações do Aluno</th>
                              <th className="p-4 text-xs font-semibold text-slate-500 tracking-wider text-right">Resultado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {gradeEntries.map((student) => {
                              const scoreNum = Number(student.score.replace(',', '.'));
                              const passLimit = selectedAssessment.max_score * 0.6;
                              const isApproved = !isNaN(scoreNum) && student.score !== '' && scoreNum >= passLimit;
                              const hasScore = student.score !== '';

                              return (
                                <tr key={student.studentId} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      {student.photoUrl ? (
                                        <img src={student.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 border border-slate-200">
                                          {student.fullName.substring(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-semibold text-slate-800 text-xs">{student.fullName}</p>
                                        <p className="text-sm text-slate-600 mt-0.5">Frequência ativa</p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-4 text-xs font-mono text-slate-500">
                                    {student.enrollmentNumber}
                                  </td>

                                  <td className="p-4">
                                    <div className="relative">
                                      <input
                                        type="text"
                                        value={student.score}
                                        onChange={(e) => handleScoreChange(student.studentId, e.target.value)}
                                        placeholder="0.0"
                                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                                      />
                                      <span className="text-xs text-slate-600 block mt-0.5 text-center">Máx: {selectedAssessment.max_score}</span>
                                    </div>
                                  </td>

                                  <td className="p-4">
                                    <input
                                      type="text"
                                      value={student.notes}
                                      onChange={(e) => handleNotesChange(student.studentId, e.target.value)}
                                      placeholder="Ex: Teve apoio extra curricular..."
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-600"
                                    />
                                  </td>

                                  <td className="p-4 text-right">
                                    {hasScore ? (
                                      <span className={`inline-flex items-center gap-1 text-xs font-bold  px-2.5 py-1 rounded-full border ${
                                        isApproved 
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                          : 'bg-red-50 text-red-700 border-red-200'
                                      }`}>
                                        {isApproved ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {isApproved ? 'Aprovado' : 'Abaixo da Média'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-xs font-semibold  px-2 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                        Pendente
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* FOOTER DA TABELA: GUARDAR ALTERAÇÕES (CREATE / UPDATE DE GRADES) */}
                      <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                          {hasUnsavedGrades ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block"></span>
                              Existem classificações modificadas pendentes de gravação.
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              Dados sincronizados.
                            </span>
                          )}
                        </p>
                        <button
                          onClick={handleSaveGrades}
                          disabled={!hasUnsavedGrades}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer ${
                            hasUnsavedGrades 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                              : 'bg-slate-200 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <Save className="w-4 h-4" />
                          Salvar
                        </button>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}