import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck,
  RefreshCw,
  Save,
  UserCheck,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  X,
  Info,
  Edit,
  Glasses,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import storage from '@/src/utilies/storage';



// Interfaces baseadas na estrutura de navegação do Sidebar
interface SubPath {
  id: string;
  path: string;
  label: string;
}

interface MenuItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<any>;
  subPath?: SubPath[];
}

// Configuração estática dos Menus existentes no seu App
const ALL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'professores',
    path: '/professores',
    label: 'Professores',
    icon: Glasses,
  },
  {
    id: 'turmas',
    path: '/turmas',
    label: 'Turmas',
    icon: GraduationCap,
     subPath: [
      { id: 'presence', path: '/presence', label: 'Presença' },
      { id: 'lancarnota', path: '/lancarnota', label: 'Lançar Nota' },
      { id: 'boletim', path: '/boletim', label: 'Boletim' }
    ]
  },
  {
    id: 'collaborators',
    path: '/collaborators',
    label: 'Colaboradores',
    icon: Users,
  },
   {
    id: 'disciplinas',
    path: '/disciplinas',
    label: 'Disciplinas',
    icon: BookOpen,
  },
  {
    id: 'editorpermissions',
    path: '/editorpermissions',
    label: 'Editor Sidebar',
    icon: Edit,
    subPath: [
      { id: 'editorpermissions', path: '/editorpermissions', label: 'Editor Sidebar' }
    ]
  }
];

export default function EditorSidebar() {

  // Estados dos Usuários e Cargos
  const [userRole, setUserRole] = useState('Owner');
  const [rolePermissions, setRolePermissions] = useState<Record<string, { allowed_menus: string[], allowed_submenus: string[] }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Estados dos Modais de Controle do CRUD
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Dados do formulário para Criar/Editar
  const [selectedRole, setSelectedRole] = useState<string | null>(null); // Nulo indica "Criando Novo"
  const [formRoleName, setFormRoleName] = useState('');
  const [formAllowedMenus, setFormAllowedMenus] = useState<string[]>([]);
  const [formAllowedSubmenus, setFormAllowedSubmenus] = useState<string[]>([]);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  // Lista dinâmica dos cargos ativos encontrados nas chaves do objeto de permissões
  const activeRoles = Object.keys(rolePermissions);

  // Buscar permissões ao iniciar
  useEffect(() => {
    fetchPermissions();
  }, []);

  async function fetchPermissions() {
    try {
      setLoading(true);
      const collab = await storage.getCollaborator()
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_name, allowed_menu_ids, allowed_submenu_ids')
        .neq('role_name', 'Owner')
        .eq('user_id', collab?.user_id)
      
      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: typeof rolePermissions = {};
        data.forEach((row: any) => {
          mapped[row.role_name] = {
            allowed_menus: row.allowed_menu_ids || [],
            allowed_submenus: row.allowed_submenu_ids || []
          };
        });
        setRolePermissions(mapped);
      } 
    } catch (err) {
      console.error("Erro na carga inicial das permissões:", err);
    } finally {
      setLoading(false);
    }
  }

  // Aciona modal de criação (C)
  const handleOpenCreate = () => {
    setSelectedRole(null);
    setFormRoleName('');
    setFormAllowedMenus([]);
    setFormAllowedSubmenus([]);
    setIsFormModalOpen(true);
  };

  // Aciona modal de edição (U)
  const handleOpenEdit = (roleName: string) => {
    const current = rolePermissions[roleName];
    setSelectedRole(roleName);
    setFormRoleName(roleName);
    setFormAllowedMenus(current?.allowed_menus || []);
    setFormAllowedSubmenus(current?.allowed_submenus || []);
    setIsFormModalOpen(true);
  };

  //buscar userID
  const [collabId, setCollabId] = useState(null)
  useEffect(()=> {
    const fetchCollabId = async() => {
      const colaborador = await storage.getCollaborator()
      if (colaborador){
        setCollabId(colaborador?.user_id)
      }
    }
    fetchCollabId()
  },[])
  // Salvar no Banco (C / U do CRUD)
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoleName.trim()) {
      showToast("Insira o nome do cargo!", "error");
      return;
    }

    setSaving(true);
    try {
      // Se alterou o nome do cargo de um existente, precisamos remover a chave antiga no objeto local
      const isRename = selectedRole && selectedRole !== formRoleName;

      // Upsert no Supabase
      const { error } = await supabase
        .from('role_permissions')
        .upsert({
          role_name: formRoleName.trim(),
          allowed_menu_ids: formAllowedMenus,
          allowed_submenu_ids: formAllowedSubmenus,
          updated_at: new Date().toISOString(),
          user_id: collabId
        }, { onConflict: 'role_name' });

      if (error) throw error;

      // Se foi renomeado, exclui a chave antiga da simulação
      if (isRename && selectedRole) {
        await supabase.from('role_permissions').delete().eq('role_name', selectedRole);
      }

      showToast(
        selectedRole 
          ? `Cargo "${formRoleName}" atualizado com sucesso!` 
          : `Cargo "${formRoleName}" criado com sucesso!`, 
        'success'
      );

      setIsFormModalOpen(false);
      fetchPermissions(); // Recarregar dados
    } catch (err: any) {
      console.error(err);
      showToast(`Erro ao salvar: ${err.message || "Tente novamente"}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Aciona confirmação de Exclusão (D do CRUD)
  const handleOpenDelete = (roleName: string) => {
    setRoleToDelete(roleName);
    setIsDeleteModalOpen(true);
  };

  // Deletar efetivamente
  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_name', roleToDelete);

      if (error) throw error;

      showToast(`Cargo "${roleToDelete}" excluído com sucesso!`, 'success');
      
      // Se o usuário atual estava testando o cargo excluído, volta para "Owner"
      if (userRole === roleToDelete) {
        setUserRole('Owner');
      }

      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
      fetchPermissions();
    } catch (err: any) {
      console.error(err);
      showToast("Erro ao excluir do banco.", "error");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Funções internas para manipulação de checkboxes no formulário do Modal
  const toggleMenuForm = (menuId: string) => {
    if (formAllowedMenus.includes(menuId)) {
      setFormAllowedMenus(prev => prev.filter(id => id !== menuId));
      // Desmarca os submenus correspondentes
      const associatedSub = ALL_MENU_ITEMS.find(m => m.id === menuId)?.subPath?.map(s => s.id) || [];
      setFormAllowedSubmenus(prev => prev.filter(subId => !associatedSub.includes(subId)));
    } else {
      setFormAllowedMenus(prev => [...prev, menuId]);
      // Ativa todos os submenus por padrão de facilidade
      const associatedSub = ALL_MENU_ITEMS.find(m => m.id === menuId)?.subPath?.map(s => s.id) || [];
      setFormAllowedSubmenus(prev => Array.from(new Set([...prev, ...associatedSub])));
    }
  };

  const toggleSubmenuForm = (menuId: string, submenuId: string) => {
    if (formAllowedSubmenus.includes(submenuId)) {
      setFormAllowedSubmenus(prev => prev.filter(id => id !== submenuId));
    } else {
      setFormAllowedSubmenus(prev => [...prev, submenuId]);
      // Garante que o menu pai fique ativo caso selecione um submenu
      if (!formAllowedMenus.includes(menuId)) {
        setFormAllowedMenus(prev => [...prev, menuId]);
      }
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
     

      {/* CONTEÚDO DO CRUD */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* TOAST NOTIFICAÇÕES */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl border text-white transition-all flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 animate-slide-in' : 'bg-rose-600 border-rose-500 animate-slide-in'
          }`}>
            <span className="font-semibold text-sm">{toast.message}</span>
          </div>
        )}

        {/* CABEÇALHO */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            Permissões de Cargo
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Crie, liste, edite e remova privilégios de acesso do menu lateral.
            </p>
          </div>

        </div>

        {/* VIEW 1: PAINEL CRUD */}
        
        <div className="space-y-6">
            
            {/* BARRA DE AÇÕES */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {activeRoles.length} Cargos Registrados
                </span>
              </div>
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                Adicionar Novo Cargo
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                <span className="text-slate-500 text-sm font-bold">Carregando dados das rotas...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeRoles.map((role) => {
                  const perms = rolePermissions[role] || { allowed_menus: [], allowed_submenus: [] };
                  const menusCount = perms.allowed_menus.length;
                  const submenusCount = perms.allowed_submenus.length;

                  return (
                    <div 
                      key={role} 
                      className="bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all duration-300 p-5 flex flex-col justify-between"
                    >
                      <div>
                        {/* Nome do cargo e badge */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="text-lg font-semibold text-slate-800 tracking-tight truncate">{role}</h3>
                          <span className="bg-slate-100 text-slate-600 text-sm font-mono px-2 py-0.5 rounded border border-slate-200 shrink-0">
                            ID: {role.toLowerCase()}
                          </span>
                        </div>

                        {/* Estatísticas de acesso */}
                        <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="text-center">
                            <span className="text-sm text-slate-600 font-bold  block">Menus Pais</span>
                            <span className="text-base font-bold text-blue-600">{menusCount}</span>
                          </div>
                          <div className="text-center border-l border-slate-200">
                            <span className="text-sm text-slate-600 font-bold  block">Submenus</span>
                            <span className="text-base font-bold text-indigo-600">{submenusCount}</span>
                          </div>
                        </div>

                        {/* Resumo visual dos ícones ativos */}
                        <div className="mb-6">
                          <span className="text-sm font-bold text-slate-600  block mb-1.5">Menus Visíveis:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {ALL_MENU_ITEMS.map((item) => {
                              const isAllowed = perms.allowed_menus.includes(item.id);
                              if (!isAllowed) return null;
                              return (
                                <div 
                                  key={item.id} 
                                  className="bg-blue-50 text-blue-700 p-1 rounded border border-blue-100" 
                                  title={item.label}
                                >
                                  <item.icon className="w-3.5 h-3.5" />
                                </div>
                              );
                            })}
                            {menusCount === 0 && (
                              <span className="text-xs text-rose-500 font-medium">Sem nenhuma tela habilitada</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação do CRUD */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenEdit(role)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar Cargo
                        </button>
                        <button
                          disabled={role === 'Owner'}
                          onClick={() => handleOpenDelete(role)}
                          className="flex items-center justify-center p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 rounded-xl transition-all"
                          title="Excluir Cargo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        


        {/* MODAL 1: FORMULÁRIO CRIAR / EDITAR CARGO */}
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <form 
              onSubmit={handleSaveRole}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in"
            >
              {/* Header do Modal */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-lg">
                    {selectedRole ? `Editar Cargo: ${selectedRole}` : 'Adicionar Novo Cargo'}
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo do Modal (Campos & Toggles) */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Campo de Texto para o Nome do Cargo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500  tracking-wider block">
                    Nome do Cargo (Ex: Vendedor, Supervisor de Produção)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Escreva o cargo..."
                    disabled={selectedRole === 'Owner'}
                    value={formRoleName}
                    onChange={(e) => setFormRoleName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800 text-sm"
                  />
                </div>

                {/* Seleção de Permissões */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500  tracking-wider border-b border-slate-100 pb-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Selecione as telas e submenus permitidos para este cargo:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALL_MENU_ITEMS.map((item) => {
                      const isMenuAllowed = formAllowedMenus.includes(item.id);
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`p-4 rounded-xl border transition-all ${
                            isMenuAllowed 
                              ? 'bg-blue-50/40 border-blue-200' 
                              : 'bg-slate-50/50 border-slate-200 opacity-80 hover:opacity-100'
                          }`}
                        >
                          {/* Menu Principal */}
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={
                                selectedRole === 'Owner'
                                  ? true
                                  : isMenuAllowed
                              }
                              disabled={selectedRole === 'Owner'}
                              onChange={() => toggleMenuForm(item.id)}
                              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300"
                            />
                            <div className="bg-white p-1 rounded border border-slate-200 text-slate-600 shrink-0">
                              <item.icon className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-800 text-sm">{item.label}</span>
                          </label>

                          {/* Submenus filhos */}
                          {item.subPath && item.subPath.length > 0 && (
                            <div className="mt-3 ml-7 pl-3 border-l-2 border-slate-200/60 space-y-2">
                              {item.subPath.map((sub) => {
                                const isSubAllowed = formAllowedSubmenus.includes(sub.id);
                                return (
                                  <label key={sub.id} className="flex items-center gap-2.5 cursor-pointer text-xs select-none py-0.5">
                                    <input
                                      type="checkbox"
                                      checked={
                                        selectedRole === 'Owner'
                                          ? true
                                          : isSubAllowed
                                      }
                                      disabled={selectedRole === 'Owner'}
                                      onChange={() => toggleSubmenuForm(item.id, sub.id)}
                                      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 border-slate-300"
                                    />
                                    <span className={isSubAllowed ? 'text-slate-700 font-bold' : 'text-slate-600'}>
                                      {sub.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Gravando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL 2: CONFIRMAÇÃO DE EXCLUSÃO (Sem usar alert/confirm nativo do navegador) */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in">
              <div className="p-5 flex flex-col items-center text-center">
                <div className="bg-rose-50 text-rose-600 p-3 rounded-full mb-3">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="font-semibold text-slate-800 text-lg mb-1">
                  Excluir cargo permanente?
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  Tem certeza que deseja excluir o cargo <strong className="text-slate-700">"{roleToDelete}"</strong>? Os usuários vinculados a ele perderão o acesso às telas configuradas.
                </p>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Não, voltar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={saving}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  {saving ? 'Excluindo...' : 'Sim, Excluir Cargo'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
