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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Goals() {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: async () => (await supabase.from('goals').select('*')).data || [] });
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: async () => (await supabase.from('appointments').select('*')).data || [] });

  const createMutation = useMutation({ mutationFn: async (data) => { await supabase.from('goals').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setIsOpen(false); toast.success('Meta criada'); } });
  const deleteMutation = useMutation({ mutationFn: async (id) => { await supabase.from('goals').delete().eq('id', id); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setDeleteGoal(null); toast.success('Excluída'); } });

  const calculateCurrent = (goal) => {
    const apps = appointments.filter(a => { const d = new Date(a.date); return d.getMonth() + 1 === goal.month && d.getFullYear() === goal.year && a.status === 'Realizado'; });
    if (goal.type === 'Faturamento') return apps.reduce((sum, a) => sum + (Number(a.final_value) || 0), 0);
    if (goal.type === 'Pacientes') return new Set(apps.map(a => a.patient_id)).size;
    return goal.target_value;
  };

  const filteredGoals = goals.filter(g => g.year === selectedYear);
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="space-y-6">
      <PageHeader title="Metas" subtitle="Defina e acompanhe seus objetivos" action={<div className="flex gap-2"><Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}><SelectTrigger className="w-24 bg-white"><SelectValue /></SelectTrigger><SelectContent>{[2024, 2025].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select><Button onClick={() => setIsOpen(true)} className="bg-stone-800 hover:bg-stone-900"><Plus className="mr-2 h-4 w-4" />Nova Meta</Button></div>} />
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredGoals.map(goal => {
            const current = calculateCurrent(goal);
            const progress = Math.min((current / goal.target_value) * 100, 100);
            return (
                <Card key={goal.id} className="hover:shadow-md transition-shadow border-stone-100"><CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3 items-center"><div className="p-2 bg-stone-100 rounded-lg"><Target className="w-5 h-5 text-stone-600" /></div><div><h4 className="font-bold text-stone-800">{goal.title}</h4><p className="text-xs text-stone-500">{months[goal.month - 1]}</p></div></div>
                        <Button size="icon" variant="ghost" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => setDeleteGoal(goal)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="mb-2 flex justify-between text-sm font-medium"><span className="text-stone-600">Progresso</span><span className="text-stone-900">{progress.toFixed(0)}%</span></div>
                    <Progress value={progress} className="h-2 mb-4 bg-stone-100" />
                    <div className="flex justify-between text-sm text-stone-500 pt-4 border-t border-stone-50"><span>Atual: <strong className="text-stone-800">{current}</strong></span><span>Alvo: <strong className="text-stone-800">{goal.target_value}</strong></span></div>
                </CardContent></Card>
            );
        })}
      </div>
      <GoalModal open={isOpen} onClose={() => setIsOpen(false)} onSave={(d) => createMutation.mutate(d)} />
      <AlertDialog open={!!deleteGoal} onOpenChange={() => setDeleteGoal(null)}><AlertDialogContent><AlertDialogFooter><AlertDialogAction onClick={() => deleteMutation.mutate(deleteGoal.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function GoalModal({ open, onClose, onSave }) {
    const [data, setData] = useState({ title: '', type: 'Faturamento', target_value: '', month: 1, year: 2024 });
    return (<Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Nova Meta</DialogTitle></DialogHeader><form onSubmit={e=>{e.preventDefault(); onSave(data)}} className="space-y-4 pt-4"><div><Label>Título</Label><Input onChange={e=>setData({...data, title: e.target.value})} required className="mt-1" /></div><div className="grid grid-cols-2 gap-4"><div><Label>Tipo</Label><Select onValueChange={v=>setData({...data, type: v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Faturamento">Faturamento</SelectItem><SelectItem value="Pacientes">Pacientes</SelectItem></SelectContent></Select></div><div><Label>Alvo</Label><Input type="number" onChange={e=>setData({...data, target_value: e.target.value})} required className="mt-1" /></div></div><div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800">Salvar</Button></div></form></DialogContent></Dialog>);
}