import { Glasses } from "lucide-react";

export default function Teachers ({handleOpenCreateModal, searchName, setSearchName, setCurrentPage, searchRegistration, setSearchRegistration, searchSubject,setSearchSubject, subjects, searchStatus, setSearchStatus, paginatedTeachers, handleDeleteTeacher, handleOpenEditModal, totalPages, currentPage, filteredTeachers}) {

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                   <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Glasses className="w-8 h-8 text-blue-600" />
                      Gestão de Professores
                    </h1>
                  <p className="text-sm text-slate-500">Gerencie a equipa pedagógica, atribuições curriculares e avaliações.</p>
                </div>
                <button
                  onClick={handleOpenCreateModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm self-start sm:self-auto"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Novo Professor
                </button>
              </div>

              {/* Filtros de Busca */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Nome do professor</label>
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => { setSearchName(e.target.value); setCurrentPage(1); }}
                    placeholder="Buscar por nome..."
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Matrícula</label>
                  <input
                    type="text"
                    value={searchRegistration}
                    onChange={(e) => { setSearchRegistration(e.target.value); setCurrentPage(1); }}
                    placeholder="Ex: PROF202601"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Filtrar por Disciplina</label>
                  <select
                    value={searchSubject}
                    onChange={(e) => { setSearchSubject(e.target.value); setCurrentPage(1); }}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="">Todas as disciplinas</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Status</label>
                  <select
                    value={searchStatus}
                    onChange={(e) => { setSearchStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="">Todos</option>
                    <option value="Ativo">Ativos</option>
                    <option value="Afastado">Afastados</option>
                    <option value="Inativo">Inativos</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Professores */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500">Professor / Matrícula</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500">CPF</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500">Contato</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500">Disciplinas</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500">Status</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedTeachers.length > 0 ? (
                        paginatedTeachers.map(teacher => {
                          const teacherSubjectsNames = teacher.subjects
                            ? teacher.subjects.map(subId => subjects.find(s => s.id === subId)?.name).filter(Boolean)
                            : [];

                          return (
                            <tr key={teacher.id || teacher.registration_number} className="hover:bg-slate-50 transition-all">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {teacher.photo_url ? (
                                      <img src={teacher.photo_url} alt={teacher.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xs font-semibold text-blue-600">
                                        {teacher.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-slate-800 block">{teacher.full_name}</span>
                                    <span className="text-xs text-blue-600 font-mono">{teacher.registration_number}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-slate-600 font-mono">
                                {teacher.cpf}
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-sm text-slate-800 block">{teacher.email}</span>
                                <span className="text-xs text-slate-500">{teacher.phone}</span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {teacherSubjectsNames.length > 0 ? (
                                    teacherSubjectsNames.map((subName, i) => (
                                      <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-xl">
                                        {subName}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">Sem disciplinas</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-xl text-xs font-semibold ${
                                  teacher.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700' :
                                  teacher.status === 'Afastado' ? 'bg-amber-50 text-amber-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {teacher.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditModal(teacher)}
                                    className="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                                    title="Editar Professor"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTeacher(teacher.id)}
                                    className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all"
                                    title="Eliminar Registo"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                            Nenhum professor encontrado com os filtros informados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      A mostrar página {currentPage} de {totalPages} ({filteredTeachers.length} resultados)
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>
        </div>
    )
}