import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Clipboard } from 'lucide-react';


// ==========================================
// ETAPA 16: INTERFACES TYPESCRIPT (Sincronizadas com o seu DB)
// ==========================================
interface Teacher {
  id: string;
  registration_number: string;
  full_name: string; // Sincronizado
  email: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
  room: string;
  period: string;
  teacher_name: string; // Sincronizado
}

interface TeacherSchedule {
  id: string;
  teacher_id: string;
  class_id: string;
  weekday: string; // Sincronizado (Textual: 'Segunda-feira', 'Terça-feira', etc.)
  start_time: string;
  end_time: string;
}

interface Student {
  id: string;
  enrollment_number: string; // Sincronizado
  full_name: string; // Sincronizado
  photo_url?: string;
  status: 'active' | 'inactive' | 'suspended' | 'transferred';
  class_id: string;
}

interface AttendanceRecord {
  id: string;
  attendance_list_id: string;
  student_id: string;
  present: boolean;
  marked_at: string | null;
  marked_by_teacher_id: string | null;
  students?: {
    full_name: string; // Sincronizado
    enrollment_number: string; // Sincronizado
    photo_url?: string;
  };
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

export default function App() {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [currentSchedule, setCurrentSchedule] = useState<TeacherSchedule | null>(null);
  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [attendanceListId, setAttendanceListId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // --- LOADING STATES ---
  const [loadings, setLoadings] = useState({
    teacher: false,
    scheduleAndClass: false,
    listAndRecords: false,
    markingId: null as string | null,
  });

  // --- ERROR/SUCCESS STATES ---
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- SIMULADOR DE DATA/HORA ---
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedDay, setSimulatedDay] = useState<number>(new Date().getDay());
  const [simulatedTime, setSimulatedTime] = useState<string>(
    new Date().toTimeString().split(' ')[0]
  );

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auxiliar para converter o número do dia do getDay() para o formato textual do seu DB
  const getWeekdayName = (dayNum: number): string => {
    const days = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    return days[dayNum] || 'Desconhecido';
  };

  // ==========================================
  // ETAPA 17 & 18: LÓGICAS E CONSULTAS SUPABASE EXCLUSIVAS COM "await supabase"
  // ==========================================

  // --- ETAPA 1: findTeacher() ---
  const findTeacher = async (regNumber: string): Promise<Teacher | null> => {
    setError(null);
    setLoadings((prev) => ({ ...prev, teacher: true }));
    try {
      const { data: teacherData, error: teacherErr } = await supabase
        .from('teachers')
        .select('id, registration_number, full_name, email')
        .eq('registration_number', regNumber.trim())
        .maybeSingle();

      if (teacherErr) throw teacherErr;
      return teacherData as Teacher | null;
    } catch (err: any) {
      console.error('Erro ao buscar professor:', err);
      setError(`Erro ao buscar professor: ${err.message || 'Erro desconhecido'}`);
      return null;
    } finally {
      setLoadings((prev) => ({ ...prev, teacher: false }));
    }
  };

  // --- ETAPA 3: findCurrentSchedule() ---
  const findCurrentSchedule = async (
    teacherId: string,
    weekdayText: string,
    timeStr: string
  ): Promise<TeacherSchedule | null> => {
    try {
      const { data: scheduleData, error: scheduleErr } = await supabase
        .from('teacher_schedules')
        .select('id, teacher_id, class_id, weekday, start_time, end_time')
        .eq('teacher_id', teacherId)
        .eq('weekday', weekdayText)
        .lte('start_time', timeStr)
        .gte('end_time', timeStr)
        .maybeSingle();

      if (scheduleErr) throw scheduleErr;
      return scheduleData as TeacherSchedule | null;
    } catch (err: any) {
      console.error('Erro ao obter o cronograma do professor:', err);
      setError(`Erro ao obter o horário de aula: ${err.message}`);
      return null;
    }
  };

  // --- ETAPA 4: findClass() ---
  const findClass = async (classId: string): Promise<Class | null> => {
    try {
      const { data: classData, error: classErr } = await supabase
        .from('classes')
        .select('id, name, grade, room, period, teacher_name')
        .eq('id', classId)
        .maybeSingle();

      if (classErr) throw classErr;
      return classData as Class | null;
    } catch (err: any) {
      console.error('Erro ao obter dados da turma:', err);
      setError(`Erro ao carregar dados da turma: ${err.message}`);
      return null;
    }
  };

  // --- ETAPA 5: loadStudents() ---
  const loadStudents = async (classId: string): Promise<Student[]> => {
    try {
      const { data: studentsData, error: studentsErr } = await supabase
        .from('students')
        .select('id, enrollment_number, full_name, photo_url, status, class_id')
        .eq('class_id', classId)
        .order('full_name', { ascending: true });

      if (studentsErr) {
        console.error('Erro ao carregar estudantes:', studentsErr);
        setError(`Erro ao listar estudantes da turma: ${studentsErr.message}`);
        return [];
      }

      // Filtragem apenas por alunos com status 'active' conforme Etapa 5
      const activeOnes = (studentsData || []).filter((s: any) => s.status === 'active');
      return activeOnes as Student[];
    } catch (err: any) {
      console.error('Erro inesperado no loadStudents:', err);
      setError(`Erro de sistema ao carregar os estudantes: ${err.message}`);
      return [];
    }
  };

  // --- ETAPA 6: getOrCreateAttendanceList() ---
  const getOrCreateAttendanceList = async (
    teacherId: string,
    classId: string,
    scheduleId: string,
    lessonDate: string
  ): Promise<string | null> => {
    try {
      const { data: existing, error: findError } = await supabase
        .from('attendance_lists')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('class_id', classId)
        .eq('schedule_id', scheduleId)
        .eq('lesson_date', lessonDate)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        return existing.id;
      }

      const { data: created, error: createError } = await supabase
        .from('attendance_lists')
        .insert({
          teacher_id: teacherId,
          class_id: classId,
          schedule_id: scheduleId,
          lesson_date: lessonDate,
        })
        .select('id')
        .single();

      if (createError) throw createError;
      return created.id;
    } catch (err: any) {
      console.error('Erro na lista de chamadas:', err);
      setError(`Erro ao obter ou criar a lista de chamadas: ${err.message}`);
      return null;
    }
  };

  // --- ETAPA 7: createAttendanceRecords() ---
  const getOrCreateAttendanceRecords = async (
    listId: string,
    activeStudents: Student[]
  ): Promise<AttendanceRecord[]> => {
    try {
      const { data: existingRecords, error: fetchError } = await supabase
        .from('attendance_records')
        .select('id, attendance_list_id, student_id, present, marked_at, marked_by_teacher_id, students (full_name, enrollment_number, photo_url)')
        .eq('attendance_list_id', listId);

      if (fetchError) {
        setError(`Erro ao sincronizar presenças: ${fetchError.message}`);
        return [];
      }

      const existingStudentIds = new Set(existingRecords?.map((r: any) => r.student_id));
      const missingStudents = activeStudents.filter((s) => !existingStudentIds.has(s.id));

      if (missingStudents.length > 0) {
        const recordsToInsert = missingStudents.map((student) => ({
          attendance_list_id: listId,
          student_id: student.id,
          present: false,
          marked_at: null,
          marked_by_teacher_id: null,
        }));

        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert(recordsToInsert);

        if (insertError) {
          setError(`Erro ao inserir presenças dos novos alunos: ${insertError.message}`);
          return (existingRecords || []) as AttendanceRecord[];
        }

        const { data: updatedRecords, error: refetchError } = await supabase
          .from('attendance_records')
          .select('id, attendance_list_id, student_id, present, marked_at, marked_by_teacher_id, students (full_name, enrollment_number, photo_url)')
          .eq('attendance_list_id', listId);

        if (refetchError) {
          setError(`Erro ao buscar lista de presenças atualizada: ${refetchError.message}`);
          return (existingRecords || []) as AttendanceRecord[];
        }

        return (updatedRecords || []) as AttendanceRecord[];
      }

      return (existingRecords || []) as AttendanceRecord[];
    } catch (err: any) {
      console.error('Erro ao sincronizar registros de presença:', err);
      setError(`Erro interno ao sincronizar os alunos: ${err.message}`);
      return [];
    }
  };

  // --- ETAPA 10: markAttendance() ---
  const markAttendance = async (recordId: string) => {
    if (!currentTeacher) return;

    setError(null);
    setLoadings((prev) => ({ ...prev, markingId: recordId }));

    try {
      const nowIso = new Date().toISOString();

      const { error: sbError } = await supabase
        .from('attendance_records')
        .update({
          present: true,
          marked_at: nowIso,
          marked_by_teacher_id: currentTeacher.id,
        })
        .eq('id', recordId);

      if (sbError) throw sbError;

      // Atualizar o estado em memória para atualização instantânea (Etapa 10)
      setAttendanceRecords((prev) =>
        prev.map((rec) =>
          rec.id === recordId
            ? {
                ...rec,
                present: true,
                marked_at: nowIso,
                marked_by_teacher_id: currentTeacher.id,
              }
            : rec
        )
      );
      setSuccessMessage('Presença registrada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao marcar presença:', err);
      setError(`Erro ao registrar presença do aluno: ${err.message}`);
    } finally {
      setLoadings((prev) => ({ ...prev, markingId: null }));
    }
  };

  // ==========================================
  // INICIAR CHAMADA - FLUXO COMPLETO
  // ==========================================
  const handleStartAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationNumber.trim()) {
      setError('Por favor, digite sua matrícula de professor.');
      return;
    }

    setError(null);

    // ETAPA 1: Identificar o Professor
    const teacher = await findTeacher(registrationNumber);
    if (!teacher) {
      setError('Nenhum professor cadastrado foi encontrado com esta matrícula.');
      return;
    }
    setCurrentTeacher(teacher);

    // ETAPA 2: Obter data, hora e dia da semana atuais
    setLoadings((prev) => ({ ...prev, scheduleAndClass: true }));

    const today = new Date();
    const dayOfWeek = simulationMode ? simulatedDay : today.getDay(); 
    
    // Converte o dia numérico para a string textual esperada no banco de dados (ex: 'Quinta-feira')
    const weekdayText = getWeekdayName(dayOfWeek);
    
    const lessonDate = today.toLocaleDateString('pt-BR').split('/').reverse().join('-');
    const currentTimeString = simulationMode ? simulatedTime : today.toTimeString().split(' ')[0];

    try {
      // ETAPA 3: Buscar cronograma de aulas
      const schedule = await findCurrentSchedule(teacher.id, weekdayText, currentTimeString);
      if (!schedule) {
        setCurrentSchedule(null);
        setCurrentClass(null);
        setAttendanceRecords([]);
        setLoadings((prev) => ({ ...prev, scheduleAndClass: false }));
        return; 
      }
      setCurrentSchedule(schedule);

      // ETAPA 4: Buscar dados da Turma
      const classInfo = await findClass(schedule.class_id);
      if (!classInfo) {
        throw new Error('Não foi possível carregar os detalhes da turma associada ao horário.');
      }
      setCurrentClass(classInfo);

      // ETAPA 5: Buscar todos os alunos ativos da turma
      const activeStudents = await loadStudents(classInfo.id);

      if (activeStudents.length === 0) {
        setAttendanceRecords([]);
        setLoadings((prev) => ({ ...prev, scheduleAndClass: false }));
        return;
      }

      // ETAPA 6: Verificar ou criar lista de presença
      setLoadings((prev) => ({ ...prev, scheduleAndClass: false, listAndRecords: true }));
      const listId = await getOrCreateAttendanceList(
        teacher.id,
        classInfo.id,
        schedule.id,
        lessonDate
      );

      if (!listId) {
        throw new Error('Não foi possível gerar ou obter a lista de chamadas para hoje.');
      }
      setAttendanceListId(listId);

      // ETAPA 7: Verificar ou criar registros de presença para cada aluno
      const records = await getOrCreateAttendanceRecords(listId, activeStudents);
      setAttendanceRecords(records);

    } catch (err: any) {
      console.error('Erro no fluxo de inicialização:', err);
      setError(err.message || 'Ocorreu um erro ao processar a chamada escolar.');
    } finally {
      setLoadings((prev) => ({ ...prev, scheduleAndClass: false, listAndRecords: false }));
    }
  };

  const handleLogout = () => {
    setCurrentTeacher(null);
    setCurrentSchedule(null);
    setCurrentClass(null);
    setAttendanceListId(null);
    setAttendanceRecords([]);
    setRegistrationNumber('');
    setError(null);
  };

  // ==========================================
  // ETAPA 12: ESTATÍSTICAS EM TEMPO REAL
  // ==========================================
  const statistics = useMemo((): AttendanceStats => {
    const total = attendanceRecords.length;
    if (total === 0) {
      return { total: 0, present: 0, absent: 0, percentage: 0 };
    }
    const present = attendanceRecords.filter((rec) => rec.present).length;
    const absent = total - present;
    const percentage = Math.round((present / total) * 100);

    return { total, present, absent, percentage };
  }, [attendanceRecords]);

  // ==========================================
  // ETAPA 13: FILTRO / BUSCA DE ALUNOS
  // ==========================================
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return attendanceRecords;

    const query = searchQuery.toLowerCase().trim();
    return attendanceRecords.filter((rec) => {
      const studentName = rec.students?.full_name?.toLowerCase() || '';
      const studentReg = rec.students?.enrollment_number?.toLowerCase() || '';
      return studentName.includes(query) || studentReg.includes(query);
    });
  }, [attendanceRecords, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pt-8">
      {/* CABEÇALHO DO SISTEMA */}
      <header className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div >
                <div className="flex items-center space-x-3">
                    <div className=" text-blue-600">
                        <Clipboard className="w-8 h-8" />
                    </div>
                    <div>
                        <span className="text-2xl font-bold text-slate-950 tracking-tight block leading-none">Controle de Presença</span>
                    </div>
                </div>
                <span className="text-xs text-slate-500 font-medium">Controle de Frequência Escolar</span>
            </div>

          <div className="flex items-center space-x-3">
            {/* Simulador para auxiliar o teste manual */}
            <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 text-xs border border-slate-200">
              <button
                type="button"
                onClick={() => setSimulationMode(!simulationMode)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  simulationMode
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {simulationMode ? 'Simulador Ativo' : 'Simular Dia/Hora'}
              </button>
              {simulationMode && (
                <div className="flex items-center space-x-2 px-2 border-l border-slate-200 ml-1">
                  <select
                    value={simulatedDay}
                    onChange={(e) => setSimulatedDay(Number(e.target.value))}
                    className="bg-transparent border-none text-xs font-semibold focus:outline-none"
                  >
                    <option value={1}>Segunda</option>
                    <option value={2}>Terça</option>
                    <option value={3}>Quarta</option>
                    <option value={4}>Quinta</option>
                    <option value={5}>Sexta</option>
                    <option value={6}>Sábado</option>
                  </select>
                  <input
                    type="time"
                    value={simulatedTime.substring(0, 5)}
                    onChange={(e) => setSimulatedTime(`${e.target.value}:00`)}
                    className="bg-transparent border-none text-xs font-semibold focus:outline-none w-16"
                  />
                </div>
              )}
            </div>

            {currentTeacher && (
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition duration-200"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ALERTAS GERAIS DE ERRO OU SUCESSO */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold">Mensagem do Sistema</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold">Sucesso!</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {/* ==========================================
            ETAPA 1: TELA INICIAL (Login do Professor)
            ========================================== */}
        {!currentTeacher && (
          <div className="max-w-md mx-auto my-12">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-8">
              <div className="text-center mb-8">
                <span className="text-2xl font-bold text-slate-900 block">Iniciar Aula</span>
                <p className="text-sm text-slate-500 mt-1">Informe sua matrícula de docente para carregar a aula agendada para o horário atual.</p>
              </div>

              {/* Formulário de login */}
              <form onSubmit={handleStartAttendance} className="space-y-6">
                <div>
                  <label htmlFor="reg_number" className="block text-sm font-semibold text-slate-700 mb-2">
                    Matrícula do Professor
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <input
                      id="reg_number"
                      type="text"
                      required
                      placeholder="Ex: PROF123"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-sm"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1.5 block">Dica: Use a matrícula de teste <strong className="font-semibold text-blue-600">PROF123</strong> cadastrada via script.</span>
                </div>

                {/* Simulador mobile/inline */}
                <div className="block md:hidden p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-700">Simulação de Horário:</span>
                    <input
                      type="checkbox"
                      checked={simulationMode}
                      onChange={(e) => setSimulationMode(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  {simulationMode && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <select
                        value={simulatedDay}
                        onChange={(e) => setSimulatedDay(Number(e.target.value))}
                        className="bg-white border border-slate-200 rounded p-1.5 font-medium"
                      >
                        <option value={1}>Segunda</option>
                        <option value={2}>Terça</option>
                        <option value={3}>Quarta</option>
                        <option value={4}>Quinta</option>
                        <option value={5}>Sexta</option>
                        <option value={6}>Sábado</option>
                      </select>
                      <input
                        type="time"
                        value={simulatedTime.substring(0, 5)}
                        onChange={(e) => setSimulatedTime(`${e.target.value}:00`)}
                        className="bg-white border border-slate-200 rounded p-1.5 font-medium"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loadings.teacher}
                  className="w-full flex justify-center items-center px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 rounded-xl disabled:opacity-50 transition duration-150 shadow-md shadow-blue-100"
                >
                  {loadings.teacher ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Buscando Professor...
                    </>
                  ) : (
                    'Iniciar Chamada'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SE O PROFESSOR ESTÁ LOGADO */}
        {currentTeacher && (
          <div>
            {/* CARREGAMENTO DA BUSCA DE CRONOGRAMA, CLASSE OU CARREGAMENTO INICIAL */}
            {loadings.scheduleAndClass ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
                <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm font-semibold text-slate-600">Identificando aula do horário...</p>
                <p className="text-xs text-slate-400 mt-1">Isso pode levar alguns instantes.</p>
              </div>
            ) : !currentSchedule ? (
              /* ==========================================
                 ETAPA 3: NENHUMA AULA ENCONTRADA
                 ========================================== */
              <div className="max-w-xl mx-auto py-12">
                <div className="bg-white rounded-xl border border-red-100 shadow-md p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 block">Nenhuma aula encontrada para este horário.</span>
                  <p className="text-sm text-slate-500 mt-2">
                    Não há horários definidos para <strong className="font-semibold">{currentTeacher.full_name}</strong> no dia de hoje (
                    <span className="font-medium text-blue-600">{getWeekdayName(simulationMode ? simulatedDay : new Date().getDay())}</span>)
                    {simulationMode ? ' no horário simulado ' : ' no horário atual '} (
                    <span className="font-medium text-blue-600">{simulationMode ? simulatedTime.substring(0, 5) : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>).
                  </p>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-center items-center gap-3">
                    <button
                      onClick={() => {
                        setSimulationMode(true);
                        setSimulatedDay(4); // Quinta-feira na seed tem aula longa (07:00 às 22:00)
                        setSimulatedTime('10:00:00');
                        setError('Ajustamos o simulador para Quinta-feira às 10h. Clique em Recarregar para testar.');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200 transition duration-150"
                    >
                      Ajustar Simulador (Forçar Quinta-feira de Teste)
                    </button>
                    <button
                      onClick={handleLogout}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition duration-150"
                    >
                      Voltar e trocar matrícula
                    </button>
                    <button
                      onClick={(e) => handleStartAttendance(e)}
                      className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition duration-150 shadow-md shadow-blue-100"
                    >
                      Recarregar Horário
                    </button>
                  </div>
                </div>
              </div>
            ) : loadings.listAndRecords ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
                <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm font-semibold text-slate-600">Sincronizando Lista de Chamadas...</p>
                <p className="text-xs text-slate-400 mt-1">Gerando registros automáticos para todos os alunos ativos.</p>
              </div>
            ) : (
              /* CHAMADA CARREGADA COM SUCESSO */
              <div className="space-y-6">

                {/* ==========================================
                    ETAPA 8: CABEÇALHO DA CHAMADA
                    ========================================== */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Diário de Presença</h1>
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase">
                          Chamada Ativa
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Professor: <strong className="font-semibold text-slate-800">{currentTeacher.full_name}</strong> • Matrícula: <strong className="font-semibold text-slate-800">{currentTeacher.registration_number}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center md:text-left">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Turma</span>
                      <span className="text-sm font-semibold text-slate-900">{currentClass?.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Série</span>
                      <span className="text-sm font-semibold text-slate-900">{currentClass?.grade}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Sala / Período</span>
                      <span className="text-sm font-semibold text-slate-900">{currentClass?.room} ({currentClass?.period})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Horário da Aula</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {currentSchedule.start_time.substring(0, 5)} - {currentSchedule.end_time.substring(0, 5)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ==========================================
                    ETAPA 12: DASHBOARD SUPERIOR
                    ========================================== */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total de Alunos */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block">Total de Alunos</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">{statistics.total}</span>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                  </div>

                  {/* Presentes */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-600 block">Presentes</span>
                      <span className="text-2xl font-bold text-emerald-700 mt-1 block">{statistics.present}</span>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* Ausentes */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-red-500 block">Ausentes</span>
                      <span className="text-2xl font-bold text-red-600 mt-1 block">{statistics.absent}</span>
                    </div>
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* Percentual de Presença */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 block">Frequência da Aula</span>
                      <span className="text-2xl font-bold text-blue-700 mt-1 block">{statistics.percentage}%</span>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* BARRA DE FERRAMENTAS (Etapa 13 - Busca) */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative w-full sm:max-w-xs">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar por nome ou matrícula..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    Exibindo <strong className="text-slate-700">{filteredRecords.length}</strong> de <strong className="text-slate-700">{statistics.total}</strong> alunos.
                  </div>
                </div>

                {/* ==========================================
                    ETAPA 9: TABELA DE PRESENÇA
                    ========================================== */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-20">Foto</th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Matrícula</th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Aluno</th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Status</th>
                          <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-48">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                              Nenhum aluno encontrado {searchQuery && 'para a busca informada'}.
                            </td>
                          </tr>
                        ) : (
                          filteredRecords.map((record) => {
                            const studentName = record.students?.full_name || 'Não identificado';
                            const studentReg = record.students?.enrollment_number || 'N/A';
                            const photoUrl = record.students?.photo_url;
                            const initials = studentName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

                            return (
                              <tr key={record.id} className="hover:bg-slate-50/50 transition duration-100">
                                {/* FOTO DO ALUNO */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {photoUrl ? (
                                    <img
                                      src={photoUrl}
                                      alt={`Foto de ${studentName}`}
                                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold border border-slate-200">
                                      {initials}
                                    </div>
                                  )}
                                </td>

                                {/* MATRÍCULA */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                    {studentReg}
                                  </span>
                                </td>

                                {/* NOME */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-semibold text-slate-900 block">{studentName}</span>
                                </td>

                                {/* BADGE DE PRESENÇA (Etapa 11) */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {record.present ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                                      Presente
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-1.5"></span>
                                      Ausente
                                    </span>
                                  )}
                                </td>

                                {/* AÇÕES (Etapa 10 e 11) */}
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  {record.present ? (
                                    <div className="text-[10px] text-slate-400">
                                      <span className="block font-medium">Marcada às:</span>
                                      <span className="font-semibold text-slate-500">
                                        {record.marked_at ? new Date(record.marked_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => markAttendance(record.id)}
                                      disabled={loadings.markingId === record.id}
                                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl transition duration-150 shadow-sm shadow-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 w-36"
                                    >
                                      {loadings.markingId === record.id ? (
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                      ) : (
                                        'Marcar Presente'
                                      )}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ==========================================
                    ETAPA 19: CARD DE AUDITORIA DO SISTEMA
                    ========================================== */}
                <div className="bg-slate-100 rounded-xl border border-slate-200 p-5 mt-6">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Auditoria e Rastreabilidade da Lista</span>
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Este sistema atende plenamente à rastreabilidade de dados. Cada presença gravada no banco de dados armazena quem foi o aluno, em qual turma, em qual aula de cronograma, em qual dia, a hora exata da alteração, e qual professor foi responsável por efetuar o registro.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-[11px] bg-white p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-400 block font-medium">ID da Lista de Presença:</span>
                      <span className="font-mono text-slate-600 font-bold block truncate">{attendanceListId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Vínculo de Turma:</span>
                      <span className="text-slate-700 font-bold block">{currentClass?.name} - {currentClass?.grade}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Professor Responsável:</span>
                      <span className="text-slate-700 font-bold block">{currentTeacher.full_name}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </main>

     
    </div>
  );
}