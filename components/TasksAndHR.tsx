import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Briefcase, 
  Users, 
  Plus, 
  Phone, 
  UserCircle2, 
  CheckCircle2, 
  Search, 
  LayoutGrid, 
  Trello,
  Calendar,
  MoreVertical,
  Filter,
  ArrowRight
} from 'lucide-react';
import { Employee, Task, TaskStatus, AppSettings } from '../types';
import EmployeeProfile from './EmployeeProfile';

interface TasksAndHRProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'emp-1', fullName: 'Amina El Idrissi', phoneNumber: '06 11 22 33 44', role: 'SUPERVISOR', chaineId: 'CHAINE 1', isActive: true },
  { id: 'emp-2', fullName: 'Yassine Benali', phoneNumber: '06 55 44 33 22', role: 'OPERATOR', chaineId: 'CHAINE 1', isActive: true },
  { id: 'emp-3', fullName: 'Omar Jbari', phoneNumber: '06 77 11 88 99', role: 'MECHANIC', isActive: true },
  { id: 'emp-4', fullName: 'Salma Rahmani', phoneNumber: '06 99 88 77 66', role: 'OPERATOR', chaineId: 'CHAINE 2', isActive: false },
  { id: 'emp-5', fullName: 'Khalid Naciri', phoneNumber: '06 44 22 11 00', role: 'ADMIN', isActive: true }
];

const now = new Date().toISOString();
const earlier = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
const MOCK_TASKS: Task[] = [
  { id: 'tsk-1', title: 'Préparer ligne couture', description: 'Vérifier disponibilités accessoires', assignedTo: 'emp-1', assignedBy: 'Admin', createdAt: earlier, status: 'TODO' },
  { id: 'tsk-2', title: 'Maintenance machine 301', description: 'Calibration complète', assignedTo: 'emp-3', assignedBy: 'Admin', createdAt: earlier, status: 'IN_PROGRESS' },
  { id: 'tsk-3', title: 'Contrôle qualité batch A12', description: 'Audit sortie', assignedTo: 'emp-2', assignedBy: 'Admin', createdAt: earlier, completedAt: now, status: 'DONE' }
];

const COLUMN_META: Partial<Record<TaskStatus, { title: string; color: string; bgColor: string; borderColor: string; dotColor: string }>> = {
  TODO: { title: 'À FAIRE', color: 'text-slate-600', bgColor: 'bg-slate-100/50', borderColor: 'border-slate-200', dotColor: 'bg-slate-400' },
  IN_PROGRESS: { title: 'EN COURS', color: 'text-indigo-600', bgColor: 'bg-indigo-50/50', borderColor: 'border-indigo-100', dotColor: 'bg-indigo-500' },
  DONE: { title: 'TERMINÉ', color: 'text-emerald-600', bgColor: 'bg-emerald-50/50', borderColor: 'border-emerald-100', dotColor: 'bg-emerald-500' }
};

export default function TasksAndHR({ settings, setSettings }: TasksAndHRProps) {
  const [view, setView] = useState<'board' | 'directory'>('board');
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state for the new task form
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '' });

  // Sync with global settings or fallback to mocks
  const employees = useMemo(() => {
    const list = settings.employees && settings.employees.length > 0 ? settings.employees : MOCK_EMPLOYEES;
    if (!searchTerm) return list;
    return list.filter(e => 
      e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [settings.employees, searchTerm]);

  const tasks = useMemo(() => {
    return settings.tasks && settings.tasks.length > 0 ? settings.tasks : MOCK_TASKS;
  }, [settings.tasks]);

  const employeesById = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => map.set(e.id, e));
    return map;
  }, [employees]);

  const tasksByStatus = useMemo(() => {
    return {
      TODO: tasks.filter(t => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
      DONE: tasks.filter(t => t.status === 'DONE')
    };
  }, [tasks]);

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? {
      ...t,
      status: newStatus,
      completedAt: newStatus === 'DONE' ? new Date().toISOString() : undefined
    } : t);
    
    setSettings(prev => ({ ...prev, tasks: updatedTasks }));
  };

  const createTask = () => {
    if (!form.title.trim() || !form.assignedTo) return;
    const newTask: Task = {
      id: `tsk-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      assignedTo: form.assignedTo,
      assignedBy: 'Admin',
      createdAt: new Date().toISOString(),
      status: 'TODO'
    };
    
    setSettings(prev => ({ ...prev, tasks: [newTask, ...(prev.tasks || (tasks === MOCK_TASKS ? MOCK_TASKS : []))] }));
    setForm({ title: '', description: '', assignedTo: '' });
    setShowNewTask(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#fafafa]">
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Management & RH</h1>
            <p className="text-slate-500 mt-1">Gérez vos équipes, assignez des tâches et suivez l'historique de performance.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setView('board')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'board' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Trello className="w-4 h-4" /> Board
            </button>
            <button 
              onClick={() => setView('directory')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'directory' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users className="w-4 h-4" /> Annuaire
            </button>
          </div>
        </div>

        {/* TOP TOOLS */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher un employé ou une tâche..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none"
            />
          </div>
          
          <button 
            onClick={() => setShowNewTask(true)} 
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nouvelle Tâche
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <AnimatePresence mode="wait">
          {view === 'board' ? (
            <motion.div 
              key="board"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-full"
            >
              {(Object.keys(COLUMN_META) as TaskStatus[]).map(status => (
                <div key={status} className="flex flex-col h-full min-h-[500px]">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${COLUMN_META[status].dotColor}`} />
                      <h3 className={`text-sm font-black tracking-widest ${COLUMN_META[status].color}`}>
                        {COLUMN_META[status].title}
                      </h3>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {tasksByStatus[status].length}
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                  </div>

                  <div className={`flex-1 rounded-2xl border-2 border-dashed p-4 transition-colors ${COLUMN_META[status].bgColor} ${COLUMN_META[status].borderColor}`}>
                    <div className="space-y-4">
                      {tasksByStatus[status].map(task => {
                        const emp = employeesById.get(task.assignedTo);
                        return (
                          <motion.div
                            key={task.id}
                            layoutId={task.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                {task.title}
                              </h4>
                              <button className="text-slate-300 group-hover:text-slate-500 transition-colors">
                                <LayoutGrid className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                              {task.description || 'Aucune description fournie.'}
                            </p>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                              <div 
                                className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded-lg transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (emp) setSelectedEmployee(emp);
                                }}
                              >
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600">
                                  {emp?.fullName.charAt(0)}
                                </div>
                                <span className="text-[11px] font-bold text-slate-600">{emp?.fullName || 'Inconnu'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Status actions for quick move (simulated drag) */}
                            <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {status !== 'TODO' && (
                                <button 
                                  onClick={() => handleStatusChange(task.id, 'TODO')}
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50"
                                >
                                  À FAIRE
                                </button>
                              )}
                              {status !== 'IN_PROGRESS' && (
                                <button 
                                  onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded border border-indigo-100 text-indigo-400 hover:bg-indigo-50"
                                >
                                  EN COURS
                                </button>
                              )}
                              {status !== 'DONE' && (
                                <button 
                                  onClick={() => handleStatusChange(task.id, 'DONE')}
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-100 text-emerald-400 hover:bg-emerald-50"
                                >
                                  TERMINÉ
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                      {tasksByStatus[status].length === 0 && (
                        <div className="h-24 flex flex-col items-center justify-center text-slate-400 border border-slate-200 border-dashed rounded-xl">
                          <CheckCircle2 className="w-5 h-5 opacity-30 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Vide</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="directory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
            >
              {employees.map(emp => (
                <motion.div
                  key={emp.id}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-100">
                      {emp.fullName.charAt(0)}
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${emp.isActive ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-slate-400 border-slate-100 bg-slate-50'}`}>
                      {emp.isActive ? 'ACTIF' : 'INACTIF'}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-800 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                    {emp.fullName}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">
                    {emp.role} {emp.chaineId ? `• ${emp.chaineId}` : ''}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      {emp.phoneNumber}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      Dernier accès: Hier
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedEmployee(emp)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-xs font-black hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all group/btn"
                  >
                    Voir le profil <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              ))}
              
              {/* Add Employee Empty Card */}
              <button 
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-5 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-slate-400 hover:text-indigo-500 group"
              >
                <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center group-hover:border-indigo-300 group-hover:bg-white transition-all">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">Nouvel Employé</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODALS */}
      <EmployeeProfile 
        employee={selectedEmployee} 
        tasks={tasks} 
        onClose={() => setSelectedEmployee(null)} 
      />

      <AnimatePresence>
        {showNewTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Nouvelle Mission</h3>
                <p className="text-sm text-slate-500">Assignez une tâche claire à un membre de l'équipe.</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Titre de la tâche</label>
                  <input 
                    value={form.title} 
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))} 
                    placeholder="Ex: Contrôle qualité, Maintenance..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description / Instructions</label>
                  <textarea 
                    value={form.description} 
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
                    placeholder="Détaillez les attentes..." 
                    className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 resize-none" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assigner à</label>
                  <select 
                    value={form.assignedTo} 
                    onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_16px_center] bg-no-repeat"
                  >
                    <option value="">Sélectionner un employé...</option>
                    {employees.filter(e => e.isActive).map(e => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button 
                  onClick={() => setShowNewTask(false)} 
                  className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:bg-white hover:text-slate-800 transition-all border border-transparent hover:border-slate-200"
                >
                  Annuler
                </button>
                <button 
                  onClick={createTask} 
                  disabled={!form.title.trim() || !form.assignedTo}
                  className="px-8 py-2.5 rounded-xl text-sm font-black bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                >
                  Créer la tâche
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
