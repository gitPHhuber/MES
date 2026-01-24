/**
 * DefectComments.tsx
 * 
 * Положить в: src/components/beryll/DefectComments.tsx
 * 
 * Использование: <DefectComments serverId={123} />
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Plus, Trash2, Edit, CheckCircle, Paperclip, Download, RefreshCw, Filter, X, ChevronDown, ChevronUp
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import {
  getServerDefects, createDefect, updateDefect, deleteDefect,
  resolveDefect, uploadDefectFile, downloadDefectFile, deleteDefectFile
} from '../../api/beryll/defectsAndMonitoringAPI';

import type {
  DefectComment, DefectCategory, DefectPriority, DefectStatus
} from '../../types/beryll/defectsAndMonitoring';

import {
  DEFECT_CATEGORY_LABELS, DEFECT_PRIORITY_LABELS, DEFECT_STATUS_LABELS,
  PRIORITY_COLORS, STATUS_COLORS
} from '../../types/beryll/defectsAndMonitoring';

interface Props {
  serverId: number;
}

export const DefectComments: React.FC<Props> = ({ serverId }) => {
  const [comments, setComments] = useState<DefectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<DefectStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<DefectCategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<DefectComment | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolvingComment, setResolvingComment] = useState<DefectComment | null>(null);
  
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState<DefectCategory>('OTHER');
  const [formPriority, setFormPriority] = useState<DefectPriority>('MEDIUM');
  const [formResolution, setFormResolution] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getServerDefects(serverId, {
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        limit: 50
      });
      setComments(result.rows);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [serverId, statusFilter, categoryFilter]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleAdd = async () => {
    if (!formText.trim()) return;
    try {
      setSubmitting(true);
      const newComment = await createDefect(serverId, {
        text: formText.trim(),
        defectCategory: formCategory,
        priority: formPriority
      });
      
      if (formFile) {
        await uploadDefectFile(newComment.id, formFile);
      }
      
      setAddDialogOpen(false);
      resetForm();
      loadComments();
      toast.success('Дефект добавлен');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Ошибка создания');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingComment || !formText.trim()) return;
    try {
      setSubmitting(true);
      await updateDefect(editingComment.id, {
        text: formText.trim(),
        defectCategory: formCategory,
        priority: formPriority
      });
      setEditingComment(null);
      resetForm();
      loadComments();
      toast.success('Сохранено');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!resolvingComment) return;
    try {
      setSubmitting(true);
      await resolveDefect(resolvingComment.id, { resolution: formResolution || undefined });
      setResolveDialogOpen(false);
      setResolvingComment(null);
      setFormResolution('');
      loadComments();
      toast.success('Дефект решён');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить комментарий?')) return;
    try {
      await deleteDefect(id);
      loadComments();
      toast.success('Удалено');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Ошибка');
    }
  };

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    try {
      const blob = await downloadDefectFile(fileId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Ошибка скачивания');
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Удалить файл?')) return;
    try {
      await deleteDefectFile(fileId);
      loadComments();
      toast.success('Файл удалён');
    } catch {
      toast.error('Ошибка');
    }
  };

  const resetForm = () => {
    setFormText('');
    setFormCategory('OTHER');
    setFormPriority('MEDIUM');
    setFormFile(null);
    setFormResolution('');
  };

  const openEdit = (comment: DefectComment) => {
    setEditingComment(comment);
    setFormText(comment.text);
    setFormCategory(comment.defectCategory);
    setFormPriority(comment.priority);
  };

  const openResolve = (comment: DefectComment) => {
    setResolvingComment(comment);
    setFormResolution('');
    setResolveDialogOpen(true);
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpanded(newExpanded);
  };

  const unresolvedCount = comments.filter(c => c.status === 'NEW' || c.status === 'IN_PROGRESS').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-800">Дефекты</h3>
          {unresolvedCount > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{unresolvedCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <Filter size={18} />
          </button>
          <button onClick={loadComments} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setAddDialogOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            <Plus size={16} /> Добавить
          </button>
        </div>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className="flex gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DefectStatus | '')} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg">
            <option value="">Все статусы</option>
            {Object.entries(DEFECT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as DefectCategory | '')} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg">
            <option value="">Все категории</option>
            {Object.entries(DEFECT_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Загрузка */}
      {loading && <div className="h-1 bg-indigo-100 rounded overflow-hidden mb-4"><div className="h-full bg-indigo-500 animate-pulse w-1/2" /></div>}

      {/* Список */}
      {comments.length === 0 && !loading ? (
        <p className="text-center text-slate-400 py-8">Нет комментариев к дефектам</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className={clsx("border rounded-lg p-4 transition-all", comment.status === 'RESOLVED' ? "bg-slate-50 opacity-70" : "bg-white")}>
              {/* Чипы */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: STATUS_COLORS[comment.status] }}>
                  {DEFECT_STATUS_LABELS[comment.status]}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium border" style={{ borderColor: PRIORITY_COLORS[comment.priority], color: PRIORITY_COLORS[comment.priority] }}>
                  {DEFECT_PRIORITY_LABELS[comment.priority]}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium border border-slate-300 text-slate-600">
                  {DEFECT_CATEGORY_LABELS[comment.defectCategory]}
                </span>
                {comment.files && comment.files.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Paperclip size={12} /> {comment.files.length}
                  </span>
                )}
              </div>

              {/* Текст */}
              <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{comment.text}</p>

              {/* Мета */}
              <p className="text-xs text-slate-400 mb-2">
                {comment.author?.name} {comment.author?.surname} • {new Date(comment.createdAt).toLocaleString()}
              </p>

              {/* Файлы */}
              {comment.files && comment.files.length > 0 && (
                <div className={clsx("overflow-hidden transition-all", expanded.has(comment.id) ? "max-h-40" : "max-h-0")}>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {comment.files.map(file => (
                      <span key={file.id} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs">
                        <Paperclip size={12} />
                        <button onClick={() => handleDownloadFile(file.id, file.originalName)} className="hover:underline">{file.originalName}</button>
                        <button onClick={() => handleDeleteFile(file.id)} className="text-red-500 hover:text-red-700 ml-1">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Решение */}
              {comment.resolution && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
                  <strong>Решение:</strong> {comment.resolution}
                </div>
              )}

              {/* Кнопки */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                {comment.files && comment.files.length > 0 && (
                  <button onClick={() => toggleExpand(comment.id)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                    {expanded.has(comment.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
                {comment.status !== 'RESOLVED' && comment.status !== 'WONT_FIX' && (
                  <button onClick={() => openResolve(comment)} className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded" title="Решить">
                    <CheckCircle size={16} />
                  </button>
                )}
                <button onClick={() => openEdit(comment)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="Редактировать">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(comment.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Удалить">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Диалог добавления */}
      <Transition show={addDialogOpen} as={React.Fragment}>
        <Dialog onClose={() => setAddDialogOpen(false)} className="relative z-50">
          <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <Dialog.Title className="text-lg font-semibold mb-4">Новый дефект</Dialog.Title>
                <textarea value={formText} onChange={(e) => setFormText(e.target.value)} placeholder="Описание дефекта..." className="w-full border border-slate-300 rounded-lg p-3 text-sm mb-3 h-24 resize-none" />
                <div className="flex gap-3 mb-3">
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as DefectCategory)} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    {Object.entries(DEFECT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as DefectPriority)} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    {Object.entries(DEFECT_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 mb-4">
                  <Paperclip size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-600">{formFile ? formFile.name : 'Прикрепить файл'}</span>
                  <input type="file" className="hidden" onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
                </label>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setAddDialogOpen(false); resetForm(); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Отмена</button>
                  <button onClick={handleAdd} disabled={!formText.trim() || submitting} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {submitting ? 'Создание...' : 'Создать'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Диалог редактирования */}
      <Transition show={!!editingComment} as={React.Fragment}>
        <Dialog onClose={() => setEditingComment(null)} className="relative z-50">
          <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <Dialog.Title className="text-lg font-semibold mb-4">Редактировать</Dialog.Title>
                <textarea value={formText} onChange={(e) => setFormText(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 text-sm mb-3 h-24 resize-none" />
                <div className="flex gap-3 mb-4">
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as DefectCategory)} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    {Object.entries(DEFECT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as DefectPriority)} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    {Object.entries(DEFECT_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setEditingComment(null); resetForm(); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Отмена</button>
                  <button onClick={handleUpdate} disabled={!formText.trim() || submitting} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {submitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Диалог решения */}
      <Transition show={resolveDialogOpen} as={React.Fragment}>
        <Dialog onClose={() => setResolveDialogOpen(false)} className="relative z-50">
          <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <Dialog.Title className="text-lg font-semibold mb-4">Решить дефект</Dialog.Title>
                <textarea value={formResolution} onChange={(e) => setFormResolution(e.target.value)} placeholder="Описание решения (опционально)" className="w-full border border-slate-300 rounded-lg p-3 text-sm mb-4 h-20 resize-none" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setResolveDialogOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Отмена</button>
                  <button onClick={handleResolve} disabled={submitting} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                    {submitting ? 'Сохранение...' : 'Решено'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default DefectComments;
