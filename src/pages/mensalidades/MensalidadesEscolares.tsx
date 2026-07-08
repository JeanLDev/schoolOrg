import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search,
    Filter,
    Download,
    Printer,
    FileSpreadsheet,
    FileText,
    User,
    Calendar,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    Clock,
    ChevronDown,
    ChevronUp,
    Users,
    BookOpen,
    Phone,
    Mail,
    Layers,
    CreditCard,
    RefreshCw,
    Plus,
    TrendingUp,
    X,
    FileDown,
    Maximize2
} from 'lucide-react';

// --- CONFIGURAÇÃO E TIPAGEM DO SUPABASE ---
// Tipagem simulando as tabelas informadas e a tabela de mensalidades (student_fees)
export interface ClassItem {
    id: string;
    name: string;
    code?: string;
    level?: string;
}

export interface StudentResponsible {
    id: string;
    student_id: string;
    name: string;
    relationship: string;
    cpf: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    financial_responsible: boolean;
    pedagogical_responsible: boolean;
    emergency_contact: boolean;
}

export interface StudentItem {
    id: string;
    enrollment_number: string;
    full_name: string;
    social_name: string | null;
    birth_date: string;
    gender: string | null;
    cpf: string | null;
    rg: string | null;
    email: string | null;
    phone: string | null;
    class_id: string | null;
    status: 'active' | 'inactive' | 'suspended' | 'transferred';
    photo_url: string | null;
    notes: string | null;
    // Relacionamento embutido do Supabase (quando retornado via query enriquecida)
    classes?: ClassItem;
    student_responsibles?: StudentResponsible[];
}

export interface MonthlyFee {
    id: string;
    student_id: string;
    student_name?: string; // Cache/Denormalized para exibição fácil
    student_enrollment?: string;
    class_name?: string;
    competence: string; // MM/YYYY
    value: number;
    discount: number;
    additional_charges: number; // Acréscimos (Multas/Juros)
    final_value: number;
    due_date: string; // YYYY-MM-DD
    payment_date: string | null; // YYYY-MM-DD
    payment_method: 'boleto' | 'pix' | 'credit_card' | 'cash' | null;
    status_override?: 'PAGA' | 'EM_ABERTO' | 'ATRASADA' | 'CANCELADA';
    notes?: string;
}

// --- CONEXÃO DINÂMICA COM SUPABASE ---
// O sistema tenta instanciar o cliente se as variáveis estiverem disponíveis. 
// Caso contrário, ele executa em modo autônomo com um gerador local baseado nos dados das tabelas informadas.
let supabaseClient: any = null;
try {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.supabase) {
        // @ts-ignore
        supabaseClient = window.supabase;
    }
} catch (e) {
    console.log("Supabase client não injetado no escopo global. Usando simulador enriquecido.");
}

// --- CONSTANTES DE MOCK COMPLETAS (Para carga inicial e fallback) ---
const MOCK_CLASSES: ClassItem[] = [
    { id: 'c1', name: '1º Ano - Ensino Fundamental', code: '1EF-A' },
    { id: 'c2', name: '2º Ano - Ensino Fundamental', code: '2EF-A' },
    { id: 'c3', name: '3º Ano - Ensino Fundamental', code: '3EF-B' },
    { id: 'c4', name: '9º Ano - Ensino Fundamental', code: '9EF-A' },
    { id: 'c5', name: '1º Ano - Ensino Médio', code: '1EM-A' },
];

const MOCK_STUDENTS: StudentItem[] = [
    {
        id: 's1',
        enrollment_number: 'MAT-2026-001',
        full_name: 'João Pedro da Silva Santos',
        social_name: null,
        birth_date: '2015-04-12',
        gender: 'M',
        cpf: '123.456.789-10',
        rg: '9876543-SSP',
        email: 'joao.pedro@escola.com',
        phone: '(11) 98888-7711',
        class_id: 'c1',
        status: 'active',
        photo_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=150',
        notes: 'Necessita acompanhamento extra em matemática.'
    },
    {
        id: 's2',
        enrollment_number: 'MAT-2026-002',
        full_name: 'Maria Clara Vasconcelos',
        social_name: null,
        birth_date: '2014-08-22',
        gender: 'F',
        cpf: '234.567.890-11',
        rg: '8765432-SSP',
        email: 'maria.clara@escola.com',
        phone: '(11) 97777-6622',
        class_id: 'c1',
        status: 'active',
        photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
        notes: 'Alergia a amendoim.'
    },
    {
        id: 's3',
        enrollment_number: 'MAT-2026-003',
        full_name: 'Enzo Gabriel Oliveira',
        social_name: null,
        birth_date: '2015-01-05',
        gender: 'M',
        cpf: '345.678.901-22',
        rg: '7654321-SSP',
        email: 'enzo.gabriel@escola.com',
        phone: '(11) 96666-5533',
        class_id: 'c2',
        status: 'active',
        photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        notes: null
    },
    {
        id: 's4',
        enrollment_number: 'MAT-2026-004',
        full_name: 'Ana Beatriz Souza',
        social_name: 'Bia Souza',
        birth_date: '2010-11-30',
        gender: 'F',
        cpf: '456.789.012-33',
        rg: '6543210-SSP',
        email: 'bia.souza@escola.com',
        phone: '(11) 95555-4444',
        class_id: 'c4',
        status: 'active',
        photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
        notes: 'Atleta de vôlei da escola.'
    },
    {
        id: 's5',
        enrollment_number: 'MAT-2026-005',
        full_name: 'Lucas Ferreira Lima',
        social_name: null,
        birth_date: '2008-05-15',
        gender: 'M',
        cpf: '567.890.123-44',
        rg: '5432109-SSP',
        email: 'lucas.lima@escola.com',
        phone: '(11) 94444-3355',
        class_id: 'c5',
        status: 'inactive',
        photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        notes: 'Transferido no início do semestre.'
    },
];

const MOCK_RESPONSIBLES: StudentResponsible[] = [
    {
        id: 'r1',
        student_id: 's1',
        name: 'Roberto Carlos Santos',
        relationship: 'Pai',
        cpf: '111.222.333-44',
        email: 'roberto.santos@gmail.com',
        phone: '(11) 99111-2233',
        whatsapp: '(11) 99111-2233',
        financial_responsible: true,
        pedagogical_responsible: true,
        emergency_contact: true
    },
    {
        id: 'r2',
        student_id: 's2',
        name: 'Carla Vasconcelos Martins',
        relationship: 'Mãe',
        cpf: '222.333.444-55',
        email: 'carla.vasc@hotmail.com',
        phone: '(11) 99222-3344',
        whatsapp: '(11) 99222-3344',
        financial_responsible: true,
        pedagogical_responsible: true,
        emergency_contact: true
    },
    {
        id: 'r3',
        student_id: 's3',
        name: 'Juliana Oliveira Mendes',
        relationship: 'Mãe',
        cpf: '333.444.555-66',
        email: 'ju.oliveira@outlook.com',
        phone: '(11) 99333-4455',
        whatsapp: '(11) 99333-4455',
        financial_responsible: true,
        pedagogical_responsible: true,
        emergency_contact: false
    },
    {
        id: 'r4',
        student_id: 's4',
        name: 'Marcos Roberto Souza',
        relationship: 'Pai',
        cpf: '444.555.666-77',
        email: 'marcos.souza@empresa.com.br',
        phone: '(11) 99444-5566',
        whatsapp: '(11) 99444-5566',
        financial_responsible: true,
        pedagogical_responsible: false,
        emergency_contact: true
    },
    {
        id: 'r5',
        student_id: 's5',
        name: 'Sandra Ferreira Lima',
        relationship: 'Mãe',
        cpf: '555.666.777-88',
        email: 'sandra.ferreira@gmail.com',
        phone: '(11) 99555-6677',
        whatsapp: '(11) 99555-6677',
        financial_responsible: true,
        pedagogical_responsible: true,
        emergency_contact: true
    }
];

// Gerador inteligente de mensalidades escolares (Anos de 2026)
// Distribui pagamentos regulares, atrasos e inadimplências reais para as perguntas do filtro funcionarem perfeitamente
const generateMockFees = (): MonthlyFee[] => {
    const fees: MonthlyFee[] = [];
    const months = ['01/2026', '02/2026', '03/2026', '04/2026', '05/2026', '06/2026', '07/2026', '08/2026', '09/2026', '10/2026', '11/2026', '12/2026'];
    const baseValue = 850.00;

    // Aluno 1: João Pedro (Sempre em dia, um em aberto futuro)
    months.forEach((m, idx) => {
        const monthNum = idx + 1;
        const isPaid = monthNum < 6; // Venceu até junho, pago
        const isCurrent = monthNum === 6; // Junho: pago com atraso ou aberto
        const dueDate = `2026-${String(monthNum).padStart(2, '0')}-10`;

        fees.push({
            id: `fee-s1-${monthNum}`,
            student_id: 's1',
            student_name: 'João Pedro da Silva Santos',
            student_enrollment: 'MAT-2026-001',
            class_name: '1º Ano - Ensino Fundamental',
            competence: m,
            value: baseValue,
            discount: monthNum % 2 === 0 ? 50.00 : 0.00,
            additional_charges: 0.00,
            final_value: baseValue - (monthNum % 2 === 0 ? 50.00 : 0.00),
            due_date: dueDate,
            payment_date: isPaid ? `2026-${String(monthNum).padStart(2, '0')}-08` : null,
            payment_method: isPaid ? 'pix' : null,
            notes: monthNum % 2 === 0 ? 'Desconto por pontualidade irmão mais velho.' : undefined
        });
    });

    // Aluno 2: Maria Clara (Inadimplente - com mensalidades atrasadas acumuladas)
    months.forEach((m, idx) => {
        const monthNum = idx + 1;
        // Paga apenas janeiro e fevereiro. Março, Abril, Maio e Junho em atraso.
        const isPaid = monthNum <= 2;
        const isFuture = monthNum > 7;
        const dueDate = `2026-${String(monthNum).padStart(2, '0')}-10`;

        fees.push({
            id: `fee-s2-${monthNum}`,
            student_id: 's2',
            student_name: 'Maria Clara Vasconcelos',
            student_enrollment: 'MAT-2026-002',
            class_name: '1º Ano - Ensino Fundamental',
            competence: m,
            value: 950.00,
            discount: 0.00,
            additional_charges: !isPaid && !isFuture ? 25.50 : 0.00,
            final_value: 950.00 + (!isPaid && !isFuture ? 25.50 : 0.00),
            due_date: dueDate,
            payment_date: isPaid ? `2026-${String(monthNum).padStart(2, '0')}-05` : null,
            payment_method: isPaid ? 'boleto' : null,
            notes: !isPaid && !isFuture ? 'Acumulando juros contratuais de 2% ao mês.' : undefined
        });
    });

    // Aluno 3: Enzo Gabriel (Algumas pagas, vencendo hoje ou este mês)
    months.forEach((m, idx) => {
        const monthNum = idx + 1;
        const isPaid = monthNum < 6;
        const dueDate = monthNum === 7 ? '2026-07-08' : `2026-${String(monthNum).padStart(2, '0')}-10`; // Vence hoje 08 de julho de 2026!

        fees.push({
            id: `fee-s3-${monthNum}`,
            student_id: 's3',
            student_name: 'Enzo Gabriel Oliveira',
            student_enrollment: 'MAT-2026-003',
            class_name: '2º Ano - Ensino Fundamental',
            competence: m,
            value: baseValue,
            discount: 0.00,
            additional_charges: 0.00,
            final_value: baseValue,
            due_date: dueDate,
            payment_date: isPaid ? `2026-${String(monthNum).padStart(2, '0')}-09` : null,
            payment_method: isPaid ? 'credit_card' : null,
            notes: monthNum === 7 ? 'Vence na data atual de simulação.' : undefined
        });
    });

    // Aluno 4: Ana Beatriz (Ensino Médio - Bolsa parcial)
    months.forEach((m, idx) => {
        const monthNum = idx + 1;
        const isPaid = monthNum < 7;
        const dueDate = `2026-${String(monthNum).padStart(2, '0')}-05`;

        fees.push({
            id: `fee-s4-${monthNum}`,
            student_id: 's4',
            student_name: 'Ana Beatriz Souza',
            student_enrollment: 'MAT-2026-004',
            class_name: '9º Ano - Ensino Fundamental',
            competence: m,
            value: 1100.00,
            discount: 300.00, // Desconto Bolsa
            additional_charges: 0.00,
            final_value: 800.00,
            due_date: dueDate,
            payment_date: isPaid ? `2026-${String(monthNum).padStart(2, '0')}-03` : null,
            payment_method: isPaid ? 'pix' : null,
            notes: 'Bolsista de Incentivo Esportivo (30%)'
        });
    });

    return fees;
};

export default function Mensalidades() {
    // --- ESTADOS PRINCIPAIS ---
    const [classes, setClasses] = useState<ClassItem[]>(MOCK_CLASSES);
    const [students, setStudents] = useState<StudentItem[]>(MOCK_STUDENTS);
    const [responsibles, setResponsibles] = useState<StudentResponsible[]>(MOCK_RESPONSIBLES);
    const [fees, setFees] = useState<MonthlyFee[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [dbStatusMessage, setDbStatusMessage] = useState<{ type: 'info' | 'success' | 'warning', text: string } | null>(null);

    // --- FILTROS & SELEÇÕES ---
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

    // Filtros Avançados
    const [filterCompetence, setFilterCompetence] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterOnlyInadimplente, setFilterOnlyInadimplente] = useState<boolean>(false);
    const [filterOnlyVencidas, setFilterOnlyVencidas] = useState<boolean>(false);
    const [filterOnlyPagas, setFilterOnlyPagas] = useState<boolean>(false);

    const [dateRangeStart, setDateRangeStart] = useState<string>('');
    const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

    // Ordenação
    const [sortBy, setSortBy] = useState<string>('due_date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // UI States
    const [expandedFeeId, setExpandedFeeId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 8;

    // Modal para Simulação/Adição de Mensalidade
    const [isNewFeeModalOpen, setIsNewFeeModalOpen] = useState<boolean>(false);
    const [newFeeData, setNewFeeData] = useState<Partial<MonthlyFee>>({
        student_id: '',
        competence: '07/2026',
        value: 850,
        discount: 0,
        additional_charges: 0,
        due_date: '2026-07-10',
        payment_method: null,
        notes: ''
    });

    // Data Base do Sistema para cálculos (08 de Julho de 2026)
    const TODAY_STR = '2026-07-08';
    const TODAY = new Date(TODAY_STR);

    // --- DEBOUNCE SEARCH ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setCurrentPage(1);
        }, 350);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // --- INICIALIZAÇÃO E CARGA DOS DADOS DO SUPABASE/MOCK ---
    const fetchDatabaseData = useCallback(async () => {
        setIsLoading(true);
        let loadedClasses = MOCK_CLASSES;
        let loadedStudents = MOCK_STUDENTS;
        let loadedResponsibles = MOCK_RESPONSIBLES;
        let loadedFees: MonthlyFee[] = [];

        if (supabaseClient) {
            try {
                setDbStatusMessage({ type: 'info', text: 'Conectando ao banco de dados Supabase...' });

                // 1. Carregar classes
                const { data: classesData, error: classesErr } = await supabaseClient
                    .from('classes')
                    .select('*')
                    .order('name', { ascending: true });

                if (!classesErr && classesData && classesData.length > 0) {
                    loadedClasses = classesData;
                }

                // 2. Carregar estudantes
                const { data: studentsData, error: studentsErr } = await supabaseClient
                    .from('students')
                    .select('*')
                    .order('full_name', { ascending: true });

                if (!studentsErr && studentsData && studentsData.length > 0) {
                    loadedStudents = studentsData;
                }

                // 3. Carregar responsáveis
                const { data: respData, error: respErr } = await supabaseClient
                    .from('student_responsibles')
                    .select('*');

                if (!respErr && respData && respData.length > 0) {
                    loadedResponsibles = respData;
                }

                // 4. Carregar Mensalidades/Financeiro se houver tabela própria
                // Tenta detectar tabelas financeiras comuns como student_fees, monthly_payments ou invoices
                let financialDataLoaded = false;
                const tablesToTry = ['student_fees', 'monthly_payments', 'invoices', 'mensalidades'];

                for (const tableName of tablesToTry) {
                    const { data: fData, error: fErr } = await supabaseClient
                        .from(tableName)
                        .select('*');

                    if (!fErr && fData && fData.length > 0) {
                        loadedFees = fData.map((fee: any) => ({
                            id: fee.id || fee.uuid,
                            student_id: fee.student_id,
                            competence: fee.competence || fee.referencia || fee.mes_ano || '07/2026',
                            value: Number(fee.value || fee.valor || 0),
                            discount: Number(fee.discount || fee.desconto || 0),
                            additional_charges: Number(fee.additional_charges || fee.acrescimos || fee.multa_juros || 0),
                            final_value: Number(fee.final_value || fee.valor_final || fee.valor_pago || 0),
                            due_date: fee.due_date || fee.vencimento || fee.data_vencimento,
                            payment_date: fee.payment_date || fee.payment_at || fee.data_pagamento || null,
                            payment_method: fee.payment_method || fee.forma_pagamento || null,
                            notes: fee.notes || fee.observacao || ''
                        }));
                        financialDataLoaded = true;
                        setDbStatusMessage({ type: 'success', text: `Banco integrado com sucesso. Consumindo tabela '${tableName}'.` });
                        break;
                    }
                }

                if (!financialDataLoaded) {
                    // Se não houver tabela de mensalidades instalada, usamos o emulador rico de dados integrado
                    loadedFees = generateMockFees();
                    setDbStatusMessage({
                        type: 'warning',
                        text: 'Tabelas básicas integradas. Tabela de mensalidades não localizada, rodando emulador de apoio financeiro.'
                    });
                }

            } catch (err) {
                console.error("Erro ao obter dados do Supabase. Utilizando emulação offline robusta.", err);
                loadedFees = generateMockFees();
                setDbStatusMessage({
                    type: 'info',
                    text: 'Modo offline. Utilizando dados de emulação escolar local.'
                });
            }
        } else {
            loadedFees = generateMockFees();
            setDbStatusMessage({
                type: 'info',
                text: 'Painel Escola Ativo. Pronto para integração Supabase.'
            });
        }

        // Vincular metadados às mensalidades (Nome, Turma, Matrícula) para performance de visualização e busca
        const enrichedFees = loadedFees.map(fee => {
            const student = loadedStudents.find(s => s.id === fee.student_id);
            const classItem = student ? loadedClasses.find(c => c.id === student.class_id) : null;
            return {
                ...fee,
                student_name: student?.full_name || 'Aluno Não Localizado',
                student_enrollment: student?.enrollment_number || 'S/M',
                class_name: classItem?.name || 'Sem Turma'
            };
        });

        setClasses(loadedClasses);
        setStudents(loadedStudents);
        setResponsibles(loadedResponsibles);
        setFees(enrichedFees);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchDatabaseData();
    }, [fetchDatabaseData]);

    // --- RECONSTRUIR ENRIQUECIMENTO QUANDO ALUNOS/TURMAS MUDAM ---
    const enrichedFees = useMemo(() => {
        return fees.map(fee => {
            const student = students.find(s => s.id === fee.student_id);
            const classItem = student ? classes.find(c => c.id === student.class_id) : null;
            return {
                ...fee,
                student_name: student?.full_name || fee.student_name,
                student_enrollment: student?.enrollment_number || fee.student_enrollment,
                class_name: classItem?.name || fee.class_name
            };
        });
    }, [fees, students, classes]);

    // --- FUNÇÃO PARA CALCULAR STATUS DA MENSALIDADE ---
    const calculateFeeStatus = useCallback((fee: MonthlyFee): 'PAGA' | 'EM_ABERTO' | 'ATRASADA' | 'CANCELADA' => {
        if (fee.status_override) return fee.status_override;
        if (fee.payment_date) return 'PAGA';

        // Converte vencimento para comparar
        const dueDate = new Date(fee.due_date);

        // Desconsidera horas na comparação de datas
        const compareDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const compareToday = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

        if (compareDueDate < compareToday) {
            return 'ATRASADA';
        }
        return 'EM_ABERTO';
    }, []);

    // --- RESPONSÁVEL FINANCEIRO DE UM ALUNO ---
    const getFinancialResponsible = useCallback((studentId: string): StudentResponsible | undefined => {
        return responsibles.find(r => r.student_id === studentId && r.financial_responsible);
    }, [responsibles]);

    // --- FILTRAGEM MULTICRITÉRIO DOS DADOS ---
    const filteredFees = useMemo(() => {
        return enrichedFees.filter(fee => {
            // 1. Filtro por Turma
            if (selectedClassId !== 'all') {
                const student = students.find(s => s.id === fee.student_id);
                if (!student || student.class_id !== selectedClassId) return false;
            }

            // 2. Filtro por Aluno Específico
            if (selectedStudentId !== 'all' && fee.student_id !== selectedStudentId) {
                return false;
            }

            // 3. Filtro de Competência (Mês/Ano)
            if (filterCompetence !== 'all' && fee.competence !== filterCompetence) {
                return false;
            }

            // 4. Status da Mensalidade
            const computedStatus = calculateFeeStatus(fee);
            if (filterStatus !== 'all' && computedStatus !== filterStatus) {
                return false;
            }

            // 5. Filtro Exclusivo de Inadimplentes (Mais de 1 mensalidade atrasada no escopo geral)
            if (filterOnlyInadimplente) {
                // Encontra quantos atrasos este aluno possui no total geral
                const studentAtrasos = enrichedFees.filter(f => f.student_id === fee.student_id && calculateFeeStatus(f) === 'ATRASADA').length;
                if (studentAtrasos < 1) return false;
            }

            // 6. Filtros Booleanos Rápidos
            if (filterOnlyVencidas && computedStatus !== 'ATRASADA') return false;
            if (filterOnlyPagas && computedStatus !== 'PAGA') return false;

            // 7. Período de Vencimento
            if (dateRangeStart && fee.due_date < dateRangeStart) return false;
            if (dateRangeEnd && fee.due_date > dateRangeEnd) return false;

            // 8. Campo de busca geral unificado (Nome, Matrícula, CPF, Responsável)
            if (debouncedSearchQuery.trim() !== '') {
                const query = debouncedSearchQuery.toLowerCase();
                const student = students.find(s => s.id === fee.student_id);
                const resp = getFinancialResponsible(fee.student_id);

                const matchStudentName = student?.full_name.toLowerCase().includes(query) || false;
                const matchEnrollment = student?.enrollment_number.toLowerCase().includes(query) || false;
                const matchResponsibleName = resp?.name.toLowerCase().includes(query) || false;
                const matchCpf = resp?.cpf?.toLowerCase().replace(/\D/g, '').includes(query.replace(/\D/g, '')) || false;

                if (!matchStudentName && !matchEnrollment && !matchResponsibleName && !matchCpf) {
                    return false;
                }
            }

            return true;
        });
    }, [
        enrichedFees,
        selectedClassId,
        selectedStudentId,
        filterCompetence,
        filterStatus,
        filterOnlyInadimplente,
        filterOnlyVencidas,
        filterOnlyPagas,
        dateRangeStart,
        dateRangeEnd,
        debouncedSearchQuery,
        students,
        calculateFeeStatus,
        getFinancialResponsible
    ]);

    // --- ORDENAÇÃO DOS DADOS ---
    const sortedFees = useMemo(() => {
        return [...filteredFees].sort((a, b) => {
            let valA: any = a[sortBy as keyof MonthlyFee] || '';
            let valB: any = b[sortBy as keyof MonthlyFee] || '';

            // Tratamentos especiais para ordenação correta
            if (sortBy === 'student_name') {
                valA = a.student_name || '';
                valB = b.student_name || '';
            } else if (sortBy === 'student_enrollment') {
                valA = a.student_enrollment || '';
                valB = b.student_enrollment || '';
            } else if (sortBy === 'status') {
                valA = calculateFeeStatus(a);
                valB = calculateFeeStatus(b);
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredFees, sortBy, sortDirection, calculateFeeStatus]);

    // --- PAGINAÇÃO ---
    const paginatedFees = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedFees.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedFees, currentPage]);

    const totalPages = Math.ceil(sortedFees.length / itemsPerPage) || 1;

    // --- CALCULADORA DE METRICAS FINANCEIRAS GERAIS (Estatísticas do Topo) ---
    const dashboardStats = useMemo(() => {
        // Calculado com base em TODAS as mensalidades carregadas
        let totalAlunos = students.length;
        let totalMensalidades = enrichedFees.length;
        let pagas = 0;
        let abertas = 0;
        let atrasadas = 0;

        let valorRecebido = 0;
        let valorPendente = 0; // Aberto
        let valorVencido = 0; // Atrasado

        enrichedFees.forEach(fee => {
            const status = calculateFeeStatus(fee);
            const val = fee.final_value || (fee.value - fee.discount + fee.additional_charges);

            if (status === 'PAGA') {
                pagas++;
                valorRecebido += val;
            } else if (status === 'EM_ABERTO') {
                abertas++;
                valorPendente += val;
            } else if (status === 'ATRASADA') {
                atrasadas++;
                valorVencido += val;
            }
        });

        return {
            totalAlunos,
            totalMensalidades,
            pagas,
            abertas,
            atrasadas,
            valorRecebido,
            valorPendente,
            valorVencido
        };
    }, [enrichedFees, students, calculateFeeStatus]);

    // --- INFORMAÇÕES FINANCEIRAS DE UM ALUNO SELECIONADO (Resumo Lateral) ---
    const selectedStudentData = useMemo(() => {
        if (selectedStudentId === 'all') return null;
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return null;

        const classItem = classes.find(c => c.id === student.class_id);
        const responsible = getFinancialResponsible(student.id);

        // Mensalidades específicas desse aluno
        const studentFees = enrichedFees.filter(f => f.student_id === student.id);

        let pago = 0;
        let emAberto = 0;
        let atrasado = 0;

        studentFees.forEach(fee => {
            const status = calculateFeeStatus(fee);
            const val = fee.final_value || (fee.value - fee.discount + fee.additional_charges);

            if (status === 'PAGA') pago += val;
            else if (status === 'EM_ABERTO') emAberto += val;
            else if (status === 'ATRASADA') atrasado += val;
        });

        return {
            student,
            classItem,
            responsible,
            totalFees: studentFees.length,
            totalPaid: pago,
            totalOpen: emAberto,
            totalOverdue: atrasado
        };
    }, [selectedStudentId, students, classes, enrichedFees, calculateFeeStatus, getFinancialResponsible]);

    // --- FILTRAR ALUNOS DA TURMA SELECIONADA ---
    const availableStudentsForSelect = useMemo(() => {
        if (selectedClassId === 'all') return students;
        return students.filter(s => s.class_id === selectedClassId);
    }, [students, selectedClassId]);

    // Se mudar a turma, redefine o aluno selecionado se ele não fizer parte da turma
    useEffect(() => {
        if (selectedClassId !== 'all' && selectedStudentId !== 'all') {
            const student = students.find(s => s.id === selectedStudentId);
            if (student && student.class_id !== selectedClassId) {
                setSelectedStudentId('all');
            }
        }
    }, [selectedClassId, selectedStudentId, students]);

    // --- COMPETÊNCIAS ÚNICAS ---
    const availableCompetences = useMemo(() => {
        const comps = new Set<string>();
        enrichedFees.forEach(fee => comps.add(fee.competence));
        return Array.from(comps).sort((a, b) => {
            const [mesA, anoA] = a.split('/').map(Number);
            const [mesB, anoB] = b.split('/').map(Number);
            if (anoA !== anoB) return anoB - anoA;
            return mesB - mesA;
        });
    }, [enrichedFees]);

    // --- CADASTRO SIMULADO DE UMA NOVA MENSALIDADE ---
    const handleCreateFee = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFeeData.student_id) return;

        const student = students.find(s => s.id === newFeeData.student_id);
        const classItem = student ? classes.find(c => c.id === student.class_id) : null;

        const baseVal = Number(newFeeData.value || 0);
        const disc = Number(newFeeData.discount || 0);
        const add = Number(newFeeData.additional_charges || 0);
        const finalVal = baseVal - disc + add;

        const newFee: MonthlyFee = {
            id: `fee-manual-${Date.now()}`,
            student_id: newFeeData.student_id,
            student_name: student?.full_name,
            student_enrollment: student?.enrollment_number,
            class_name: classItem?.name,
            competence: newFeeData.competence || '07/2026',
            value: baseVal,
            discount: disc,
            additional_charges: add,
            final_value: finalVal,
            due_date: newFeeData.due_date || '2026-07-10',
            payment_date: newFeeData.payment_date || null,
            payment_method: newFeeData.payment_method || null,
            notes: newFeeData.notes || ''
        };

        setFees(prev => [newFee, ...prev]);
        setIsNewFeeModalOpen(false);
        // Reset form
        setNewFeeData({
            student_id: '',
            competence: '07/2026',
            value: 850,
            discount: 0,
            additional_charges: 0,
            due_date: '2026-07-10',
            payment_method: null,
            notes: ''
        });
    };

    // --- BAIXA MANUAL DE PAGAMENTO ---
    const handleMarkAsPaid = (feeId: string, method: 'pix' | 'boleto' | 'credit_card' | 'cash') => {
        setFees(prev => prev.map(f => {
            if (f.id === feeId) {
                return {
                    ...f,
                    payment_date: TODAY_STR,
                    payment_method: method
                };
            }
            return f;
        }));
    };

    // --- LIMPAR TODOS FILTROS ---
    const handleResetFilters = () => {
        setSelectedClassId('all');
        setSelectedStudentId('all');
        setSearchQuery('');
        setFilterCompetence('all');
        setFilterStatus('all');
        setFilterOnlyInadimplente(false);
        setFilterOnlyVencidas(false);
        setFilterOnlyPagas(false);
        setDateRangeStart('');
        setDateRangeEnd('');
    };

    // --- FUNÇÕES DE EXPORTAÇÃO E IMPRESSÃO ---
    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        // Em produção, isso integraria com jsPDF ou similar. Aqui montamos uma representação estruturada de download imediato em JSON/HTML.
        const fileContent = JSON.stringify(sortedFees, null, 2);
        const blob = new Blob([fileContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-mensalidades-${TODAY_STR}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleExportExcel = () => {
        // Exportação simplificada estruturando em CSV interpretável pelo Excel
        let csvContent = '\uFEFF'; // UTF-8 BOM
        csvContent += 'Matrícula;Aluno;Responsável;Competência;Valor Base;Desconto;Acréscimos;Valor Final;Vencimento;Pagamento;Situação\n';

        sortedFees.forEach(fee => {
            const resp = getFinancialResponsible(fee.student_id)?.name || 'Nenhum';
            const status = calculateFeeStatus(fee);
            csvContent += `${fee.student_enrollment};${fee.student_name};${resp};${fee.competence};${fee.value};${fee.discount};${fee.additional_charges};${fee.final_value};${fee.due_date};${fee.payment_date || 'Aberto'};${status}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planilha-mensalidades-${TODAY_STR}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="bg-slate-50 min-h-screen text-slate-800 antialiased font-sans p-3 md:p-6 print:bg-white print:p-0">

            {/* CABEÇALHO DO SISTEMA / NOTIFICAÇÃO DB */}
            <div className="max-w-7xl mx-auto mb-6 print:hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Layers size={20} />
                            </span>
                            <div>
                                <h1 className="text-lg font-semibold text-slate-900 leading-tight">Gestão de Mensalidades</h1>
                                <p className="text-xs text-slate-500">Controle financeiro integrado de alunos e responsáveis</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {dbStatusMessage && (
                            <span className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border font-medium ${dbStatusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                dbStatusMessage.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-slate-50 text-slate-700 border-slate-200'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${dbStatusMessage.type === 'success' ? 'bg-emerald-500' :
                                    dbStatusMessage.type === 'warning' ? 'bg-amber-500' :
                                        'bg-blue-500 animate-pulse'
                                    }`}></span>
                                {dbStatusMessage.text}
                            </span>
                        )}

                        <button
                            onClick={() => setIsNewFeeModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                            <Plus size={14} />
                            Nova Mensalidade
                        </button>

                        <button
                            onClick={fetchDatabaseData}
                            title="Recarregar dados"
                            className="p-2 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg transition-colors"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ÁREA PRINCIPAL */}
            <main className="max-w-7xl mx-auto space-y-6">

                {/* ==========================================
            DASHBOARD SUPERIOR (CARDS ESTATÍSTICOS)
            ========================================== */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">

                    {/* Card 1: Total Alunos */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block">Total Alunos</span>
                        <div className="flex items-end justify-between mt-1">
                            <span className="text-lg font-semibold text-slate-800">{dashboardStats.totalAlunos}</span>
                            <span className="p-1 bg-slate-50 text-slate-600 rounded">
                                <Users size={14} />
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Total Lançado */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block">Lançamentos</span>
                        <div className="flex items-end justify-between mt-1">
                            <span className="text-lg font-semibold text-slate-800">{dashboardStats.totalMensalidades}</span>
                            <span className="p-1 bg-slate-50 text-slate-600 rounded">
                                <BookOpen size={14} />
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Pagas */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
                        <span className="text-[10px] text-emerald-600 font-medium tracking-wider uppercase block">Pagas</span>
                        <div className="flex items-end justify-between mt-1">
                            <span className="text-lg font-semibold text-emerald-700">{dashboardStats.pagas}</span>
                            <span className="p-1 bg-emerald-50 text-emerald-600 rounded">
                                <CheckCircle size={14} />
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Em Aberto */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-blue-500">
                        <span className="text-[10px] text-blue-600 font-medium tracking-wider uppercase block">Em Aberto</span>
                        <div className="flex items-end justify-between mt-1">
                            <span className="text-lg font-semibold text-blue-700">{dashboardStats.abertas}</span>
                            <span className="p-1 bg-blue-50 text-blue-600 rounded">
                                <Clock size={14} />
                            </span>
                        </div>
                    </div>

                    {/* Card 5: Atrasadas */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-rose-500">
                        <span className="text-[10px] text-rose-600 font-medium tracking-wider uppercase block">Atrasadas</span>
                        <div className="flex items-end justify-between mt-1">
                            <span className="text-lg font-semibold text-rose-700">{dashboardStats.atrasadas}</span>
                            <span className="p-1 bg-rose-50 text-rose-600 rounded">
                                <AlertTriangle size={14} />
                            </span>
                        </div>
                    </div>

                    {/* Card 6: Valor Recebido */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block">Recebido</span>
                        <div className="flex flex-col mt-1">
                            <span className="text-xs text-slate-400 font-medium">R$</span>
                            <span className="text-base font-semibold text-emerald-600">
                                {dashboardStats.valorRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Card 7: Valor Pendente */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block">A Receber</span>
                        <div className="flex flex-col mt-1">
                            <span className="text-xs text-slate-400 font-medium">R$</span>
                            <span className="text-base font-semibold text-blue-600">
                                {dashboardStats.valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Card 8: Valor Vencido */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block">Vencido</span>
                        <div className="flex flex-col mt-1">
                            <span className="text-xs text-slate-400 font-medium">R$</span>
                            <span className="text-base font-semibold text-rose-600">
                                {dashboardStats.valorVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                </div>

                {/* SEÇÃO PRINCIPAL DE TRABALHO: FILTROS + TABELA + RESPONSÁVEL */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* PAINEL DE CONTROLES & FILTROS (1/4 da tela) */}
                    <div className="lg:col-span-1 space-y-4 print:hidden">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col items-start mb-4 pb-2 border-b border-slate-100">
                                <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                    <Filter size={16} />
                                    Filtros de Busca
                                </span>
                                <button
                                    onClick={handleResetFilters}
                                    className="text-[11px] text-blue-600 hover:underline font-medium"
                                >
                                    Limpar todos
                                </button>
                            </div>

                            <div className="space-y-3.5">
                                {/* 1. Busca Geral */}
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1">Busca Instantânea</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Nome, matrícula, CPF..."
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                                    </div>
                                </div>

                                {/* 2. Filtro por Turma */}
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1">Filtrar por Turma</label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="all">Todas as turmas</option>
                                        {classes.map(cls => (
                                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. Filtrar por Aluno */}
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1">Aluno Específico</label>
                                    <select
                                        value={selectedStudentId}
                                        onChange={(e) => setSelectedStudentId(e.target.value)}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="all">Todos os alunos</option>
                                        {availableStudentsForSelect.map(std => (
                                            <option key={std.id} value={std.id}>{std.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 4. Filtro por Competência */}
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1">Competência (Mês/Ano)</label>
                                    <select
                                        value={filterCompetence}
                                        onChange={(e) => setFilterCompetence(e.target.value)}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="all">Todas</option>
                                        {availableCompetences.map(comp => (
                                            <option key={comp} value={comp}>{comp}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 5. Situação Financeira */}
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1">Situação da Parcela</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="all">Todos os status</option>
                                        <option value="PAGA">Paga</option>
                                        <option value="EM_ABERTO">Em Aberto</option>
                                        <option value="ATRASADA">Atrasada</option>
                                    </select>
                                </div>

                                {/* 6. Período de Vencimento */}
                                <div className="pt-2 border-t border-slate-100">
                                    <span className="text-xs text-slate-400 font-semibold block mb-1.5">Vencimento entre:</span>
                                    <div className="grid grid-cols-1 gap-2">
                                        <input
                                            type="date"
                                            value={dateRangeStart}
                                            onChange={(e) => setDateRangeStart(e.target.value)}
                                            className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                                        />
                                        <input
                                            type="date"
                                            value={dateRangeEnd}
                                            onChange={(e) => setDateRangeEnd(e.target.value)}
                                            className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* 7. Filtros de Ativação Rápida */}
                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filterOnlyInadimplente}
                                            onChange={(e) => setFilterOnlyInadimplente(e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-slate-600 font-medium select-none">Inadimplentes (≥ 1 atrasada)</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filterOnlyVencidas}
                                            onChange={(e) => setFilterOnlyVencidas(e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-slate-600 font-medium select-none">Mostrar apenas em atraso</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filterOnlyPagas}
                                            onChange={(e) => setFilterOnlyPagas(e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-slate-600 font-medium select-none">Mostrar apenas pagas</span>
                                    </label>
                                </div>

                            </div>
                        </div>

                        {/* CARD AJUDANTE - FAQ RÁPIDO DO SISTEMA FINANCEIRO */}
                        <div className="bg-gradient-to-br from-slate-850 to-slate-900 bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm">
                            <span className="text-[11px] text-blue-400 font-semibold uppercase block tracking-wider mb-2">Respostas Rápidas</span>
                            <div className="space-y-2.5 text-xs text-slate-300">
                                <div>
                                    <p className="font-semibold text-slate-100">"O aluno João está inadimplente?"</p>
                                    <p className="text-[11px] text-slate-400">Filtre por Aluno "João Pedro" ou digite no campo de busca para checar atrasos na lista.</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-100">"Mensalidades vencendo hoje (08/07/2026)?"</p>
                                    <p className="text-[11px] text-slate-400">Defina o período de vencimento inicial e final de hoje para rastrear pendências exatas.</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-100">"Quanto falta receber neste mês?"</p>
                                    <p className="text-[11px] text-slate-400">Verifique o card de "A Receber" que reflete as parcelas em aberto calculadas automaticamente.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TABELA PRINCIPAL E VISUALIZAÇÃO (3/4 da tela se não houver aluno selecionado) */}
                    <div className={`lg:col-span-3 space-y-4`}>

                        {/* BARRA DE AÇÕES & EXPORTAÇÕES */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">
                                    Exibindo <strong className="font-semibold">{sortedFees.length}</strong> mensalidades encontradas
                                </span>
                                {selectedClassId !== 'all' && (
                                    <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded font-medium">
                                        Classe: {classes.find(c => c.id === selectedClassId)?.name}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                    <Printer size={13} />
                                    Imprimir Relatório
                                </button>

                                <button
                                    onClick={handleExportPDF}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                    <FileText size={13} />
                                    Exportar PDF (JSON)
                                </button>

                                <button
                                    onClick={handleExportExcel}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                    <FileSpreadsheet size={13} />
                                    Exportar Planilha (CSV)
                                </button>
                            </div>
                        </div>

                        {/* TABELA DE MENSALIDADES */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {isLoading ? (
                                <div className="p-12 text-center text-slate-500">
                                    <RefreshCw className="animate-spin mx-auto mb-3 text-blue-600" size={28} />
                                    <p className="text-sm font-semibold">Carregando dados financeiros...</p>
                                </div>
                            ) : sortedFees.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">
                                    <AlertTriangle className="mx-auto mb-3 text-slate-300" size={32} />
                                    <p className="text-sm font-semibold">Nenhuma mensalidade encontrada</p>
                                    <p className="text-xs text-slate-400 mt-1">Experimente alterar os filtros aplicados ao painel esquerdo.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase font-semibold tracking-wider">
                                                <th className="py-3 px-4">Aluno / Matrícula</th>
                                                <th className="py-3 px-4">Responsável Financeiro</th>
                                                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none" onClick={() => { setSortBy('competence'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                                    Competência {sortBy === 'competence' && (sortDirection === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none" onClick={() => { setSortBy('value'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                                    Valor Final {sortBy === 'value' && (sortDirection === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none" onClick={() => { setSortBy('due_date'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                                    Vencimento {sortBy === 'due_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th className="py-3 px-4">Pagamento</th>
                                                <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 select-none" onClick={() => { setSortBy('status'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                                    Situação {sortBy === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th className="py-3 px-4 text-right print:hidden">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {paginatedFees.map(fee => {
                                                const isExpanded = expandedFeeId === fee.id;
                                                const status = calculateFeeStatus(fee);
                                                const responsible = getFinancialResponsible(fee.student_id);
                                                const student = students.find(s => s.id === fee.student_id);

                                                return (
                                                    <React.Fragment key={fee.id}>
                                                        <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                                                            {/* Aluno */}
                                                            <td className="py-3 px-4">
                                                                <div className="font-semibold text-slate-800">{fee.student_name}</div>
                                                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                    <span>{fee.student_enrollment}</span>
                                                                    <span className="inline-block w-1.1 h-1.1 bg-slate-300 rounded-full"></span>
                                                                    <span className="text-slate-500 font-medium">{fee.class_name}</span>
                                                                </div>
                                                            </td>

                                                            {/* Responsável Financeiro */}
                                                            <td className="py-3 px-4">
                                                                {responsible ? (
                                                                    <div>
                                                                        <span className="font-medium text-slate-700">{responsible.name}</span>
                                                                        <div className="text-[10px] text-slate-400">{responsible.relationship}</div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-150">
                                                                        Sem financeiro cadastrado
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Competência */}
                                                            <td className="py-3 px-4 font-semibold text-slate-600">
                                                                {fee.competence}
                                                            </td>

                                                            {/* Valor Final */}
                                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                                R$ {fee.final_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                {(fee.discount > 0 || fee.additional_charges > 0) && (
                                                                    <div className="text-[10px] text-slate-400 font-normal">
                                                                        Base: R$ {fee.value.toLocaleString('pt-BR')}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Vencimento */}
                                                            <td className="py-3 px-4">
                                                                <span className={status === 'ATRASADA' ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                                                                    {new Date(fee.due_date).toLocaleDateString('pt-BR')}
                                                                </span>
                                                            </td>

                                                            {/* Data Pagamento */}
                                                            <td className="py-3 px-4">
                                                                {fee.payment_date ? (
                                                                    <div>
                                                                        <span className="text-emerald-600 font-semibold">
                                                                            {new Date(fee.payment_date).toLocaleDateString('pt-BR')}
                                                                        </span>
                                                                        {fee.payment_method && (
                                                                            <div className="text-[10px] text-slate-400 uppercase">{fee.payment_method}</div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-400 font-medium">Aberto</span>
                                                                )}
                                                            </td>

                                                            {/* Situação (Badge) */}
                                                            <td className="py-3 px-4 text-center">
                                                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${status === 'PAGA' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                                    status === 'EM_ABERTO' ? 'bg-blue-100 text-blue-850 border border-blue-200' :
                                                                        status === 'ATRASADA' ? 'bg-rose-100 text-rose-800 border border-rose-250' :
                                                                            'bg-slate-100 text-slate-600 border border-slate-200'
                                                                    }`}>
                                                                    {status}
                                                                </span>
                                                            </td>

                                                            {/* Ações */}
                                                            <td className="py-3 px-4 text-right print:hidden">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    {/* Expandir */}
                                                                    <button
                                                                        onClick={() => setExpandedFeeId(isExpanded ? null : fee.id)}
                                                                        className="p-1 hover:bg-slate-100 text-slate-500 rounded"
                                                                        title="Exibir mais detalhes"
                                                                    >
                                                                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                                    </button>

                                                                    {/* Selecionar Aluno no Painel Lateral */}
                                                                    <button
                                                                        onClick={() => setSelectedStudentId(fee.student_id)}
                                                                        className="p-1 hover:bg-slate-100 text-blue-600 rounded"
                                                                        title="Ver Ficha Completa do Responsável"
                                                                    >
                                                                        <Maximize2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {/* DETALHES EXPANSÍVEIS DA LINHA */}
                                                        {isExpanded && (
                                                            <tr className="bg-slate-50/50">
                                                                <td colSpan={8} className="p-4 border-l-4 border-l-blue-500">
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">

                                                                        {/* 1. Detalhes Aluno / Vencimento */}
                                                                        <div>
                                                                            <h4 className="font-semibold text-slate-800 text-xs border-b border-slate-200 pb-1.5 mb-2 uppercase tracking-wide">
                                                                                Detalhamento da Parcela
                                                                            </h4>
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex justify-between">
                                                                                    <span>Valor Base da Escola:</span>
                                                                                    <span className="font-semibold text-slate-800">R$ {fee.value.toFixed(2)}</span>
                                                                                </div>
                                                                                <div className="flex justify-between text-emerald-600">
                                                                                    <span>Descontos de Contrato:</span>
                                                                                    <span>- R$ {fee.discount.toFixed(2)}</span>
                                                                                </div>
                                                                                <div className="flex justify-between text-amber-600">
                                                                                    <span>Juros / Multa de Atraso:</span>
                                                                                    <span>+ R$ {fee.additional_charges.toFixed(2)}</span>
                                                                                </div>
                                                                                <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-1.5">
                                                                                    <span>Valor Líquido Esperado:</span>
                                                                                    <span>R$ {fee.final_value.toFixed(2)}</span>
                                                                                </div>
                                                                                {fee.notes && (
                                                                                    <div className="bg-amber-50 text-amber-800 p-2 rounded border border-amber-150 mt-2 text-[11px]">
                                                                                        <strong>Obs:</strong> {fee.notes}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* 2. Responsável Financeiro Direto */}
                                                                        <div>
                                                                            <h4 className="font-semibold text-slate-800 text-xs border-b border-slate-200 pb-1.5 mb-2 uppercase tracking-wide">
                                                                                Responsável pela Cobrança
                                                                            </h4>
                                                                            {responsible ? (
                                                                                <div className="space-y-2">
                                                                                    <div>
                                                                                        <span className="font-semibold text-slate-800 block text-xs">{responsible.name}</span>
                                                                                        <span className="text-slate-400 text-[10px]">{responsible.relationship} do Aluno</span>
                                                                                    </div>

                                                                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                                                                        <div>
                                                                                            <span className="text-slate-400 text-[10px] block">CPF</span>
                                                                                            <span className="font-semibold text-slate-700">{responsible.cpf || 'Não cadastrado'}</span>
                                                                                        </div>
                                                                                        <div>
                                                                                            <span className="text-slate-400 text-[10px] block">E-mail</span>
                                                                                            <span className="font-semibold text-slate-700 truncate block" title={responsible.email || ''}>
                                                                                                {responsible.email || 'Não possui'}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex gap-2 pt-1">
                                                                                        {responsible.whatsapp && (
                                                                                            <a
                                                                                                href={`https://wa.me/${responsible.whatsapp.replace(/\D/g, '')}`}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-semibold px-2 py-1 rounded border border-emerald-200 flex items-center gap-1"
                                                                                            >
                                                                                                <Phone size={10} />
                                                                                                WhatsApp
                                                                                            </a>
                                                                                        )}
                                                                                        {responsible.phone && (
                                                                                            <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded text-[10px] font-medium">
                                                                                                Telefone: {responsible.phone}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-slate-400 italic">Nenhum responsável financeiro vinculado para emitir cobrança.</div>
                                                                            )}
                                                                        </div>

                                                                        {/* 3. Ações de Cobrança / Baixa */}
                                                                        <div className="flex flex-col justify-between">
                                                                            <div>
                                                                                <h4 className="font-semibold text-slate-800 text-xs border-b border-slate-200 pb-1.5 mb-2 uppercase tracking-wide">
                                                                                    Controles Financeiros
                                                                                </h4>
                                                                                <p className="text-[11px] text-slate-400 mb-3">
                                                                                    Modifique o estado desta parcela ou execute rotina de compensação rápida de pagamento.
                                                                                </p>
                                                                            </div>

                                                                            {status !== 'PAGA' ? (
                                                                                <div className="space-y-2">
                                                                                    <span className="text-[10px] font-semibold text-slate-500 block">Dar Baixa com:</span>
                                                                                    <div className="grid grid-cols-2 gap-1.5">
                                                                                        <button
                                                                                            onClick={() => handleMarkAsPaid(fee.id, 'pix')}
                                                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] py-1.5 rounded font-semibold text-center transition-colors"
                                                                                        >
                                                                                            PIX
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleMarkAsPaid(fee.id, 'boleto')}
                                                                                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-1.5 rounded font-semibold text-center transition-colors"
                                                                                        >
                                                                                            Boleto
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleMarkAsPaid(fee.id, 'credit_card')}
                                                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] py-1.5 rounded font-semibold text-center transition-colors"
                                                                                        >
                                                                                            Cartão
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleMarkAsPaid(fee.id, 'cash')}
                                                                                            className="bg-slate-700 hover:bg-slate-800 text-white text-[10px] py-1.5 rounded font-semibold text-center transition-colors"
                                                                                        >
                                                                                            Dinheiro
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded border border-emerald-150 flex items-center gap-2">
                                                                                    <CheckCircle className="text-emerald-500" size={16} />
                                                                                    <div>
                                                                                        <p className="font-semibold text-[11px]">Compensação Concluída</p>
                                                                                        <p className="text-[10px] text-emerald-600">Recebido por {fee.payment_method?.toUpperCase()}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* PAGINAÇÃO */}
                            {!isLoading && sortedFees.length > 0 && (
                                <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-4 print:hidden">
                                    <span className="text-xs text-slate-500">
                                        Página <strong className="font-semibold">{currentPage}</strong> de <strong className="font-semibold">{totalPages}</strong>
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            className="bg-white border border-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            className="bg-white border border-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Próxima
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SEÇÃO COMPARTILHADA: RESUMO DE SELEÇÃO LATERAL (Aparece inline quando aluno é selecionado) */}
                        {selectedStudentData && (
                            <div className="bg-white p-4 rounded-xl border border-slate-250 shadow-sm animate-fade-in relative">

                                {/* Fechar seleção */}
                                <button
                                    onClick={() => setSelectedStudentId('all')}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                    title="Fechar resumo do responsável"
                                >
                                    <X size={16} />
                                </button>

                                <h3 className="text-xs font-semibold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-1 text-blue-600">
                                    <User size={13} />
                                    Ficha do Responsável & Aluno Selecionado
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                                    {/* Bloco 1: Foto e Aluno */}
                                    <div className="flex items-start gap-3 border-r border-slate-100 pr-4">
                                        <img
                                            src={selectedStudentData.student.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                                            alt="Foto Aluno"
                                            className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-slate-50"
                                        />
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm">{selectedStudentData.student.full_name}</h4>
                                            <p className="text-[10px] text-slate-400">Matrícula: {selectedStudentData.student.enrollment_number}</p>
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] rounded font-semibold">
                                                {selectedStudentData.classItem?.name || 'Sem turma vinculada'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bloco 2: Contatos Responsável */}
                                    <div className="md:col-span-2 border-r border-slate-100 pr-4">
                                        <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider mb-1.5">
                                            Responsável Financeiro Principal
                                        </span>
                                        {selectedStudentData.responsible ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                                                <div className="text-xs">
                                                    <span className="text-slate-400 block text-[9px]">Nome Completo</span>
                                                    <span className="font-semibold text-slate-800">{selectedStudentData.responsible.name}</span>
                                                </div>
                                                <div className="text-xs">
                                                    <span className="text-slate-400 block text-[9px]">Telefone</span>
                                                    <span className="font-semibold text-slate-850">{selectedStudentData.responsible.phone || 'S/T'}</span>
                                                </div>
                                                <div className="text-xs">
                                                    <span className="text-slate-400 block text-[9px]">E-mail</span>
                                                    <span className="font-semibold text-slate-850 truncate block" title={selectedStudentData.responsible.email || ''}>
                                                        {selectedStudentData.responsible.email || 'Não informado'}
                                                    </span>
                                                </div>
                                                <div className="text-xs">
                                                    <span className="text-slate-400 block text-[9px]">CPF</span>
                                                    <span className="font-semibold text-slate-800">{selectedStudentData.responsible.cpf || 'Não informado'}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-amber-600 bg-amber-50 p-2.5 rounded border border-amber-150 text-xs font-semibold flex items-center gap-1.5">
                                                <AlertTriangle size={14} />
                                                Sem responsável financeiro ativo! O aluno está sem e-mail de faturamento.
                                            </div>
                                        )}
                                    </div>

                                    {/* Bloco 3: Resumo Financeiro Consolidação */}
                                    <div className="space-y-2">
                                        <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">
                                            Resumo da Ficha
                                        </span>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-slate-50 p-1.5 rounded">
                                                <span className="text-[9px] text-slate-400 block">Total Pago</span>
                                                <span className="font-semibold text-emerald-600">R$ {selectedStudentData.totalPaid.toFixed(2)}</span>
                                            </div>
                                            <div className="bg-slate-50 p-1.5 rounded">
                                                <span className="text-[9px] text-slate-400 block">Em Aberto</span>
                                                <span className="font-semibold text-blue-600">R$ {selectedStudentData.totalOpen.toFixed(2)}</span>
                                            </div>
                                            <div className="bg-slate-50 p-1.5 rounded col-span-2 border-l-2 border-l-rose-500">
                                                <span className="text-[9px] text-slate-400 block">Total em Atraso</span>
                                                <span className="font-semibold text-rose-600">R$ {selectedStudentData.totalOverdue.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                    </div>

                </div>

            </main>

            {/* ==========================================
          MODAL DE CADASTRO DE MENSALIDADE
          ========================================== */}
            {isNewFeeModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-sm">Cadastrar Mensalidade</h3>
                                <p className="text-[10px] text-slate-300">Nova cobrança escolar no sistema financeiro</p>
                            </div>
                            <button
                                onClick={() => setIsNewFeeModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFee} className="p-4 space-y-3">
                            {/* Aluno Beneficiário */}
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">Selecionar Aluno Beneficiário *</label>
                                <select
                                    required
                                    value={newFeeData.student_id}
                                    onChange={(e) => setNewFeeData(prev => ({ ...prev, student_id: e.target.value }))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">-- Escolha um Aluno --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} ({s.enrollment_number})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Competência */}
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1">Competência *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: 07/2026"
                                        value={newFeeData.competence}
                                        onChange={(e) => setNewFeeData(prev => ({ ...prev, competence: e.target.value }))}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2"
                                    />
                                </div>

                                {/* Vencimento */}
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold block mb-1">Data de Vencimento *</label>
                                    <input
                                        type="date"
                                        required
                                        value={newFeeData.due_date}
                                        onChange={(e) => setNewFeeData(prev => ({ ...prev, due_date: e.target.value }))}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {/* Valor Base */}
                                <div>
                                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">Valor Base (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newFeeData.value}
                                        onChange={(e) => setNewFeeData(prev => ({ ...prev, value: Number(e.target.value) }))}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                                    />
                                </div>

                                {/* Desconto */}
                                <div>
                                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">Desconto (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newFeeData.discount}
                                        onChange={(e) => setNewFeeData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-emerald-600"
                                    />
                                </div>

                                {/* Acréscimos */}
                                <div>
                                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">Acréscimo (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newFeeData.additional_charges}
                                        onChange={(e) => setNewFeeData(prev => ({ ...prev, additional_charges: Number(e.target.value) }))}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-rose-600"
                                    />
                                </div>
                            </div>

                            {/* Notas adicionais */}
                            <div>
                                <label className="text-xs text-slate-500 font-semibold block mb-1">Observações da Cobrança</label>
                                <textarea
                                    rows={2}
                                    placeholder="Ex: Valor referente a desconto para irmão mais novo ou bolsa..."
                                    value={newFeeData.notes}
                                    onChange={(e) => setNewFeeData(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsNewFeeModalOpen(false)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                                >
                                    Registrar Cobrança
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==========================================
          VISTA EXCLUSIVA DE IMPRESSÃO (A4 OTIMIZADA)
          ========================================== */}
            <div className="hidden print:block w-full text-slate-900 bg-white">
                <div className="text-center pb-6 border-b border-slate-300">
                    <h1 className="text-xl font-bold">RELATÓRIO DE MENSALIDADES ESCOLARES</h1>
                    <p className="text-xs text-slate-500 mt-1">Data de Emissão: {new Date().toLocaleDateString('pt-BR')} - Data Base Baseada em Simulação (08/07/2026)</p>
                </div>

                <div className="grid grid-cols-4 gap-4 my-6 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                    <div>
                        <span className="text-slate-400 block text-[10px]">TOTAL LANÇADO</span>
                        <span className="font-bold text-slate-800">R$ {(dashboardStats.valorRecebido + dashboardStats.valorPendente + dashboardStats.valorVencido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[10px]">VALOR RECEBIDO</span>
                        <span className="font-bold text-emerald-600">R$ {dashboardStats.valorRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[10px]">VALOR PENDENTE</span>
                        <span className="font-bold text-blue-600">R$ {dashboardStats.valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[10px]">VALOR VENCIDO (ATRASO)</span>
                        <span className="font-bold text-rose-600">R$ {dashboardStats.valorVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <table className="w-full text-left border-collapse text-[11px] border border-slate-200 mt-4">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                            <th className="p-2 border border-slate-200">Aluno</th>
                            <th className="p-2 border border-slate-200">Turma</th>
                            <th className="p-2 border border-slate-200">Responsável Financeiro</th>
                            <th className="p-2 border border-slate-200">Competência</th>
                            <th className="p-2 border border-slate-200">Valor Final</th>
                            <th className="p-2 border border-slate-200">Vencimento</th>
                            <th className="p-2 border border-slate-200">Situação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedFees.map(fee => {
                            const status = calculateFeeStatus(fee);
                            const resp = getFinancialResponsible(fee.student_id);
                            return (
                                <tr key={fee.id} className="border-b border-slate-200">
                                    <td className="p-2 border border-slate-200">{fee.student_name} ({fee.student_enrollment})</td>
                                    <td className="p-2 border border-slate-200">{fee.class_name}</td>
                                    <td className="p-2 border border-slate-200">{resp?.name || 'Não cadastrado'}</td>
                                    <td className="p-2 border border-slate-200 font-semibold">{fee.competence}</td>
                                    <td className="p-2 border border-slate-200">R$ {fee.final_value.toFixed(2)}</td>
                                    <td className="p-2 border border-slate-200">{new Date(fee.due_date).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-2 border border-slate-200 font-semibold">{status}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

        </div>
    );
}