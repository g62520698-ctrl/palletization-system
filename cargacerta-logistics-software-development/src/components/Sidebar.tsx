/**
 * CargaCerta v2 - Sidebar de Navegação
 */

import { useState } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeModule, onModuleChange, isOpen, onClose }: SidebarProps) {
  const handleNavClick = (module: string) => {
    onModuleChange(module);
    onClose();
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? '' : styles.overlayHidden}`}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <div className={styles.brandIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span className={styles.brandTitle}>CargaCerta</span>
          </div>
          <div className={styles.brandSubtitle}>Logística Inteligente</div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <span className={styles.navLabel}>Módulos</span>
          
          <button
            className={`${styles.navItem} ${activeModule === 'enderecamento' ? styles.navItemActive : ''}`}
            onClick={() => handleNavClick('enderecamento')}
          >
            <span className={styles.navIcon}>📦</span>
            Endereçamento
          </button>

          <button
            className={`${styles.navItem} ${activeModule === 'paletizacao' ? styles.navItemActive : ''}`}
            onClick={() => handleNavClick('paletizacao')}
          >
            <span className={styles.navIcon}>🪵</span>
            Paletização PBR
          </button>
        </nav>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Desenvolvido por <span className={styles.footerName}>Guilherme Lopes</span>
          </p>
        </div>
      </aside>
    </>
  );
}
