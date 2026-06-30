import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, CheckCircle2, Circle, Trophy } from 'lucide-react';
import { StoryProgress, Quest, QuestStatus } from '../types';
import { STORY_DATA } from '../data/storyData';

interface StoryUIProps {
  progress: StoryProgress;
  language: 'ar' | 'en';
  onClose?: () => void;
}

export const Journal: React.FC<StoryUIProps> = ({ progress, language, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'active' | 'completed' | 'achievements'>('active');

  const getQuestById = (id: string): Quest | undefined => {
    for (const chapter of STORY_DATA) {
      const q = chapter.quests.find(quest => quest.id === id);
      if (q) return q;
    }
    return undefined;
  };

  const activeQuest = progress.activeQuestId ? getQuestById(progress.activeQuestId) : null;
  const completedQuests = progress.completedQuests.map(id => getQuestById(id)).filter(q => !!q) as Quest[];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[70vh]">
        {/* Header */}
        <div className="bg-[#222] p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Book className="text-yellow-500" size={24} />
            <h2 className="text-xl font-bold text-white tracking-tight">
              {language === 'ar' ? 'سجل المهام والقصة' : 'Mission Journal'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-[#1e1e1e]">
          {(['active', 'completed', 'achievements'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-all ${
                activeTab === tab ? 'text-yellow-500 bg-white/5 border-b-2 border-yellow-500' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab === 'active' ? (language === 'ar' ? 'المهام الحالية' : 'Active') :
               tab === 'completed' ? (language === 'ar' ? 'المهام المكتملة' : 'Completed') :
               (language === 'ar' ? 'الإنجازات' : 'Achievements')}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'active' && (
            <div className="space-y-4">
              {activeQuest ? (
                <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                  <h3 className="text-lg font-bold text-yellow-500 mb-2">
                    {language === 'ar' ? activeQuest.titleAr : activeQuest.title}
                  </h3>
                  <p className="text-white/60 text-sm mb-4">
                    {language === 'ar' ? activeQuest.descriptionAr : activeQuest.description}
                  </p>
                  
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">
                      {language === 'ar' ? 'الأهداف' : 'Objectives'}
                    </h4>
                    {activeQuest.objectives.map((obj) => (
                      <div key={obj.id} className="flex items-center gap-3">
                        {obj.isCompleted ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <Circle size={16} className="text-white/20" />
                        )}
                        <span className={`text-sm ${obj.isCompleted ? 'text-white/40 line-through' : 'text-white'}`}>
                          {language === 'ar' ? obj.descriptionAr : obj.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-white/20">
                  {language === 'ar' ? 'لا توجد مهام نشطة حالياً' : 'No active quests'}
                </div>
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div className="space-y-3">
              {completedQuests.map((q) => (
                <div key={q.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center opacity-60">
                  <div>
                    <h3 className="font-bold text-white">{language === 'ar' ? q.titleAr : q.title}</h3>
                    <p className="text-xs text-white/40">{language === 'ar' ? 'تم الإكمال' : 'Completed'}</p>
                  </div>
                  <CheckCircle2 size={20} className="text-green-500" />
                </div>
              ))}
              {completedQuests.length === 0 && (
                <div className="text-center py-12 text-white/20">
                  {language === 'ar' ? 'لم تكمل أي مهام بعد' : 'No quests completed yet'}
                </div>
              )}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="grid grid-cols-2 gap-4">
              {progress.achievements.length > 0 ? progress.achievements.map((id) => (
                <div key={id} className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                  <Trophy size={24} className="text-yellow-500" />
                  <span className="text-sm font-bold text-white">{id}</span>
                </div>
              )) : (
                 <div className="col-span-2 text-center py-12 text-white/20">
                  {language === 'ar' ? 'لم تفتح أي إنجازات بعد' : 'No achievements unlocked yet'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface CutsceneOverlayProps {
  active: boolean;
  text?: string;
  textAr?: string;
  language: 'ar' | 'en';
}

export const CutsceneOverlay: React.FC<CutsceneOverlayProps> = ({ active, text, textAr, language }) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] pointer-events-none"
        >
          {/* Black Bars */}
          <div className="absolute top-0 left-0 w-full h-[15vh] bg-black" />
          <div className="absolute bottom-0 left-0 w-full h-[15vh] bg-black" />
          
          {/* Text Overlay */}
          <div className="absolute bottom-[20vh] left-0 w-full px-12 text-center">
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white text-xl md:text-2xl font-medium tracking-tight drop-shadow-lg"
              style={{ fontFamily: language === 'ar' ? 'Inter, sans-serif' : 'Inter, sans-serif' }}
            >
              {language === 'ar' ? textAr : text}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
