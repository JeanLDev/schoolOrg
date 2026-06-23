import { ChevronLeft } from "lucide-react";

export default function ModalForm ({
    editingTeacher,
    setEditingTeacher,
    setIsModalOpen,
    activeFormTab,
    setActiveFormTab,
    handleSaveTeacher,
    handleSimulatedUpload,
    draftEducation,
    setDraftEducation,
    draftCertification,
    setDraftCertification,
    draftSchedule,
    setDraftSchedule,
    draftDocument,
    setDraftDocument,
    draftEvaluation,
    setDraftEvaluation,
    classes,
    subjects,
    showToast,}) {
    return (
        <div className=" backdrop-blur-sm flex items-center justify-center  overflow-y-auto">
          <div className="min-h-[90vh] justify-between w-full max-w-5xl flex flex-col ">
            
            {/* Modal Header */}
            <div className=" border-b border-slate-100 flex justify-between items-center rounded-t-xl">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingTeacher.full_name ? `${editingTeacher.full_name}` : 'Registar Novo Professor'}
                </h2>
                <p className="text-xs text-slate-500">Preencha todos os dados curriculares, turmas, horários e documentos pedagógicos.</p>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setEditingTeacher(null); }}
                className="text-slate-600 text-md p-1 rounded-xl bg-white shadow-md border border-slate-300 flex items-center "
              >
                <ChevronLeft size={18}/>
                <span>Voltar</span>
              </button>
            </div>

            {/* Modal Tabs Controller */}
            <div className="bg-white border-b mt-4 border-slate-200 flex flex-wrap gap-1 px-4 py-2">
              {[
                { id: 'pessoais', label: 'Dados Pessoais' },
                { id: 'profissionais', label: 'Dados Profissionais' },
                { id: 'formacao', label: 'Formação Académica' },
                { id: 'certificacoes', label: 'Certificações' },
                { id: 'disciplinas', label: 'Disciplinas' },
                { id: 'turmas', label: 'Turmas' },
                { id: 'horarios', label: 'Horários' },
                { id: 'documentos', label: 'Documentos' },
                { id: 'avaliacoes', label: 'Avaliações' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFormTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                    activeFormTab === tab.id 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveTeacher} className="flex-1 justify-between h-full overflow-y-auto p-6 flex flex-col gap-6">
              
              {/* ABA 1: DADOS PESSOAIS */}
              {activeFormTab === 'pessoais' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                  
                  {/* Foto do Professor */}
                  <div className="md:col-span-1 flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                    <span className="text-xs font-semibold text-slate-500">Foto do Professor</span>
                    <div className="w-32 h-32 rounded-xl bg-slate-200 border overflow-hidden flex items-center justify-center relative">
                      {editingTeacher.photo_url ? (
                        <img src={editingTeacher.photo_url} alt="Pre-view" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <label className="cursor-pointer text-xs font-semibold bg-white hover:bg-slate-100 text-blue-600 border px-3 py-1.5 rounded-xl transition-all shadow-sm">
                      Carregar Foto
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleSimulatedUpload('photo', e)} 
                      />
                    </label>
                  </div>

                  {/* Demais campos de identificação */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">Nome Completo *</label>
                      <input
                        type="text"
                        value={editingTeacher.full_name}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, full_name: e.target.value })}
                        placeholder="Nome completo do docente"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">Matrícula (Código Único)</label>
                      <input
                        type="text"
                        value={editingTeacher.registration_number}
                        disabled
                        className="w-full text-sm border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">CPF *</label>
                      <input
                        type="text"
                        value={editingTeacher.cpf}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">RG</label>
                      <input
                        type="text"
                        value={editingTeacher.rg}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, rg: e.target.value })}
                        placeholder="00.000.000-0"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">Data de Nascimento</label>
                      <input
                        type="date"
                        value={editingTeacher.birth_date}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, birth_date: e.target.value })}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">Estado Civil</label>
                      <select
                        value={editingTeacher.marital_status}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, marital_status: e.target.value as any })}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      >
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                        <option value="União Estável">União Estável</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">Gênero</label>
                      <select
                        value={editingTeacher.gender}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, gender: e.target.value as any })}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                        <option value="Prefiro não responder">Prefiro não responder</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">Telefone Celular</label>
                      <input
                        type="text"
                        value={editingTeacher.phone}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-500">Endereço Residencial</label>
                      <input
                        type="text"
                        value={editingTeacher.address}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, address: e.target.value })}
                        placeholder="Rua, número, complemento"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">Cidade</label>
                      <input
                        type="text"
                        value={editingTeacher.city}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, city: e.target.value })}
                        placeholder="Ex: São Paulo"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">CEP</label>
                      <input
                        type="text"
                        value={editingTeacher.zip_code}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, zip_code: e.target.value })}
                        placeholder="00000-000"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* ABA 2: DADOS PROFISSIONAIS */}
              {activeFormTab === 'profissionais' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">E-mail Institucional *</label>
                    <input
                      type="email"
                      value={editingTeacher.email}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                      placeholder="usuario@escola-modelo.edu"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Data de Admissão</label>
                    <input
                      type="date"
                      value={editingTeacher.hire_date}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, hire_date: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Regime de Contratação</label>
                    <select
                      value={editingTeacher.employment_type}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, employment_type: e.target.value as any })}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                    >
                      <option value="CLT">CLT (Consolidação das Leis do Trabalho)</option>
                      <option value="PJ">PJ (Prestador de Serviços - CNPJ)</option>
                      <option value="Temporário">Temporário</option>
                      <option value="Estágio">Estágio</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Carga Horária Semanal (Horas)</label>
                    <input
                      type="number"
                      value={editingTeacher.workload_hours}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, workload_hours: Number(e.target.value) })}
                      placeholder="Ex: 40"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Salário / Remuneração Mensal (R$)</label>
                    <input
                      type="number"
                      value={editingTeacher.salary}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, salary: Number(e.target.value) })}
                      placeholder="Ex: 5000"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Status Ocupacional</label>
                    <select
                      value={editingTeacher.status}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, status: e.target.value as any })}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Afastado">Afastado</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-500">Observações Pedagógicas / Internas</label>
                    <textarea
                      value={editingTeacher.observations}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, observations: e.target.value })}
                      placeholder="Histórico pedagógico relevante, necessidades especiais, etc."
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none h-20"
                    />
                  </div>
                </div>
              )}

              {/* ABA 3: FORMAÇÃO ACADÊMICA */}
              {activeFormTab === 'formacao' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  
                  {/* Formulário auxiliar para adicionar formação */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Grau Académico</label>
                      <select
                        value={draftEducation.degree}
                        onChange={(e) => setDraftEducation({ ...draftEducation, degree: e.target.value as any })}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white"
                      >
                        <option value="Graduação">Graduação</option>
                        <option value="Especialização">Especialização</option>
                        <option value="Mestrado">Mestrado</option>
                        <option value="Doutorado">Doutorado</option>
                        <option value="Pós-Doutorado">Pós-Doutorado</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Curso / Especialidade</label>
                      <input
                        type="text"
                        value={draftEducation.course_name}
                        onChange={(e) => setDraftEducation({ ...draftEducation, course_name: e.target.value })}
                        placeholder="Ex: Letras"
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Instituição de Ensino</label>
                      <input
                        type="text"
                        value={draftEducation.institution}
                        onChange={(e) => setDraftEducation({ ...draftEducation, institution: e.target.value })}
                        placeholder="Ex: USP"
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Ano de Conclusão</label>
                      <input
                        type="number"
                        value={draftEducation.completion_year}
                        onChange={(e) => setDraftEducation({ ...draftEducation, completion_year: Number(e.target.value) })}
                        placeholder="Ex: 2020"
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="sm:col-span-3 flex flex-col gap-1 justify-center">
                      <label className="text-xs font-semibold text-slate-500">Upload de Comprovativo / Diploma</label>
                      <input 
                        type="file" 
                        onChange={(e) => handleSimulatedUpload('education', e)} 
                        className="text-xs"
                      />
                    </div>

                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!draftEducation.institution || !draftEducation.course_name) {
                            showToast('Curso e instituição são obrigatórios!', 'error');
                            return;
                          }
                          const list = editingTeacher.education || [];
                          setEditingTeacher({
                            ...editingTeacher,
                            education: [...list, { ...draftEducation, id: `edu-${Date.now()}`, teacher_id: editingTeacher.id }]
                          });
                          setDraftEducation({ degree: 'Graduação', institution: '', course_name: '', completion_year: 2026 });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3 rounded-xl transition-all"
                      >
                        Adicionar Formação
                      </button>
                    </div>
                  </div>

                  {/* Listagem das formações já incluídas */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                          <th className="p-3">Grau</th>
                          <th className="p-3">Curso / Especialidade</th>
                          <th className="p-3">Instituição</th>
                          <th className="p-3">Conclusão</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {editingTeacher.education && editingTeacher.education.length > 0 ? (
                          editingTeacher.education.map(edu => (
                            <tr key={edu.id}>
                              <td className="p-3 font-semibold text-slate-700">{edu.degree}</td>
                              <td className="p-3 text-slate-600">{edu.course_name}</td>
                              <td className="p-3 text-slate-600">{edu.institution}</td>
                              <td className="p-3 text-slate-600">{edu.completion_year}</td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTeacher({
                                      ...editingTeacher,
                                      education: editingTeacher.education?.filter(e => e.id !== edu.id)
                                    });
                                  }}
                                  className="text-rose-600 hover:text-rose-800 font-semibold"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                              Nenhuma formação cadastrada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* ABA 4: CERTIFICAÇÕES */}
              {activeFormTab === 'certificacoes' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  
                  {/* Formulário auxiliar de inserção */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Título do Certificado</label>
                      <input
                        type="text"
                        value={draftCertification.title}
                        onChange={(e) => setDraftCertification({ ...draftCertification, title: e.target.value })}
                        placeholder="Ex: Scrum Master"
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Órgão Emissor</label>
                      <input
                        type="text"
                        value={draftCertification.issuing_organization}
                        onChange={(e) => setDraftCertification({ ...draftCertification, issuing_organization: e.target.value })}
                        placeholder="Ex: Scrum Alliance"
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Data de Emissão</label>
                      <input
                        type="date"
                        value={draftCertification.issue_date}
                        onChange={(e) => setDraftCertification({ ...draftCertification, issue_date: e.target.value })}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Data de Expiração</label>
                      <input
                        type="date"
                        value={draftCertification.expiration_date}
                        onChange={(e) => setDraftCertification({ ...draftCertification, expiration_date: e.target.value })}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="sm:col-span-3 flex flex-col gap-1 justify-center">
                      <label className="text-xs font-semibold text-slate-500">Arquivo do Certificado (PDF/JPG)</label>
                      <input 
                        type="file" 
                        onChange={(e) => handleSimulatedUpload('certification', e)} 
                        className="text-xs"
                      />
                    </div>

                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!draftCertification.title || !draftCertification.issuing_organization || !draftCertification.issue_date) {
                            showToast('Título, organização e data de emissão são obrigatórios!', 'error');
                            return;
                          }
                          const list = editingTeacher.certifications || [];
                          setEditingTeacher({
                            ...editingTeacher,
                            certifications: [...list, { ...draftCertification, id: `cert-${Date.now()}`, teacher_id: editingTeacher.id }]
                          });
                          setDraftCertification({ title: '', issuing_organization: '', issue_date: '', expiration_date: '' });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3 rounded-xl transition-all"
                      >
                        Adicionar Certificado
                      </button>
                    </div>
                  </div>

                  {/* Listagem */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                          <th className="p-3">Título</th>
                          <th className="p-3">Organização Emissora</th>
                          <th className="p-3">Data Emissão</th>
                          <th className="p-3">Expiração</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {editingTeacher.certifications && editingTeacher.certifications.length > 0 ? (
                          editingTeacher.certifications.map(cert => (
                            <tr key={cert.id}>
                              <td className="p-3 font-semibold text-slate-700">{cert.title}</td>
                              <td className="p-3 text-slate-600">{cert.issuing_organization}</td>
                              <td className="p-3 text-slate-600">{cert.issue_date}</td>
                              <td className="p-3 text-slate-600">{cert.expiration_date || 'Não expira'}</td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTeacher({
                                      ...editingTeacher,
                                      certifications: editingTeacher.certifications?.filter(c => c.id !== cert.id)
                                    });
                                  }}
                                  className="text-rose-600 hover:text-rose-800 font-semibold"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                              Nenhum certificado cadastrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* ABA 5: DISCIPLINAS (VÍNCULOS N:N) */}
              {activeFormTab === 'disciplinas' && (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <span className="text-xs font-semibold text-slate-500 block">Atribua as disciplinas autorizadas para este docente:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subjects.map(sub => {
                      const isChecked = editingTeacher.subjects?.includes(sub.id) || false;
                      return (
                        <label 
                          key={sub.id} 
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block">{sub.name}</span>
                            <span className="text-[10px] text-slate-500 block">{sub.description || 'Sem descrição'}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const currentList = editingTeacher.subjects || [];
                              const newList = e.target.checked
                                ? [...currentList, sub.id]
                                : currentList.filter(id => id !== sub.id);
                              setEditingTeacher({ ...editingTeacher, subjects: newList });
                            }}
                            className="rounded-xl border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ABA 6: TURMAS (VÍNCULOS N:N) */}
              {activeFormTab === 'turmas' && (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <span className="text-xs font-semibold text-slate-500 block">Selecione as turmas vinculadas ao docente para o presente ano letivo:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {classes.map(cls => {
                      const isChecked = editingTeacher.classes?.includes(cls.id) || false;
                      return (
                        <label 
                          key={cls.id} 
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block">{cls.name}</span>
                            <span className="text-[10px] text-slate-500 block">Ano Letivo: {cls.school_year} • Turno: {cls.shift}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const currentList = editingTeacher.classes || [];
                              const newList = e.target.checked
                                ? [...currentList, cls.id]
                                : currentList.filter(id => id !== cls.id);
                              setEditingTeacher({ ...editingTeacher, classes: newList });
                            }}
                            className="rounded-xl border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ABA 7: GRADE HORÁRIA */}
              {activeFormTab === 'horarios' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  
                  {/* Auxiliar de inserção de aula */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">
                        Turma
                      </label>

                      <select
                        value={draftSchedule.class_id}
                        onChange={(e) =>
                          setDraftSchedule({
                            ...draftSchedule,
                            class_id: e.target.value
                          })
                        }
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white"
                      >
                        <option value="">Selecione uma turma</option>

                        {classes
                          .filter(cls => editingTeacher.classes?.includes(cls.id))
                          .map(cls => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Dia da Semana</label>
                      <select
                        value={draftSchedule.weekday}
                        onChange={(e) => setDraftSchedule({ ...draftSchedule, weekday: e.target.value as any })}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white"
                      >
                        <option value="Segunda-feira">Segunda-feira</option>
                        <option value="Terça-feira">Terça-feira</option>
                        <option value="Quarta-feira">Quarta-feira</option>
                        <option value="Quinta-feira">Quinta-feira</option>
                        <option value="Sexta-feira">Sexta-feira</option>
                        <option value="Sábado">Sábado</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Início da Aula</label>
                      <input
                        type="time"
                        value={draftSchedule.start_time}
                        onChange={(e) => setDraftSchedule({ ...draftSchedule, start_time: e.target.value })}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Término da Aula</label>
                      <input
                        type="time"
                        value={draftSchedule.end_time}
                        onChange={(e) => setDraftSchedule({ ...draftSchedule, end_time: e.target.value })}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const list = editingTeacher.schedules || [];
                          setEditingTeacher({
                            ...editingTeacher,
                            schedules: [...list, { ...draftSchedule, teacher_id: editingTeacher.id }]
                          });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3 rounded-xl transition-all"
                      >
                        Inserir Horário
                      </button>
                    </div>
                  </div>

                  {/* Listagem */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                          <th className="p-3">Turma</th>
                          <th className="p-3">Dia da Semana</th>
                          <th className="p-3">Horário de Início</th>
                          <th className="p-3">Horário de Término</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {editingTeacher.schedules && editingTeacher.schedules.length > 0 ? (
                          editingTeacher.schedules.map(sch => (
                            <tr key={sch.id}>
                              <td className="p-3">
                                {
                                  classes.find(c => c.id === sch.class_id)?.name
                                }
                              </td>
                              <td className="p-3 font-semibold text-slate-700">{sch.weekday}</td>
                              <td className="p-3 text-slate-600 font-mono">{sch.start_time}</td>
                              <td className="p-3 text-slate-600 font-mono">{sch.end_time}</td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTeacher({
                                      ...editingTeacher,
                                      schedules: editingTeacher.schedules?.filter(s => s.id !== sch.id)
                                    });
                                  }}
                                  className="text-rose-600 hover:text-rose-800 font-semibold"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                              Nenhuma aula configurada na grade de horários deste docente.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* ABA 8: DOCUMENTOS PEDAGÓGICOS / PESSOAIS */}
              {activeFormTab === 'documentos' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  
                  {/* Seletor e Upload */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Tipo de Documento</label>
                      <select
                        value={draftDocument.document_type}
                        onChange={(e) => setDraftDocument({ ...draftDocument, document_type: e.target.value as any })}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white"
                      >
                        <option value="RG">RG</option>
                        <option value="CPF">CPF</option>
                        <option value="Contrato de Trabalho">Contrato de Trabalho</option>
                        <option value="Comprovante de Residência">Comprovante de Residência</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 justify-center">
                      <label className="text-xs font-semibold text-slate-500">Arquivo do Documento</label>
                      <input 
                        type="file" 
                        onChange={(e) => handleSimulatedUpload('document', e)} 
                        className="text-xs"
                      />
                    </div>

                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!draftDocument.file_name) {
                            showToast('Selecione e carregue um arquivo válido!', 'error');
                            return;
                          }
                          const list = editingTeacher.documents || [];
                          setEditingTeacher({
                            ...editingTeacher,
                            documents: [...list, { 
                              id: `doc-${Date.now()}`, 
                              teacher_id: editingTeacher.id, 
                              document_type: draftDocument.document_type,
                              file_name: draftDocument.file_name,
                              file_url: '#',
                              created_at: new Date().toISOString().split('T')[0]
                            }]
                          });
                          setDraftDocument({ document_type: 'RG', file_name: '' });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3 rounded-xl transition-all"
                      >
                        Vincular Documento
                      </button>
                    </div>
                  </div>

                  {/* Listagem */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                          <th className="p-3">Categoria / Tipo</th>
                          <th className="p-3">Nome do Arquivo</th>
                          <th className="p-3">Adicionado em</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {editingTeacher.documents && editingTeacher.documents.length > 0 ? (
                          editingTeacher.documents.map(doc => (
                            <tr key={doc.id}>
                              <td className="p-3 font-semibold text-slate-700">{doc.document_type}</td>
                              <td className="p-3 text-slate-600 font-mono">{doc.file_name}</td>
                              <td className="p-3 text-slate-500">{doc.created_at}</td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTeacher({
                                      ...editingTeacher,
                                      documents: editingTeacher.documents?.filter(d => d.id !== doc.id)
                                    });
                                  }}
                                  className="text-rose-600 hover:text-rose-800 font-semibold"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                              Nenhum ficheiro ou documento pedagógico anexado a esta pasta.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* ABA 9: AVALIAÇÕES DE DESEMPENHO */}
              {activeFormTab === 'avaliacoes' && (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  
                  {/* Auxiliar de inserção de avaliação */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Nome do Avaliador</label>
                      <input
                        type="text"
                        value={draftEvaluation.evaluator_name}
                        onChange={(e) => setDraftEvaluation({ ...draftEvaluation, evaluator_name: e.target.value })}
                        placeholder="Ex: Coord. Pedagógica"
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Nota de Desempenho (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={draftEvaluation.score}
                        onChange={(e) => setDraftEvaluation({ ...draftEvaluation, score: Number(e.target.value) })}
                        placeholder="Nota de 1 a 5"
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Data de Avaliação</label>
                      <input
                        type="date"
                        value={draftEvaluation.evaluation_date}
                        onChange={(e) => setDraftEvaluation({ ...draftEvaluation, evaluation_date: e.target.value })}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5"
                      />
                    </div>

                    <div className="sm:col-span-4 flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Parecer Técnico / Comentários</label>
                      <textarea
                        value={draftEvaluation.comments}
                        onChange={(e) => setDraftEvaluation({ ...draftEvaluation, comments: e.target.value })}
                        placeholder="Insira detalhes sobre as dinâmicas de ensino e aproveitamento pedagógico do docente."
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 h-16"
                      />
                    </div>

                    <div className="sm:col-span-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!draftEvaluation.evaluator_name || !draftEvaluation.comments || !draftEvaluation.evaluation_date) {
                            showToast('Insira o nome do avaliador, data e parecer!', 'error');
                            return;
                          }
                          const list = editingTeacher.evaluations || [];
                          setEditingTeacher({
                            ...editingTeacher,
                            evaluations: [...list, { ...draftEvaluation, id: `eval-${Date.now()}`, teacher_id: editingTeacher.id }]
                          });
                          setDraftEvaluation({ evaluator_name: '', score: 5, comments: '', evaluation_date: '' });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all"
                      >
                        Registrar Avaliação
                      </button>
                    </div>
                  </div>

                  {/* Listagem */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                          <th className="p-3">Avaliador</th>
                          <th className="p-3">Nota</th>
                          <th className="p-3">Parecer Técnico</th>
                          <th className="p-3">Data</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {editingTeacher.evaluations && editingTeacher.evaluations.length > 0 ? (
                          editingTeacher.evaluations.map(ev => (
                            <tr key={ev.id}>
                              <td className="p-3 font-semibold text-slate-700">{ev.evaluator_name}</td>
                              <td className="p-3 text-blue-600 font-mono font-semibold">{ev.score} / 5</td>
                              <td className="p-3 text-slate-600 max-w-xs truncate">{ev.comments}</td>
                              <td className="p-3 text-slate-500">{ev.evaluation_date}</td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTeacher({
                                      ...editingTeacher,
                                      evaluations: editingTeacher.evaluations?.filter(e => e.id !== ev.id)
                                    });
                                  }}
                                  className="text-rose-600 hover:text-rose-800 font-semibold"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                              Nenhuma avaliação registada para este professor.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* Modal Action Buttons Footer */}
              <div className="mt-8 border-t border-slate-100 pt-4 flex justify-end items-center bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingTeacher(null); }}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
                  >
                    Salvar
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
    )
} 