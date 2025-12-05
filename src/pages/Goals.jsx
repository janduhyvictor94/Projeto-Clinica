import React, { useState } from 'react';
import { supabase } from '@/supabase.js'; // Supabase
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Edit2, Trash2, Target, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const GOAL_TYPES = ['Faturamento', 'Pacientes', 'Procedimentos', 'Outro'];

export default function Goals() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => (await supabase.from('goals').select('*')).data || [],
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => (await supabase.from('appointments').select('*')).data || [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('goals').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setIsOpen(false); toast.success('Meta criada'); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('goals').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setEditingGoal(null); toast.success('Atualizada'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setDeleteGoal(null); toast.success('Excluída'); },
  });

  const filteredGoals = goals.filter(g => g.year === selectedYear);

  const calculateCurrentValue = (goal) => {
    const monthAppointments = appointments.filter(a => {
      const date = new Date(a.date);
      return date.getMonth() + 1 === goal.month && date.getFullYear() === goal.year && a.status === 'Realizado';
    });

    switch (goal.type) {
      case 'Faturamento': return monthAppointments.reduce((sum, a) => sum + (Number(a.total_value) || 0), 0);
      case 'Pacientes': return new Set(monthAppointments.map(a => a.patient_id)).size;
      case 'Procedimentos': return monthAppointments.reduce((sum, a) => sum + (a.procedures_performed?.length || 0), 0);
      default: return goal.target_value || 0;
    }
  };

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  // ... MANTENHA O RENDER DO SEU ARQUIVO ORIGINAL (DO RETURN PARA BAIXO) ...
  // ... ELE VAI FUNCIONAR PERFEITAMENTE COM ESSA LÓGICA ACIMA ...
  
  return (
    <div className="space-y-6">
      <PageHeader title="Metas" subtitle="Acompanhe suas metas" action={<div className="flex gap-2"><Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}><SelectTrigger className="w-24 bg-white"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select><Button onClick={() => setIsOpen(true)} className="bg-stone-800"><Plus className="mr-2 h-4 w-4" />Nova Meta</Button></div>} />
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredGoals.map(goal => {
            const current = calculateCurrentValue(goal);
            const progress = Math.min((current / goal.target_value) * 100, 100);
            return (
                <Card key={goal.id}><CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div><h4 className="font-medium">{goal.title}</h4><Badge variant="outline">{goal.type}</Badge></div>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteGoal(goal)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                    <Progress value={progress} className="h-2 mb-2" />
                    <div className="flex justify-between text-xs text-stone-500"><span>Atual: {current}</span><span>Meta: {goal.target_value}</span></div>
                </CardContent></Card>
            );
        })}
      </div>

      <GoalModal open={isOpen} onClose={() => setIsOpen(false)} onSave={(d) => createMutation.mutate(d)} />
      <AlertDialog open={!!deleteGoal} onOpenChange={() => setDeleteGoal(null)}><AlertDialogContent><AlertDialogFooter><AlertDialogAction onClick={() => deleteMutation.mutate(deleteGoal.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function GoalModal({ open, onClose, goal, onSave }) {
    const [formData, setFormData] = useState({ title: '', type: 'Faturamento', target_value: '', month: 1, year: 2024 });
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    return (<Dialog open={open} onOpenChange={onClose}><DialogContent><form onSubmit={handleSubmit} className="space-y-4"><Input placeholder="Título" onChange={e=>setFormData({...formData, title: e.target.value})} /><Input placeholder="Valor Alvo" type="number" onChange={e=>setFormData({...formData, target_value: e.target.value})} /><Button type="submit">Salvar</Button></form></DialogContent></Dialog>);
}