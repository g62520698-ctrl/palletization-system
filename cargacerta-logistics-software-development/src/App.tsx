/**
 * CargaCerta v2 - Aplicação Principal
 * 
 * Software profissional de paletização e endereçamento
 * para operadores logísticos e centros de distribuição.
 * 
 * Desenvolvido por Guilherme Lopes
 */

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import EnderecamentoModule from '@/modules/enderecamento/EnderecamentoModule';
import PaletizacaoModule from '@/modules/paletizacao/PaletizacaoModule';
import { registerServiceWorker, initInstallPrompt } from '@/utils/pwa';
import styles from './App.module.css';

// Registrar PWA
registerServiceWorker();
initInstallPrompt();

type ModuleType = 'enderecamento' | 'paletizacao';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('paletizacao');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderModule = () => {
    switch (activeModule) {
      case 'enderecamento':
        return <EnderecamentoModule />;
      case 'paletizacao':
        return <PaletizacaoModule />;
      default:
        return <PaletizacaoModule />;
    }
  };

  return (
    <div className={styles.app}>
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onModuleChange={(mod) => setActiveModule(mod as ModuleType)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Área Principal */}
      <div className={styles.main}>
        {/* Header Mobile */}
        <header className={styles.header}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className={styles.headerTitle}>
            <div className={styles.headerLogo}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            CargaCerta
          </div>
        </header>

        {/* Conteúdo */}
        <div className={styles.content}>
          {renderModule()}
        </div>

        {/* Rodapé */}
        <footer className={styles.footer}>
          Desenvolvido por <span className={styles.footerName}>Guilherme Lopes</span>
        </footer>
      </div>
    </div>
  );
}
