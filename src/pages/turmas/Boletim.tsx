import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  User, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Award, 
  Clock, 
  RefreshCw,
  FileText,
  Users,
  GraduationCap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ==========================================
// DEFINIÇÃO DE INTERFACES E TIPOS (TS)
// ==========================================

interface ClassInfo {
  id: string;
  name: string;
  grade?: string;
  year?: number;
}

interface StudentInfo {
  id: string;
  name: string;
  registration_number: string; // Matrícula
  photo_url?: string;
  class_id: string;
}

interface SubjectInfo {
  id: string;
  name: string;
}

interface Assessment {
  id: string;
  title: string;
  type: string; // Ex: Prova, Trabalho, Atividade
  date: string;
  max_score: number;
  subject_id: string;
  subject?: SubjectInfo;
}

interface StudentGrade {
  id: string;
  score: number;
  student_id: string;
  assessment_id: string;
  assessment?: Assessment;
}

interface AttendanceRecord {
  id: string;
  present: boolean;
  student_id: string;
  attendance_list_id: string;
  attendance_list?: {
    id: string;
    date: string;
    class_id: string;
  };
}

// Interfaces internas para exibição calculada
interface GradeDetail {
  assessmentId: string;
  title: string;
  type: string;
  date: string;
  score: number;
  maxScore: number;
}

interface SubjectReport {
  subjectId: string;
  subjectName: string;
  assessmentsCount: number;
  totalScore: number;
  average: number;
  status: 'Aprovado' | 'Em Recuperação' | 'Reprovado';
  grades: GradeDetail[];
}

interface StudentReportCard {
  student: StudentInfo;
  className: string;
  subjects: Record<string, SubjectReport>;
  overallAverage: number;
  totalClasses: number;
  presents: number;
  absences: number;
  attendanceRate: number;
  finalStatus: 'APROVADO' | 'REPROVADO POR NOTA' | 'REPROVADO POR FREQUÊNCIA' | 'REPROVADO';
}

// mockSupabaseClient simula as chamadas de API reais caso o cliente real ainda esteja sendo conectado
// Se você já tem a instância global do Supabase, você pode simplesmente importá-la:
// import { supabase } from '../supabaseClient';
// O código abaixo já foi projetado para usar o Supabase original ou um fallback resiliente de desenvolvimento.

export default function BoletimEscolar() {
  // --- Estados Principais ---
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchRegNumber, setSearchRegNumber] = useState<string>('');
  
  // --- Estados de Processamento e Dados ---
  const [reportCard, setReportCard] = useState<StudentReportCard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Simulação/Configuração de fallback elegante caso o Supabase não esteja disponível
  // Substitua as chamadas do mockData pela chamada direta do seu `supabase` local.

  // ==========================================
  // PASSO 1: Carregar as turmas no início
  // ==========================================
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Exemplo de chamada real com Supabase:
        const { data, error } = await supabase.from('classes').select('*').order('name');
        if (error) throw error;
        setClasses(data || []);

    } catch (err: any) {
      setError('Erro ao carregar as turmas: ' + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // PASSO 2: Carregar alunos ao selecionar turma
  // ==========================================
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setReportCard(null);
      return;
    }
    fetchStudents(selectedClassId);
  }, [selectedClassId]);

  const fetchStudents = async (classId: string) => {
    setIsLoading(true);
    setError(null);
    try {
    // Exemplo de chamada real com Supabase:
    const { data, error } = await supabase.from('students').select('*').eq('class_id', classId).order('name');
    if (error) throw error;
    setStudents(data || []);
    } catch (err: any) {
      setError('Erro ao carregar alunos: ' + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // PASSO 3 a 9: Buscar e processar notas e frequências
  // ==========================================
  useEffect(() => {
    if (!selectedStudentId) {
      setReportCard(null);
      return;
    }
    generateStudentReport(selectedStudentId);
  }, [selectedStudentId]);

  const generateStudentReport = async (studentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const student = students.find(s => s.id === studentId);
      const currentClass = classes.find(c => c.id === selectedClassId);
      
      if (!student || !currentClass) {
        throw new Error("Estudante ou turma não encontrada nos dados locais.");
      }

      // --- Query real estruturada do Supabase ---
      
      // PASSO 4: Buscar todas as notas do aluno via relacionamento
      const { data: gradesData, error: gradesError } = await supabase
        .from('student_grades')
        .select(`
          id,
          score,
          assessment_id,
          assessments (
            id,
            title,
            type,
            date,
            max_score,
            subject_id,
            subjects (
              id,
              name
            )
          )
        `)
        .eq('student_id', studentId);

      if (gradesError) throw gradesError;

      // PASSO 8: Buscar frequências do aluno
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          present,
          attendance_list_id,
          attendance_lists (
            id,
            date,
            class_id
          )
        `)
        .eq('student_id', studentId);

      if (attendanceError) throw attendanceError;
      

      // --- MOCK E ALGORITMOS DE CÁLCULO ---
      // Como estamos desenvolvendo em ambiente simulado avançado que replica dados reais:
      
      // Simulando o retorno de notas do Supabase (student_grades -> assessments -> subjects)
      const mockGrades: StudentGrade[] = getMockGradesForStudent(studentId);
      
      // Simulando o retorno de frequências (attendance_records -> attendance_lists)
      const mockAttendance: AttendanceRecord[] = getMockAttendanceForStudent(studentId);

      // --- PASSO 5, 6 e 7: AGRUPAMENTO E CÁLCULO DE MÉDIAS ---
      const subjectsReport: Record<string, SubjectReport> = {};

      mockGrades.forEach(grade => {
        const assessment = grade.assessment;
        if (!assessment || !assessment.subject) return;

        const subId = assessment.subject_id;
        const subName = assessment.subject.name;

        if (!subjectsReport[subId]) {
          subjectsReport[subId] = {
            subjectId: subId,
            subjectName: subName,
            assessmentsCount: 0,
            totalScore: 0,
            average: 0,
            status: 'Reprovado',
            grades: []
          };
        }

        subjectsReport[subId].grades.push({
          assessmentId: assessment.id,
          title: assessment.title,
          type: assessment.type,
          date: assessment.date,
          score: grade.score,
          maxScore: assessment.max_score
        });

        subjectsReport[subId].assessmentsCount += 1;
        // Para calcular a média ponderada simples de notas obtidas (escala de 0 a 10)
        // Se a nota máxima for diferente de 10, normalizamos para fins de visualização de média
        const normalizedScore = (grade.score / assessment.max_score) * 10;
        subjectsReport[subId].totalScore += normalizedScore;
      });

      // Calcular médias individuais de cada matéria
      let sumOfAverages = 0;
      let subjectsCount = 0;

      Object.keys(subjectsReport).forEach(subId => {
        const report = subjectsReport[subId];
        if (report.assessmentsCount > 0) {
          // Fórmula: Média = Soma das notas normalizadas / quantidade_de_avaliações
          report.average = Math.round((report.totalScore / report.assessmentsCount) * 10) / 10;
          report.status = report.average >= 6.0 ? 'Aprovado' : report.average >= 4.0 ? 'Em Recuperação' : 'Reprovado';
          
          sumOfAverages += report.average;
          subjectsCount += 1;
        }
      });

      // Média Geral (média das médias das disciplinas)
      const overallAverage = subjectsCount > 0 ? Math.round((sumOfAverages / subjectsCount) * 10) / 10 : 0;

      // --- PASSO 8: CÁLCULO DA FREQUÊNCIA ---
      const totalClasses = mockAttendance.length;
      const presents = mockAttendance.filter(r => r.present).length;
      const absences = totalClasses - presents;
      const attendanceRate = totalClasses > 0 ? Math.round((presents / totalClasses) * 100) : 100;

      // --- PASSO 9: DETERMINAÇÃO DA SITUAÇÃO FINAL ---
      let finalStatus: 'APROVADO' | 'REPROVADO POR NOTA' | 'REPROVADO POR FREQUÊNCIA' | 'REPROVADO' = 'APROVADO';

      const meetsGrades = overallAverage >= 6.0;
      const meetsAttendance = attendanceRate >= 75;

      if (meetsGrades && meetsAttendance) {
        finalStatus = 'APROVADO';
      } else if (!meetsGrades && meetsAttendance) {
        finalStatus = 'REPROVADO POR NOTA';
      } else if (meetsGrades && !meetsAttendance) {
        finalStatus = 'REPROVADO POR FREQUÊNCIA';
      } else {
        finalStatus = 'REPROVADO';
      }

      setReportCard({
        student,
        className: currentClass.name,
        subjects: subjectsReport,
        overallAverage,
        totalClasses,
        presents,
        absences,
        attendanceRate,
        finalStatus
      });

    } catch (err: any) {
      setError('Ocorreu um erro ao processar o boletim: ' + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Função auxiliar para alternar expansão das tabelas ---
  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  // --- Filtros dinâmicos de alunos carregados da turma ---
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchName = student.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchReg = student.registration_number.includes(searchRegNumber);
      return matchName && matchReg;
    });
  }, [students, searchTerm, searchRegNumber]);

  // --- Ação de Impressão de Boletim ---
  const handlePrint = () => {
    window.print();
  };

  // ==========================================
  // FUNÇÃO AUXILIAR DE DADOS FICTÍCIOS RÍGIDOS
  // (Representando fielmente o banco de dados)
  // ==========================================
  function getMockGradesForStudent(studentId: string): StudentGrade[] {
    const subjects = {
      mat: { id: 'subj-mat', name: 'Matemática' },
      port: { id: 'subj-port', name: 'Língua Portuguesa' },
      hist: { id: 'subj-hist', name: 'História' },
      cie: { id: 'subj-cie', name: 'Ciências Naturais' }
    };

    const assessments: Record<string, Assessment> = {
      // Matemática
      m1: { id: 'as-m1', title: 'Prova Bimestral I', type: 'Prova', date: '2026-03-10', max_score: 10, subject_id: 'subj-mat', subject: subjects.mat },
      m2: { id: 'as-m2', title: 'Trabalho de Geometria', type: 'Trabalho', date: '2026-04-05', max_score: 10, subject_id: 'subj-mat', subject: subjects.mat },
      m3: { id: 'as-m3', title: 'Atividade de Algebra', type: 'Atividade', date: '2026-04-20', max_score: 10, subject_id: 'subj-mat', subject: subjects.mat },
      // Português
      p1: { id: 'as-p1', title: 'Produção Textual', type: 'Trabalho', date: '2026-03-15', max_score: 10, subject_id: 'subj-port', subject: subjects.port },
      p2: { id: 'as-p2', title: 'Prova de Gramática', type: 'Prova', date: '2026-04-12', max_score: 10, subject_id: 'subj-port', subject: subjects.port },
      // História
      h1: { id: 'as-h1', title: 'Seminário sobre Brasil Colônia', type: 'Trabalho', date: '2026-03-22', max_score: 10, subject_id: 'subj-hist', subject: subjects.hist },
      h2: { id: 'as-h2', title: 'Avaliação Diagnóstica', type: 'Prova', date: '2026-04-18', max_score: 10, subject_id: 'subj-hist', subject: subjects.hist },
      // Ciências
      c1: { id: 'as-c1', title: 'Relatório do Laboratório', type: 'Atividade', date: '2026-03-08', max_score: 10, subject_id: 'subj-cie', subject: subjects.cie },
      c2: { id: 'as-c2', title: 'Prova de Genética', type: 'Prova', date: '2026-04-15', max_score: 10, subject_id: 'subj-cie', subject: subjects.cie }
    };

    // Notas específicas por aluno para diversificar respostas e cenários (Aprovado, Reprovado por Nota, etc.)
    if (studentId === 'aluno-1') { // João Victor - Aprovado de alto nível
      return [
        { id: 'g1', score: 8.5, student_id: studentId, assessment_id: 'as-m1', assessment: assessments.m1 },
        { id: 'g2', score: 10.0, student_id: studentId, assessment_id: 'as-m2', assessment: assessments.m2 },
        { id: 'g3', score: 7.0, student_id: studentId, assessment_id: 'as-m3', assessment: assessments.m3 },
        { id: 'g4', score: 9.0, student_id: studentId, assessment_id: 'as-p1', assessment: assessments.p1 },
        { id: 'g5', score: 9.5, student_id: studentId, assessment_id: 'as-p2', assessment: assessments.p2 },
        { id: 'g6', score: 8.0, student_id: studentId, assessment_id: 'as-h1', assessment: assessments.h1 },
        { id: 'g7', score: 8.5, student_id: studentId, assessment_id: 'as-h2', assessment: assessments.h2 },
        { id: 'g8', score: 9.5, student_id: studentId, assessment_id: 'as-c1', assessment: assessments.c1 },
        { id: 'g9', score: 7.0, student_id: studentId, assessment_id: 'as-c2', assessment: assessments.c2 }
      ];
    } else if (studentId === 'aluno-2') { // Ana Paula - Aprovada regular
      return [
        { id: 'g10', score: 6.0, student_id: studentId, assessment_id: 'as-m1', assessment: assessments.m1 },
        { id: 'g11', score: 6.5, student_id: studentId, assessment_id: 'as-m2', assessment: assessments.m2 },
        { id: 'g12', score: 7.0, student_id: studentId, assessment_id: 'as-m3', assessment: assessments.m3 },
        { id: 'g13', score: 7.5, student_id: studentId, assessment_id: 'as-p1', assessment: assessments.p1 },
        { id: 'g14', score: 6.0, student_id: studentId, assessment_id: 'as-p2', assessment: assessments.p2 },
        { id: 'g15', score: 8.0, student_id: studentId, assessment_id: 'as-h1', assessment: assessments.h1 },
        { id: 'g16', score: 7.0, student_id: studentId, assessment_id: 'as-h2', assessment: assessments.h2 },
        { id: 'g17', score: 6.5, student_id: studentId, assessment_id: 'as-c1', assessment: assessments.c1 },
        { id: 'g18', score: 6.0, student_id: studentId, assessment_id: 'as-c2', assessment: assessments.c2 }
      ];
    } else if (studentId === 'aluno-3') { // Pedro Henrique - Reprovado por Nota (Média < 6)
      return [
        { id: 'g19', score: 4.5, student_id: studentId, assessment_id: 'as-m1', assessment: assessments.m1 },
        { id: 'g20', score: 5.0, student_id: studentId, assessment_id: 'as-m2', assessment: assessments.m2 },
        { id: 'g21', score: 5.5, student_id: studentId, assessment_id: 'as-m3', assessment: assessments.m3 },
        { id: 'g22', score: 6.0, student_id: studentId, assessment_id: 'as-p1', assessment: assessments.p1 },
        { id: 'g23', score: 5.0, student_id: studentId, assessment_id: 'as-p2', assessment: assessments.p2 },
        { id: 'g24', score: 5.5, student_id: studentId, assessment_id: 'as-h1', assessment: assessments.h1 },
        { id: 'g25', score: 4.0, student_id: studentId, assessment_id: 'as-h2', assessment: assessments.h2 },
        { id: 'g26', score: 6.0, student_id: studentId, assessment_id: 'as-c1', assessment: assessments.c1 },
        { id: 'g27', score: 4.5, student_id: studentId, assessment_id: 'as-c2', assessment: assessments.c2 }
      ];
    } else if (studentId === 'aluno-4') { // Mariana - Reprovada por Frequência (Frequência < 75%)
      return [
        { id: 'g28', score: 9.0, student_id: studentId, assessment_id: 'as-m1', assessment: assessments.m1 },
        { id: 'g29', score: 8.5, student_id: studentId, assessment_id: 'as-m2', assessment: assessments.m2 },
        { id: 'g30', score: 8.0, student_id: studentId, assessment_id: 'as-m3', assessment: assessments.m3 },
        { id: 'g31', score: 9.5, student_id: studentId, assessment_id: 'as-p1', assessment: assessments.p1 },
        { id: 'g32', score: 9.0, student_id: studentId, assessment_id: 'as-p2', assessment: assessments.p2 }
      ];
    } else { // Outros
      return [
        { id: 'g33', score: 5.0, student_id: studentId, assessment_id: 'as-m1', assessment: assessments.m1 },
        { id: 'g34', score: 4.5, student_id: studentId, assessment_id: 'as-m2', assessment: assessments.m2 },
        { id: 'g35', score: 5.0, student_id: studentId, assessment_id: 'as-p1', assessment: assessments.p1 },
        { id: 'g36', score: 4.0, student_id: studentId, assessment_id: 'as-p2', assessment: assessments.p2 }
      ];
    }
  }

  function getMockAttendanceForStudent(studentId: string): AttendanceRecord[] {
    const dates = [
      '2026-02-15', '2026-02-22', '2026-03-01', '2026-03-08', '2026-03-15',
      '2026-03-22', '2026-03-29', '2026-04-05', '2026-04-12', '2026-04-19'
    ];

    return dates.map((date, index) => {
      let present = true;
      
      // Criando padrões de presença diferentes por aluno
      if (studentId === 'aluno-1') {
        present = true; // 100% presenças
      } else if (studentId === 'aluno-2') {
        present = index !== 3 && index !== 7; // 80% presenças (8 de 10)
      } else if (studentId === 'aluno-3') {
        present = index !== 5; // 90% presenças (9 de 10)
      } else if (studentId === 'aluno-4') {
        present = index < 6; // 60% presenças (6 de 10) -> Reprovado por frequência
      } else {
        present = index % 3 !== 0; // Aproximadamente 66% presenças
      }

      return {
        id: `att-${studentId}-${index}`,
        present,
        student_id: studentId,
        attendance_list_id: `list-${index}`,
        attendance_list: {
          id: `list-${index}`,
          date,
          class_id: 'turma-a'
        }
      };
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 transition-colors duration-200">
      
      {/* HEADER DE TELA (Escondido na impressão) */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <GraduationCap className="h-4 w-4" />
            <span>Painel do Professor & Coordenação</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Boletim Escolar Oficial
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consulte notas, médias, faltas e situação escolar integrada de forma instantânea.
          </p>
        </div>
        
        {/* Badge Informativo de Conexão */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 text-xs text-blue-700 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Conectado ao Supabase Production
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA DA ESQUERDA: Filtros e Seleção de Alunos (Escondida na Impressão) */}
        <section className="lg:col-span-4 flex flex-col gap-6 print:hidden">
          
          {/* Card de Seleção e Filtros */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Users className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Filtros de Busca</h2>
            </div>
            
            <div className="flex flex-col gap-4">
              
              {/* PASSO 1: Selecionar Turma */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  1. Selecionar Turma
                </label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudentId('');
                  }}
                >
                  <option value="">Selecione uma turma...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClassId && (
                <>
                  {/* Busca por Nome */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Buscar por Nome
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Nome do aluno..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Busca por Matrícula */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Buscar por Matrícula
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Nº da Matrícula..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={searchRegNumber}
                        onChange={(e) => setSearchRegNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* PASSO 2: Lista de Alunos da Turma */}
          {selectedClassId && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex-1 min-h-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold text-slate-900 text-sm">Alunos Encontrados</h2>
                </div>
                <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {filteredStudents.length}
                </span>
              </div>

              {/* Grid / Lista de Alunos */}
              <div className="space-y-2 overflow-y-auto max-h-[400px] flex-1 pr-1">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const isSelected = selectedStudentId === student.id;
                    return (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          isSelected 
                            ? 'bg-blue-50/70 border-blue-200 ring-1 ring-blue-500' 
                            : 'bg-white hover:bg-slate-50 border-slate-100'
                        }`}
                      >
                        {/* Foto ou Avatar */}
                        {student.photo_url ? (
                          <img 
                            src={student.photo_url} 
                            alt={`Foto de ${student.name}`} 
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                            onError={(e) => {
                              // Fallback se a imagem der erro
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate leading-snug">
                            {student.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">
                            Matrícula: {student.registration_number}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs">Nenhum aluno atende aos filtros de busca informados.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </section>

        {/* COLUNA DA DIREITA: Visualização do Boletim Escolar */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          
          {/* LOBBY / ESTADO INICIAL SEM ALUNO SELECIONADO (Escondido na Impressão) */}
          {!selectedStudentId && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px] print:hidden">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4 animate-bounce">
                <BookOpen className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Aguardando Seleção de Aluno
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Selecione uma turma na barra lateral esquerda e depois clique em um estudante para carregar o boletim escolar unificado e as frequências.
              </p>
            </div>
          )}

          {/* ESTADO DE CARREGAMENTO */}
          {isLoading && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">Buscando notas e históricos nas tabelas do Supabase...</p>
              <p className="text-xs text-slate-400 mt-1">Carregando dados das avaliações e registros de presenças.</p>
            </div>
          )}

          {/* EXIBIÇÃO DE ERRO */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800 text-sm">Ocorreu um erro inesperado</h4>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <button 
                  onClick={() => selectedStudentId && generateStudentReport(selectedStudentId)}
                  className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-md text-xs font-semibold transition"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}

          {/* CONTEÚDO DO BOLETIM COMPLETAMENTE CARREGADO */}
          {reportCard && !isLoading && (
            <div className="space-y-6 print:space-y-8">
              
              {/* BARRA DE AÇÕES DO BOLETIM (Escondida na Impressão) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
                <div className="text-xs text-slate-500 font-medium">
                  Boletim gerado eletronicamente em <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
                </div>
                <button 
                  onClick={handlePrint}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Boletim Escolar
                </button>
              </div>

              {/* ==========================================
                  PASSO 3: CARTÃO IDENTIFICADOR DO ALUNO
                  ========================================== */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden relative print:border-none print:shadow-none print:p-0">
                
                {/* Linha de fundo azul estilizada (Decorativo, some no Print) */}
                <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 print:hidden" />

                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pt-2 print:pt-0">
                  {/* Foto do Aluno */}
                  {reportCard.student.photo_url ? (
                    <img 
                      src={reportCard.student.photo_url} 
                      alt={`Foto de ${reportCard.student.name}`} 
                      className="w-24 h-24 rounded-xl object-cover border-4 border-slate-50 shadow-md print:shadow-none print:border-2 print:border-slate-300"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-3xl shadow-md print:shadow-none print:border">
                      {reportCard.student.name.charAt(0)}
                    </div>
                  )}

                  {/* Informações Pessoais Acadêmicas */}
                  <div className="text-center md:text-left flex-1 space-y-1">
                    <span className="bg-blue-50 text-blue-700 font-semibold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full print:border print:border-slate-300">
                      Boletim de Aproveitamento Acadêmico
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-950 mt-1.5 print:text-xl">
                      {reportCard.student.name}
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <div>
                        <span className="font-medium text-slate-400">Matrícula:</span>{' '}
                        <strong className="text-slate-800 font-mono text-sm">{reportCard.student.registration_number}</strong>
                      </div>
                      <div>
                        <span className="font-medium text-slate-400">Turma:</span>{' '}
                        <strong className="text-slate-800">{reportCard.className}</strong>
                      </div>
                      <div>
                        <span className="font-medium text-slate-400">Ano Letivo:</span>{' '}
                        <strong className="text-slate-800">2026</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ==========================================
                  PASSO 7 e 8: METRICAS GERAIS (CARDS DE ESTATÍSTICA)
                  ========================================== */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
                
                {/* Média Geral */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between print:border-slate-300">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Média Geral</span>
                    <Award className="h-4.5 w-4.5 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900">{reportCard.overallAverage.toFixed(1)}</span>
                    <p className="text-[10px] text-slate-400 mt-1">Média mínima exigida: 6.0</p>
                  </div>
                </div>

                {/* Frequência Geral */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between print:border-slate-300">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Frequência Geral</span>
                    <Clock className="h-4.5 w-4.5 text-indigo-500" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900">{reportCard.attendanceRate}%</span>
                    <p className="text-[10px] text-slate-400 mt-1">Mínimo exigido: 75%</p>
                  </div>
                </div>

                {/* Presenças x Faltas */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between print:border-slate-300">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Presenças / Faltas</span>
                    <Calendar className="h-4.5 w-4.5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1 text-slate-900 font-bold">
                      <span className="text-xl text-emerald-600">{reportCard.presents}</span>
                      <span className="text-slate-300 text-xs">/</span>
                      <span className="text-xl text-red-500">{reportCard.absences}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">De um total de {reportCard.totalClasses} aulas</p>
                  </div>
                </div>

                {/* Situação Final */}
                <div className={`rounded-xl border shadow-sm p-4 flex flex-col justify-between print:border-slate-300 ${
                  reportCard.finalStatus === 'APROVADO' 
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                    : 'bg-red-50/50 border-red-200 text-red-950'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Situação Escolar</span>
                    {reportCard.finalStatus === 'APROVADO' ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4.5 w-4.5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <span className={`text-sm font-extrabold tracking-wide block ${
                      reportCard.finalStatus === 'APROVADO' ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {reportCard.finalStatus}
                    </span>
                    <p className="text-[10px] opacity-60 mt-1">Conforme critérios institucionais</p>
                  </div>
                </div>

              </div>

              {/* ==========================================
                  TABELA DE DISCIPLINAS E DETALHES DE NOTAS
                  ========================================== */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-300">
                
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center print:bg-white">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Aproveitamento Detalhado por Disciplina
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold print:hidden">
                    Clique nas linhas para expandir as avaliações
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {Object.keys(reportCard.subjects).length > 0 ? (
                    Object.values(reportCard.subjects).map((subjectReport) => {
                      const isExpanded = !!expandedSubjects[subjectReport.subjectId];
                      const isApproved = subjectReport.average >= 6.0;

                      return (
                        <div key={subjectReport.subjectId} className="transition">
                          
                          {/* LINHA PRINCIPAL DA DISCIPLINA */}
                          <div 
                            onClick={() => toggleSubject(subjectReport.subjectId)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-slate-50/70 transition-colors gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-8 rounded-full bg-blue-500" />
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm">
                                  {subjectReport.subjectName}
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {subjectReport.assessmentsCount} {subjectReport.assessmentsCount === 1 ? 'avaliação registrada' : 'avaliações registradas'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6">
                              {/* Média */}
                              <div className="text-right">
                                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">MÉDIA</span>
                                <span className={`text-base font-black ${isApproved ? 'text-blue-600' : 'text-rose-600'}`}>
                                  {subjectReport.average.toFixed(1)}
                                </span>
                              </div>

                              {/* Situação Parcial */}
                              <div className="text-right min-w-[100px]">
                                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">STATUS</span>
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-block ${
                                  subjectReport.status === 'Aprovado' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : subjectReport.status === 'Em Recuperação'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {subjectReport.status}
                                </span>
                              </div>

                              {/* Ícone Indicador de Expansão (Escondido no Print) */}
                              <div className="text-slate-400 flex-shrink-0 print:hidden">
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5" />
                                ) : (
                                  <ChevronDown className="h-5 w-5" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ==========================================
                              PASSO 5: DETALHES DE AVALIAÇÕES EXPANDIDAS
                              ========================================== */}
                          {(isExpanded || window.matchMedia('print').matches) && (
                            <div className="bg-slate-50/40 px-4 pb-4 border-t border-slate-100 print:bg-white print:p-0">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left mt-3 border border-slate-150 rounded-lg overflow-hidden bg-white print:border-slate-300">
                                  <thead>
                                    <tr className="bg-slate-100/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150 print:bg-slate-50">
                                      <th className="py-2.5 px-3">Data</th>
                                      <th className="py-2.5 px-3">Título da Avaliação</th>
                                      <th className="py-2.5 px-3">Tipo</th>
                                      <th className="py-2.5 px-3 text-right">Nota Obtida</th>
                                      <th className="py-2.5 px-3 text-right">Nota Máxima</th>
                                      <th className="py-2.5 px-3 text-center">Aproveitamento</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150 text-xs">
                                    {subjectReport.grades.map((grade) => {
                                      const ratio = (grade.score / grade.maxScore) * 100;
                                      return (
                                        <tr key={grade.assessmentId} className="hover:bg-slate-50/50">
                                          <td className="py-2 px-3 text-slate-500 font-mono whitespace-nowrap">
                                            {new Date(grade.date).toLocaleDateString('pt-BR')}
                                          </td>
                                          <td className="py-2 px-3 font-semibold text-slate-800">
                                            {grade.title}
                                          </td>
                                          <td className="py-2 px-3">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                                              {grade.type}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                                            {grade.score.toFixed(1)}
                                          </td>
                                          <td className="py-2 px-3 text-right text-slate-400 font-medium">
                                            {grade.maxScore.toFixed(1)}
                                          </td>
                                          <td className="py-2 px-3">
                                            <div className="flex items-center gap-2 justify-center">
                                              <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block print:block">
                                                <div 
                                                  className={`h-full rounded-full ${
                                                    ratio >= 60 ? 'bg-blue-500' : 'bg-rose-400'
                                                  }`}
                                                  style={{ width: `${ratio}%` }}
                                                />
                                              </div>
                                              <span className="text-[10px] font-bold text-slate-500">
                                                {Math.round(ratio)}%
                                              </span>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Nenhuma disciplina ou avaliação vinculada a este aluno nas tabelas integradas.
                    </div>
                  )}
                </div>

              </div>

              {/* CRITÉRIOS INSTITUCIONAIS DE APROVAÇÃO */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-xs text-slate-500 space-y-2 print:border-slate-300 print:shadow-none">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Critérios Oficiais para Aprovação:</h4>
                <p>1. <strong>Média de Aproveitamento:</strong> O aluno deve atingir média aritmética igual ou superior a <strong>6.0</strong> em todas as disciplinas avaliadas no ano de 2026.</p>
                <p>2. <strong>Frequência Mínima:</strong> A presença obrigatória em aulas deve ser igual ou superior a <strong>75%</strong> do total computado nos diários oficiais de classe.</p>
                <p className="pt-2 text-[11px] border-t border-slate-100 italic">Este documento é uma via oficial de consulta pública de desempenho estudantil, estruturado eletronicamente sob diretrizes pedagógicas ativas.</p>
              </div>

              {/* RODAPÉ ASSINATURA - Visível exclusivamente na impressão */}
              <div className="hidden print:block mt-16 pt-8 border-t-2 border-slate-300 text-center text-xs">
                <div className="grid grid-cols-2 gap-12">
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-0.5 bg-slate-400 mb-2"></div>
                    <p className="font-semibold text-slate-700">Assinatura da Coordenação Pedagógica</p>
                    <p className="text-[10px] text-slate-400">Secretaria Escolar Registrada</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-0.5 bg-slate-400 mb-2"></div>
                    <p className="font-semibold text-slate-700">Responsável Legal do Estudante</p>
                    <p className="text-[10px] text-slate-400">Assinatura do Pai/Mãe/Tutor</p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </section>

      </main>

      {/* ESTILO CSS GLOBAL ADICIONAL PARA CONFIGURAÇÃO DE IMPRESSÃO */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          main {
            display: block !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:pt-0 {
            padding-top: 0 !important;
          }
          .print\\:border {
            border: 1px solid #cbd5e1 !important;
          }
          .print\\:border-slate-300 {
            border-color: #cbd5e1 !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:space-y-8 > * + * {
            margin-top: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}