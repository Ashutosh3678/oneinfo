import { LayoutDashboard, Link, ShoppingBag, LogOut, Home } from 'lucide-react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="h-screen w-64 bg-slate-900 text-white p-4 fixed left-0 top-0">
      <h1 className="text-2xl font-bold mb-8 text-blue-400 font-mono">OneInfo</h1>
      <nav className="space-y-2">
        <NavItem to="/" icon={<Home size={20} />} label="Home" active={isActive('/')} />
        <NavItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive('/dashboard')} />
        <NavItem to="/links" icon={<Link size={20} />} label="Link Generator" active={isActive('/links')} />
        <NavItem to="/orders" icon={<ShoppingBag size={20} />} label="Orders" active={isActive('/orders')} />
        
        <button onClick={handleLogout} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 text-red-400 mt-auto absolute bottom-8 w-[calc(100%-2rem)]">
            <LogOut size={20} />
            <span>Logout</span>
        </button>
      </nav>
    </div>
  );
};

const NavItem = ({ to, icon, label, active }) => (
  <RouterLink to={to} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
    {icon}
    <span>{label}</span>
  </RouterLink>
);

export default Sidebar;
