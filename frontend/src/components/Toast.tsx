import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Toast: React.FC = () => {
  const { toast } = useApp();
  if (!toast) return null;

  return (
    <div className={`toast-container toast-${toast.type}`}>
      {toast.type === 'success' && <CheckCircle2 size={18} />}
      {toast.type === 'error' && <AlertCircle size={18} />}
      {toast.type === 'info' && <Info size={18} />}
      <span>{toast.message}</span>
    </div>
  );
};
