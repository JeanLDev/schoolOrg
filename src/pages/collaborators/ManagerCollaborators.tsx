import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { UserPlus, Trash2, Mail, Shield, Loader2, AlertCircle, Users } from 'lucide-react';
import storage from '@/src/utilies/storage';

export default function Collaborators() {
  const [collaborators, setCollaborators] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Colaborador');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [roles, setRoles] = useState([])
  const [error, setError] = useState<string | null>(null);
  const blockedRoles = [
    "fab1a75c-64c9-4c99-a282-ada0404f9b56",
    "5ae4e287-b9b0-4f2b-be2a-80251e5a8852"
  ];

  useEffect(() => {
    fetchCollaborators();
  }, []);



  const fetchCollaborators = async () => {
    setLoading(true);

    try {
      const collaborator = await storage.getCollaborator();
      const rolesData = await storage.getPermissionsbyUser()

      const isPermited =
        collaborator?.role === 'TI' ||
        collaborator?.role === 'Owner';

      let query = supabase
        .from('collaborators')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('user_id', collaborator?.user_id)

      // Se NÃO for TI ou Owner, filtra pelo próprio user_id
      if (!isPermited) {
        query = query.eq('user_id', collaborator?.user_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCollaborators(data || []);
      setRoles(rolesData)
    } catch (err: any) {
      console.error('Error fetching collaborators:', err);
      setError(
        'Falha ao carregar colaboradores. Verifique se a tabela existe no Supabase.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('collaborators')
        .insert([{
          email: newEmail,
          role: newRole,
          user_id: user.id
        }]);

      if (error) throw error;

      setNewEmail('');
      fetchCollaborators();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Tem certeza que deseja remover ${email}?`)) return;

    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchCollaborators();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 ">
      <div className="mb-8">
         <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            Colaboradores
          </h1>
        <p className="text-slate-500 text-sm">Adicione ou remova membros da equipe e defina seus cargos.</p>
      </div>

      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700  tracking-wider">Novo Colaborador</h3>
        </div>
        <form onSubmit={handleAdd} className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500  mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="colaborador@empresa.com"
                required
              />
            </div>
          </div>
          <div className="w-48">
            <label className="block text-xs font-bold text-slate-500  mb-1">Cargo</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
              >
                {roles?.map(role => {
                    return (
                        <option value={role.role_name} key={role.role_name}>{role.role_name}</option>
                    )
                })}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={actionLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Adicionar
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Erro</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-bold text-slate-700  tracking-wider">Colaborador</th>
              <th className="px-6 py-3 font-bold text-slate-700  tracking-wider">Cargo</th>
              <th className="px-6 py-3 font-bold text-slate-700  tracking-wider">Data de Adição</th>
              <th className="px-6 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" />
                  <p className="mt-2 text-slate-500 font-semibold">Carregando...</p>
                </td>
              </tr>
            ) : collaborators.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-semibold">
                  Nenhum colaborador encontrado.
                </td>
              </tr>
            ) : (
              collaborators.map((collab) => (
                <tr key={collab.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {collab.email[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900">{collab.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                      {collab.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-semibold">
                    {new Date(collab.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!blockedRoles.includes(collab.role_id) && (
                      <button
                        onClick={() => handleDelete(collab.id, collab.email)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
