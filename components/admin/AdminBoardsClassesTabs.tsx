import React, { useState } from 'react';
import { Layers, Plus, Search, Trash2, Edit } from 'lucide-react';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AdminBoardsClassesTabsProps {
  boards: any[];
  classes: any[];
  subjects: any[];
  chapters: any[];
  onAddBoard: (name: string) => void;
  onUpdateBoard: (id: number, name: string) => void;
  onDeleteBoard: (id: number) => void;
  onAddClass: (boardId: number, name: string) => void;
  onUpdateClass: (id: number, name: string) => void;
  onDeleteClass: (id: number) => void;
  onAddSubject: (classId: number, name: string) => void;
  onUpdateSubject: (id: number, name: string) => void;
  onDeleteSubject: (id: number) => void;
}

export const AdminBoardsClassesTabs: React.FC<AdminBoardsClassesTabsProps> = ({
  boards, classes, subjects, chapters,
  onAddBoard, onUpdateBoard, onDeleteBoard,
  onAddClass, onUpdateClass, onDeleteClass,
  onAddSubject, onUpdateSubject, onDeleteSubject
}) => {
  const [activeTab, setActiveTab] = useState<'boards' | 'classes' | 'subjects'>('boards');

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setActiveTab('boards')} className={`py-2 px-4 ${activeTab === 'boards' ? 'border-b-2 border-slate-900 dark:border-white font-bold' : ''}`}>Boards</button>
        <button onClick={() => setActiveTab('classes')} className={`py-2 px-4 ${activeTab === 'classes' ? 'border-b-2 border-slate-900 dark:border-white font-bold' : ''}`}>Classes</button>
        <button onClick={() => setActiveTab('subjects')} className={`py-2 px-4 ${activeTab === 'subjects' ? 'border-b-2 border-slate-900 dark:border-white font-bold' : ''}`}>Subjects</button>
      </div>

      {activeTab === 'boards' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Boards Management</h3>
          {boards.map(b => (
            <div key={b.id} className="p-4 border rounded-xl flex justify-between items-center">
              <span>{b.name}</span>
              <div className="flex gap-2">
                <button onClick={() => onUpdateBoard(b.id, prompt('New name:', b.name) || b.name)} className="p-2 hover:bg-slate-100 rounded-lg"><Edit size={16}/></button>
                <button onClick={() => onDeleteBoard(b.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
          <button onClick={() => onAddBoard(prompt('Board name:') || '')} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg"><Plus size={16}/> Add Board</button>
        </div>
      )}
      {/* Implement Classes and Subjects similar to boards */}
    </div>
  );
};
