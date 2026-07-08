import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import Auth from '@/src/pages/auth/Auth';
import Sidebar from '@/src/components/Layout/Sidebar';
import { Loader2, Store } from 'lucide-react';
import storage from '@/src/utilies/storage';
import ResetPassword from '@/src/pages/auth/RecoveryPassword';

import { generateToken } from '@/src/utilies/generateTokenFirebase';
import { getMessaging, onMessage } from 'firebase/messaging';
import { messaging } from '@/src/lib/firebase';
import MainLobby from './pages/lobby/main';
import EditorSidebar from './components/Layout/SidebarEditor';
import Collaborators from './pages/collaborators/ManagerCollaborators';
import ManagerProfessores from './pages/professores/ManagerProfessores';
import ManagerTurmas from './pages/turmas/ManagerTurmas';
import ManagerStudents  from './pages/alunos/ManagerAlunos';
import Presence from './pages/turmas/Presence';
import ManagerDisciplinas from './pages/disciplinas/ManagerDisciplinas';
import GradeManagement from './pages/turmas/GradeManagement';
import BoletimEscolar from './pages/turmas/Boletim';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cargo, setCargo] = useState('')
  const [permissions, setPermissions] = useState(null)

  useEffect(() => {
    if (typeof window === "undefined") return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("🔥 Mensagem em foreground:", payload);

      const title =
        payload?.notification?.title ||
        payload?.data?.title ||
        "Nova notificação";

      const body =
        payload?.notification?.body ||
        payload?.data?.body ||
        "";

      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/logo.png"
        });
      }
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {

    const checkUser = async (session) => {
      if (!session?.user?.email) return;

      const email = session.user.email;

      // verifica se já existe
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      // se não encontrou, cria
      if (error) {
        const {error: errorD} = await supabase.from("users").insert({
          email: email,
          user_id: session.user.id
        });
        const {error: errorCollaborador} = await supabase.from("collaborators").insert({
          email: email,
          user_id: session.user.id,
          role:'Owner',
          role_id:'fab1a75c-64c9-4c99-a282-ada0404f9b56'
        });

        if (errorCollaborador) console.error(errorCollaborador)

      } else {
          const collaborator = await storage.getCollaborator()
          if (collaborator) {
            const permissionsData = await storage.getCollaboratorPermissions(collaborator.role)
            setPermissions(permissionsData)
          }
          setCargo(collaborator)
      } 

    };
    // sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      if (session) {
        checkUser(session);
      }
    });
    
    // listener de login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      if (session) {
        checkUser(session);
      }
    });

    return () => subscription.unsubscribe();

  }, []);
   
  useEffect(() => {
      if (session) {
        generateToken();
      }
    }, [session]);

  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

 return (
  <Routes>
    <Route path="/reset-password" element={<ResetPassword />} />
    {/* ROTAS PÚBLICAS */}
    {!session && (
      <>
        <Route path="/" element={<Auth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </>
    )}

    {/* ROTAS PRIVADAS */}
    {session && (
      <Route
        path="/*"
        element={
          <div className="flex min-h-screen bg-slate-50 md:flex-row flex-col">
            <div className="no-printer">
              <Sidebar
                userEmail={session.user.email}
                cargo={cargo}
                permissions={permissions}
              />
            </div>  
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Routes>
                <Route path="/" element={<Navigate to="/lobby" replace />} />


                {/**Professores */}
                <Route
                  path="/professores"
                  element={
                    <ProtectedRoute
                      permission="geral"
                      permissions={permissions}
                    >
                      <ManagerProfessores />
                    </ProtectedRoute>
                  }
                />

                {/**turmas */}
                <Route
                  path="/turmas"
                  element={
                    <ProtectedRoute
                      permission="geral"
                      permissions={permissions}
                    >
                      <ManagerTurmas />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lancarnota"
                  element={
                    <ProtectedRoute
                      permission="geral"
                      permissions={permissions}
                    >
                      <GradeManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/boletim"
                  element={
                    <ProtectedRoute
                      permission="geral"
                      permissions={permissions}
                    >
                      <BoletimEscolar />
                    </ProtectedRoute>
                  }
                />

                
                {/**presença */}
                <Route
                  path="/presence"
                  element={
                    <ProtectedRoute
                      permission="geral"
                      permissions={permissions}
                    >
                      <Presence />
                    </ProtectedRoute>
                  }
                />
                {/**Disciplinas */}
                <Route
                  path="/disciplinas"
                  element={
                    <ProtectedRoute
                      permission="geral"
                      permissions={permissions}
                    >
                      <ManagerDisciplinas />
                    </ProtectedRoute>
                  }
                />
                {/**Alunos */}
                <Route
                  path="/alunos"
                  element={
                    <ProtectedRoute
                      permission="geral"
                      permissions={permissions}
                    >
                      <ManagerStudents/>
                    </ProtectedRoute>
                  }
                />

                {/**permissions */}
                <Route
                  path="/editorpermissions"
                  element={
                    <ProtectedRoute
                      permission="geral"
                      permissions={permissions}
                    >
                      <EditorSidebar />
                    </ProtectedRoute>
                  }
                />

                {/**colaboradores */}
                <Route
                  path="/collaborators"
                  element={
                    <ProtectedRoute
                      permission="geral"
                      permissions={permissions}
                    >
                      <Collaborators />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/lobby" replace />} />

              </Routes>
            </main>
          </div>
        }
      />
    )}
  </Routes>
);
}

function ProtectedRoute({
  children,
  permission,
  permissions
}: {
  children: React.ReactNode;
  permission: string;
  permissions: any;
}) {

  if (!permissions) {
    return null;
  }

  const isAllowed =
    permissions.allowed_menu_ids?.includes(permission) ||
    permissions.allowed_submenu_ids?.includes(permission);

  if (!isAllowed) {
    return <Navigate to="/lobby" replace />;
  }

  return <>{children}</>;
}