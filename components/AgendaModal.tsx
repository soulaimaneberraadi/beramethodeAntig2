import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Info } from 'lucide-react';
import { AppSettings } from '../types';

interface AgendaModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    lang: 'fr' | 'ar';
}

const TRANSLATIONS = {
    fr: {
        title: 'Agenda du Mois',
        close: 'Fermer',
        prev: 'Mois Précédent',
        next: 'Mois Suivant',
        workingDay: 'Jour Ouvrable',
        holiday: 'Jour Férié',
        exceptionalWork: 'Travail Exceptionnel',
        save: 'Enregistrer Exception',
        remove: 'Supprimer',
        notePlaceholder: 'Nom de l\'exception (ex: Aïd, Panne...)',
        days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
        details: 'Détails du jour',
        selectPrompt: 'Sélectionnez un jour dans le calendrier pour le configurer.',
        selectedDate: 'Date sélectionnée',
        status: 'Statut de production',
        work: 'Travail',
        off: 'Férié / Repos',
        note: 'Note / Raison',
        reset: 'Rétablir par défaut'
    },
    ar: {
        title: 'أجندة الشهر',
        close: 'إغلاق',
        prev: 'الشهر السابق',
        next: 'الشهر التالي',
        workingDay: 'يوم عمل',
        holiday: 'يوم عطلة',
        exceptionalWork: 'عمل استثنائي',
        save: 'حفظ',
        remove: 'حذف',
        notePlaceholder: 'اسم العطلة أو السبب...',
        days: ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
        months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
        details: 'تفاصيل اليوم',
        selectPrompt: 'اختر يوماً من التقويم لإعداده.',
        selectedDate: 'اليوم المحدد',
        status: 'حالة اليوم',
        work: 'عمل',
        off: 'عطلة / توقف',
        note: 'ملاحظة / السبب',
        reset: 'إعادة للحالة الافتراضية'
    }
};

export default function AgendaModal({ isOpen, onClose, settings, setSettings, lang }: AgendaModalProps) {
    if (!isOpen) return null;
    const t = TRANSLATIONS[lang];

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [isWorking, setIsWorking] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay() - 1;
    if (firstDay === -1) firstDay = 6;

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleDayClick = (dayStr: string) => {
        setSelectedDate(dayStr);
        const existing = settings.calendarExceptions?.[dayStr];
        if (existing) {
            setNote(existing.note);
            setIsWorking(existing.isWorking);
        } else {
            setNote('');
            const d = new Date(dayStr);
            let dayOfWeek = d.getDay();
            let isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
            const isDefaultWorking = settings.workingDays.includes(isoDay);
            setIsWorking(isDefaultWorking);
        }
    };

    const handleSaveException = () => {
        if (!selectedDate) return;
        setSettings(prev => ({
            ...prev,
            calendarExceptions: {
                ...(prev.calendarExceptions || {}),
                [selectedDate]: { isWorking, note }
            }
        }));
        setSelectedDate(null);
    };

    const handleRemoveException = () => {
        if (!selectedDate) return;
        setSettings(prev => {
            const copy = { ...(prev.calendarExceptions || {}) };
            delete copy[selectedDate];
            return { ...prev, calendarExceptions: copy };
        });
        setSelectedDate(null);
    };

    const days = [];
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                {/* Calendar Column */}
                <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-indigo-500" />
                            <h2 className="text-xl font-black text-slate-800">{t.title}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded-xl">
                        <button onClick={handlePrevMonth} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="font-bold text-slate-700">{t.months[month]} {year}</span>
                        <button onClick={handleNextMonth} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                        {t.days.map((d, i) => (
                            <div key={i} className="text-center text-xs font-bold uppercase text-slate-400 py-2">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                        {days.map((day, i) => {
                            if (!day) return <div key={i} className="h-10 md:h-14 bg-slate-50/50 rounded-xl"></div>;

                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = selectedDate === dateStr;

                            const d = new Date(year, month, day);
                            let isoDay = d.getDay() === 0 ? 7 : d.getDay();
                            const isDefaultWorking = settings.workingDays.includes(isoDay);

                            const exception = settings.calendarExceptions?.[dateStr];

                            let bgClass = isDefaultWorking ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-400';
                            let indicator = null;

                            if (exception) {
                                if (exception.isWorking) {
                                    bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-700';
                                    indicator = <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500"></div>;
                                } else {
                                    bgClass = 'bg-rose-50 border-rose-300 text-rose-700';
                                    indicator = <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"></div>;
                                }
                            }

                            if (isSelected) {
                                bgClass += ' ring-2 ring-indigo-500 shadow-md transform scale-105 z-10';
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleDayClick(dateStr)}
                                    className={`relative h-10 md:h-14 rounded-xl border-2 transition-all flex flex-col items-center justify-center font-bold ${bgClass}`}
                                >
                                    {day}
                                    {indicator}
                                    {exception && exception.note && (
                                        <span className="text-[8px] truncate px-1 w-full absolute bottom-0.5 text-inherit opacity-70 block">{exception.note}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Exception Details Column */}
                <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-500" />
                        {t.details}
                    </h3>

                    {!selectedDate ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                            <Calendar className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">{t.selectPrompt}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
                                <span className="block text-xs uppercase font-bold text-slate-400 mb-1">{t.selectedDate}</span>
                                <span className="text-lg font-black text-indigo-700">{selectedDate}</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{t.status}</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                                    <button
                                        onClick={() => setIsWorking(true)}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${isWorking ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-500 hover:text-emerald-600'}`}
                                    >
                                        {t.work}
                                    </button>
                                    <button
                                        onClick={() => setIsWorking(false)}
                                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${!isWorking ? 'bg-rose-500 text-white shadow-md' : 'bg-white text-slate-500 hover:text-rose-600'}`}
                                    >
                                        {t.off}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{t.note}</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder={t.notePlaceholder}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm font-bold text-slate-700 resize-none h-24"
                                />
                            </div>

                            <div className="pt-4 flex flex-col gap-2 mt-auto">
                                <button onClick={handleSaveException} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md shadow-indigo-600/20 active:scale-95">
                                    {t.save}
                                </button>
                                {settings.calendarExceptions?.[selectedDate] && (
                                    <button onClick={handleRemoveException} className="w-full bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3.5 rounded-xl transition-colors active:scale-95">
                                        {t.reset}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
