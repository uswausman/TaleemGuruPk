import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GraduationCap } from 'lucide-react';
import { addStaffAssignmentApi, deleteStaffAssignmentApi, fetchStaffAssignmentsApi } from '../../lib/api';

interface Assignment {
  id: number;
  role: string;
  board: string;
  classLevel: string;
  subject: string;
}

export const StaffAcademicAssignments: React.FC<{ userUid: string }> = ({ userUid }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffAssignmentsApi(userUid).then((data) => {
      setAssignments(data);
      setLoading(false);
    });
  }, [userUid]);

  const handleAdd = async () => {
    // Basic implementation for demonstration - in production, this would open a modal
    const board = prompt('Board (e.g. Punjab, All)');
    const classLevel = prompt('Class (e.g. Class 9, All)');
    const subject = prompt('Subject (e.g. Physics, All)');
    
    if (board && classLevel && subject) {
      const created = await addStaffAssignmentApi({ userUid, role: 'Teacher', board, classLevel, subject });
      if (created) {
        setAssignments([...assignments, created]);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (await deleteStaffAssignmentApi(id)) {
      setAssignments(assignments.filter(a => a.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="w-4 h-4" /> Academic Assignments
        </h4>
        <button onClick={handleAdd} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {assignments.map(a => (
          <div key={a.id} className="text-xs p-2 bg-slate-50 border rounded flex items-center justify-between">
            <span>{a.subject} ({a.classLevel}, {a.board})</span>
            <button onClick={() => handleDelete(a.id)} className="text-red-500"><Trash2 className="w-3 h-3"/></button>
          </div>
        ))}
      </div>
    </div>
  );
};
