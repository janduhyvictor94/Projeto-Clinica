import React, { useState } from 'react';
import { supabase } from '@/supabase.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Target, Trophy, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";

export default function Goals() {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: async () => (await supabase.from('goals').select('*')).data || [] });
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: async () => (await supabase.from('appointments').select('*')).data || [] });

  const createMutation = useMutation({ mutationFn: async (data) => { await supabase.from('goals').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setIsOpen(false); toast.success('Meta definida!'); } });
  const deleteMutation = useMutation({ mutationFn: async (id) => { await supabase.from('goals').delete().eq('id', id); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setDeleteGoal(null); toast.success('Meta removida.'); } });

  const calculateCurrent = (goal) => {
    const apps = appointments.filter(a => { const d = new Date(a.date); return d.getMonth() + 1 === goal.month && d.getFullYear() === goal.year && a.status === 'Realizado'; });
    if (goal.type === 'Faturamento') return apps.reduce((sum, a) => sum + (Number(a.final_value) || 0), 0);
    if (goal.type === 'Pacientes') return new Set(apps.map(a => a.patient_id)).size;
    return 0;
  };

  const filteredGoals = goals.filter(g => g.year === selectedYear);
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="space-y-6">
      <PageHeader title="Metas e Objetivos" subtitle="Acompanhe o desempenho da sua clínica" action={<div className="flex gap-2"><Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}><SelectTrigger className="w-28 bg-white"><SelectValue /></SelectTrigger><SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select><Button onClick={() => setIsOpen(true)} className="bg-stone-800 hover:bg-stone-900 shadow-sm"><Plus className="mr-2 h-4 w-4" />Nova Meta</Button></div>} />
      
      {filteredGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200">
            <Trophy className="w-12 h-12 text-stone-300 mb-4" />
            <p className="text-stone-500 font-medium">Nenhuma meta definida para {selectedYear}</p>
            <p className="text-stone-400 text-sm">Crie uma meta para começar a acompanhar.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredGoals.map(goal => {
                const current = calculateCurrent(goal);
                const progress = Math.min((current / goal.target_value) * 100, 100);
                const isMoney = goal.type === 'Faturamento';
                return (
                    <Card key={goal.id} className="hover:shadow-lg transition-all border-stone-100 relative overflow-hidden group">
                        <div className={`absolute top-0 left-0 w-1 h-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-stone-800'}`} />
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3 items-center"><div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100"><Target className="w-5 h-5 text-stone-700" /></div><div><h4 className="font-bold text-stone-800 text-lg">{goal.title}</h4><div className="flex items-center gap-1 text-xs text-stone-500"><Calendar className="w-3 h-3" /> {months[goal.month - 1]}</div></div></div>
                                <Button size="icon" variant="ghost" className="text-stone-300 hover:text-rose-500 transition-colors" onClick={() => setDeleteGoal(goal)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                            <div className="flex justify-between items-end mb-2">
                                <div><p className="text-sm text-stone-500 font-medium mb-1">Progresso</p><p className="text-2xl font-light text-stone-800">{progress.toFixed(0)}%</p></div>
                                <div className="text-right"><p className="text-xs text-stone-400">Meta</p><p className="text-sm font-bold text-stone-700">{isMoney ? `R$ ${goal.target_value}` : goal.target_value}</p></div>
                            </div>
                            <Progress value={progress} className="h-3 bg-stone-100" indicatorClassName={progress >= 100 ? 'bg-emerald-500' : 'bg-stone-800'} />
                            <div className="mt-4 pt-3 border-t border-stone-50 flex justify-between text-sm">
                                <span className="text-stone-500">Atual</span>
                                <span className={`font-semibold ${progress >= 100 ? 'text-emerald-600' : 'text-stone-800'}`}>{isMoney ? Number(current).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : current}</span>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
      )}

      <GoalModal open={isOpen} onClose={() => setIsOpen(false)} onSave={(d) => createMutation.mutate(d)} />
      <AlertDialog open={!!deleteGoal} onOpenChange={() => setDeleteGoal(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Meta</AlertDialogTitle><AlertDialogDescription>Deseja remover esta meta? O histórico não será afetado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteGoal.id)} className="bg-rose-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function GoalModal({ open, onClose, onSave }) {
    const [data, setData] = useState({ title: '', type: 'Faturamento', target_value: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    return (<Dialog open={open} onOpenChange={onClose}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Definir Nova Meta</DialogTitle></DialogHeader><form onSubmit={e=>{e.preventDefault(); onSave(data)}} className="space-y-4 pt-4"><div><Label>Título da Meta</Label><Input placeholder="Ex: Faturamento Março" onChange={e=>setData({...data, title: e.target.value})} required /></div><div className="grid grid-cols-2 gap-4"><div><Label>Tipo</Label><Select onValueChange={v=>setData({...data, type: v})} defaultValue="Faturamento"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Faturamento">Faturamento</SelectItem><SelectItem value="Pacientes">Nº Pacientes</SelectItem></SelectContent></Select></div><div><Label>Mês Alvo</Label><Select onValueChange={v=>setData({...data, month: parseInt(v)})} defaultValue={(new Date().getMonth() + 1).toString()}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({length: 12}, (_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</SelectItem>)}</SelectContent></Select></div></div><div><Label>Valor Alvo</Label><Input type="number" placeholder="Ex: 50000" onChange={e=>setData({...data, target_value: e.target.value})} required /></div><div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800 hover:bg-stone-900">Salvar Meta</Button></div></form></DialogContent></Dialog>);
}