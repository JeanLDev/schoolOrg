  import React, { useEffect, useState } from 'react';
  import { Link, NavLink } from 'react-router-dom';
  import { supabase } from '../../lib/supabase';
  import { 
    LayoutDashboard, 
    Users, 
    Settings, 
    LogOut, 
    ChevronLeft, 
    Menu,
    Package,
    History,
    ChartBarBig,
    Hammer,
    Album,
    Users2,
    Handshake,
    Wallet,
    DollarSign,
    Zap,
    Smile,
    HeartPulse,
    HandPlatter,
    Bot,
    ShieldCheck,
    Edit,
    Glasses,
    GraduationCap
  } from 'lucide-react';
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';
  import { useLocation } from 'react-router-dom';



  function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }

  interface SidebarProps {
    userEmail: string | undefined;
    cargo:object;
  }



  export default function Sidebar({ userEmail,cargo }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false); // mobile
    const [permissions, setPermissions] = useState(null);
    const location = useLocation();


  useEffect(() => {
    if (cargo?.role) {
      loadPermissions();
    }
  }, [cargo]);

  const loadPermissions = async () => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('allowed_menu_ids, allowed_submenu_ids')
      .eq('role_name', cargo.role)
      .single();

    if (error) {
      console.error('Erro ao buscar permissões:', error);
      return;
    }

    setPermissions(data);
  };


    const menuItems = [
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
        { 
          id: 'presence', 
          path: '/presence', 
          label: 'Presença',
        }
      ]
    },
    {
      id: 'alunos',
      path: '/alunos',
      label: 'Alunos',
      icon: Users,
    },
    {
      id: 'collaborators',
      path: '/collaborators',
      label: 'Colaboradores',
      icon: Handshake,
    },
     {
      id: 'editorpermissions',
      path: '/editorpermissions',
      label: 'Configurações',
      icon: Settings,
      subPath: [
        { 
          id: 'editorpermissions', 
          path: '/editorpermissions', 
          label: 'Editor Sidebar',
        }
      ]
    }
    
  
    ];

    const handleLogout = async () => {
      await supabase.auth.signOut();
    };
    const isMenuActive = (item) => {
    if (location.pathname.startsWith(item.path)) return true;

    if (item.subPath) {
      return item.subPath.some(sub =>
        location.pathname.startsWith(sub.path)
      );
    }

    return false;
  };


  const isOwner = cargo?.role === 'Owner';

  const filteredMenuItems = isOwner
    ? menuItems
    : menuItems.filter(item =>
        permissions?.allowed_menu_ids?.includes(item.id)
      );
    return (
    <>
      {/* BOTÃO MOBILE FIXO */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden absolute top-4 left-4 z-50 bg-white p-2 rounded-md "
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* OVERLAY MOBILE */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col transition-all duration-300 h-screen top-0 z-50",

          // 📱 Mobile
          "fixed md:sticky",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",

          // 💻 Desktop width
          isCollapsed ? "md:w-20" : "md:w-64",
          "w-64"
        )}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between w-full">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-md">
                <Link 
                to="/lobby">
                  <HeartPulse className="w-5 h-5 text-white" />
                </Link>
              </div>
              <span className="font-bold text-slate-900 truncate">CRM</span>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hidden md:block hover:bg-slate-100 rounded-md text-slate-500 transition-colors mx-auto"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = isMenuActive(item);

            return (
              <div key={item.id}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-md transition-all group",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 shrink-0",
                      isActive
                        ? "text-blue-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  {!isCollapsed && (
                    <span className=" text-sm truncate">
                      {item.label}
                    </span>
                  )}
        </NavLink>

        {/* Renderizar submenus */}
        {!isCollapsed && item.subPath && isActive && (
          <div className="ml-8 mt-1 space-y-1">
            {item.subPath
            .filter(sub =>
              isOwner ||
              permissions?.allowed_submenu_ids?.includes(sub.id)
            )
            .map((sub) => {
              const isSubActive = location.pathname.startsWith(sub.path);

              return (
                <NavLink
                  key={sub.id}
                  to={sub.path}
                  className={cn(
                    "block text-sm px-2 py-1 rounded-md transition-colors",
                    isSubActive
                      ? "text-blue-600"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {sub.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  })}
        </nav>

        <div className="p-2 border-t border-slate-200">
          <button
            className={cn(
              "w-full flex items-center gap-3 rounded-xl p-3 transition-all ",
              isCollapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              

              {!isCollapsed && (
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {userEmail}
                  </p>

                  {cargo?.role && (
                    <p className="text-xs text-blue-600 font-medium">
                      {cargo.role}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isCollapsed && (
              <LogOut onClick={handleLogout} className="w-4 h-4 text-red-500 shrink-0 hover:bg-slate-100" />
            )}
          </button>
        </div>
      </aside>
      <Menu className="md:hidden m-4 "/>
      </>
    );
  }
