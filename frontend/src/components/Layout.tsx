import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#e8ede9] text-[#2d4735] font-sans">
      {/* Overlay para móviles cuando el sidebar está abierto */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#2d4735]/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar con clases responsivas */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden h-screen">
        {/* Fondo decorativo con hojas borrosas en la esquina inferior izquierda (detrás del contenido) */}
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[url('https://images.unsplash.com/photo-1536882240095-0379873feb4e?q=80&w=800&auto=format&fit=crop')] bg-cover opacity-20 blur-3xl rounded-full z-0 pointer-events-none"></div>

        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto relative z-10 no-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Estilos globales para esconder la scrollbar pero mantener scroll en todo el layout */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};
