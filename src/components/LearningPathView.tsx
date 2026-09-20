import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckCircle, Circle, Lock, Award, FileText } from 'lucide-react';
import { LearningPath } from '../types';

interface LearningPathViewProps {
  path: LearningPath;
}

export const LearningPathView: React.FC<LearningPathViewProps> = ({ path }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{path.title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{path.description}</p>
      
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
        
        <div className="space-y-6">
          {path.steps.map((step, index) => (
            <motion.div 
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-start gap-4"
            >
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10
                ${step.status === 'Completed' ? 'bg-emerald-500' : 
                  step.status === 'InProgress' ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}
                text-white transition-colors duration-300
              `}>
                {step.status === 'Completed' ? <CheckCircle className="w-6 h-6" /> :
                 step.status === 'InProgress' ? <div className="w-3 h-3 rounded-full bg-white animate-pulse" /> :
                 <Lock className="w-5 h-5 text-slate-400" />}
              </div>
              
              <div className={`flex-1 p-4 rounded-xl border ${step.status === 'InProgress' ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800'}`}>
                <div className="flex items-center gap-2 mb-1">
                   {step.type === 'Study' && <BookOpen className="w-4 h-4 text-slate-400" />}
                   {step.type === 'Quiz' && <CheckCircle className="w-4 h-4 text-slate-400" />}
                   {step.type === 'PastPaper' && <FileText className="w-4 h-4 text-slate-400" />}
                   {step.type === 'Review' && <Award className="w-4 h-4 text-slate-400" />}
                  <h4 className="font-bold text-slate-900 dark:text-white">{step.title}</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
