import { supabase } from "../lib/supabase"

const storage = {
    getUser: async () => {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.log(error)
      return null
    }

    return data.user
  },
  getCollaboratorPermissions: async (role) => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('allowed_menu_ids, allowed_submenu_ids')
      .eq('role_name', role)
      .single();

    if (error) {
      console.error('Erro ao buscar permissões:', error);
      return;
    }
    return data
  },
  getPermissionsbyUser: async() => {

    const collab = await storage.getCollaborator()

    const { data, error } = await supabase
      .from('role_permissions')
      .select('role_name')
      .eq('user_id', collab?.user_id)

    if (error) {
      console.error('Erro ao buscar permissões:', error);
      return;
    }
    
    return data
  },
  getCollaborator: async () => {

    const user = await storage.getUser()

    const { data, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('email', user.email)
    .maybeSingle()


    if (error) {
      console.log(error)
      return null
    }

    return data    
  },
}
export default storage