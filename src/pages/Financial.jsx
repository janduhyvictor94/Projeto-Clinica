import React, { useState } from 'react';
import { supabase } from '@/supabase.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, CreditCard, CheckCircle2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const EXPENSE_CATEGORIES = ['Aluguel', 'Energia', 'Água', 'Internet', 'Telefone', 'Materiais', 'Equipamentos', 'Marketing', 'Funcionários', 'Impostos', 'Outros'];

export default function Financial() {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [filterType, setFilterType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  // Queries
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: async () => (await supabase.from('expenses').select('*').order('due_date', { ascending: false })).data || [] });
  const { data: installments = [] } = useQuery({ queryKey: ['installments'], queryFn: async () => (await supabase.from('installments').select('*').order('due_date', { ascending: true })).data || [] });
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: async () => (await supabase.from('appointments').select('*')).data || [] });

  const createMutation = useMutation({
    mutationFn: async (data) => { const { error } = await supabase.from('expenses').insert([data]); if(error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setIsOpen(false); toast.success('Despesa registrada'); }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }) => { const { error } = await supabase.from('expenses').update(data).eq('id', id); if(error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Atualizado'); }
  });

  const updateInstallmentMutation = useMutation({
    mutationFn: async ({ id, data }) => { const { error } = await supabase.from('installments').update(data).eq('id', id); if(error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['installments'] }); toast.success('Atualizado'); }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { const { error } = await supabase.from('expenses').delete().eq('id', id); if(error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setDeleteExpense(null); toast.success('Excluído'); }
  });

  const togglePaid = (e) => updateExpenseMutation.mutate({ id: e.id, data: { is_paid: !e.is_paid, payment_date: !e.is_paid ? format(new Date(), 'yyyy-MM-dd') : null } });
  const toggleReceived = (i) => updateInstallmentMutation.mutate({ id: i.id, data: { is_received: !i.is_received, received_date: !i.is_received ? format(new Date(), 'yyyy-MM-dd') : null } });

  const getDateRange = () => {
    if (filterType === 'month') return { start: startOfMonth(new Date(selectedYear, selectedMonth)), end: endOfMonth(new Date(selectedYear, selectedMonth)) };
    if (filterType === 'year') return { start: startOfYear(new Date(selectedYear, 0)), end: endOfYear(new Date(selectedYear, 0)) };
    return { start: new Date(0), end: new Date() };
  };
  const { start, end } = getDateRange();

  const filteredExpenses = expenses.filter(e => isWithinInterval(new Date(e.due_date + 'T12:00:00'), { start, end }));
  const filteredInstallments = installments.filter(i => isWithinInterval(new Date(i.due_date + 'T12:00:00'), { start, end }));
  
  const revenue = filteredInstallments.filter(i => i.is_received).reduce((acc, i) => acc + (Number(i.value) || 0), 0) + 
                  appointments.filter(a => isWithinInterval(new Date(a.date + 'T12:00:00'), { start, end }) && a.payment_method !== 'Cartão Crédito').reduce((acc, a) => acc + (Number(a.final_value) || 0), 0);
  
  const expenseTotal = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const pendingReceivables = filteredInstallments.filter(i => !i.is_received).reduce((acc, i) => acc + (Number(i.value) || 0), 0);

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData = months.map((m, i) => {
    const mStart = startOfMonth(new Date(selectedYear, i)); const mEnd = endOfMonth(new Date(selectedYear, i));
    const mRev = installments.filter(it => isWithinInterval(new Date(it.due_date+'T12:00:00'), {start: mStart, end: mEnd}) && it.is_received).reduce((acc, v) => acc + Number(v.value), 0);
    const mExp = expenses.filter(ex => isWithinInterval(new Date(ex.due_date+'T12:00:00'), {start: mStart, end: mEnd})).reduce((acc, v) => acc + Number(v.amount), 0);
    return { name: m, faturamento: mRev, despesas: mExp };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Fluxo de caixa" action={<Button onClick={() => setIsOpen(true)} className="bg-stone-800"><Plus className="mr-2 h-4 w-4" /> Nova Despesa</Button>} />
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Faturamento (Real)" value={`R$ ${revenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon={DollarSign} />
        <StatCard title="A Receber" value={`R$ ${pendingReceivables.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon={CreditCard} />
        <StatCard title="Despesas" value={`R$ ${expenseTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon={TrendingDown} />
        <StatCard title="Saldo" value={`R$ ${(revenue - expenseTotal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon={TrendingUp} className={revenue - expenseTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
      </div>

      <div className="bg-white p-4 rounded-xl border border-stone-100 flex gap-4 items-center">
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">Mês</SelectItem><SelectItem value="year">Ano</SelectItem></SelectContent></Select>
        {filterType === 'month' && <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent></Select>}
        <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList><TabsTrigger value="overview">Visão Geral</TabsTrigger><TabsTrigger value="receivables">A Receber</TabsTrigger><TabsTrigger value="expenses">Despesas</TabsTrigger></TabsList>
        <TabsContent value="overview" className="mt-4">
          <Card><CardContent className="h-80 pt-6"><ResponsiveContainer><BarChart data={chartData}><XAxis dataKey="name" /><Tooltip /><Legend /><Bar dataKey="faturamento" fill="#10b981" name="Receita" /><Bar dataKey="despesas" fill="#ef4444" name="Despesa" /></BarChart></ResponsiveContainer></CardContent></Card>
        </TabsContent>
        <TabsContent value="receivables" className="space-y-3 mt-4">
          {filteredInstallments.map(i => (
            <Card key={i.id}><CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost" onClick={() => toggleReceived(i)}><CheckCircle2 className={`w-5 h-5 ${i.is_received ? 'text-emerald-500' : 'text-stone-300'}`} /></Button>
                <div><p className="font-medium text-stone-800">{i.patient_name}</p><p className="text-sm text-stone-500">{i.installment_number}/{i.total_installments} - Vence: {format(new Date(i.due_date), 'dd/MM/yyyy')}</p></div>
              </div>
              <span className="font-bold text-stone-700">R$ {Number(i.value).toFixed(2)}</span>
            </CardContent></Card>
          ))}
          {filteredInstallments.length === 0 && <p className="text-center text-stone-400 py-8">Nada a receber neste período.</p>}
        </TabsContent>
        <TabsContent value="expenses" className="space-y-3 mt-4">
          {filteredExpenses.map(e => (
            <Card key={e.id}><CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost" onClick={() => togglePaid(e)}><CheckCircle2 className={`w-5 h-5 ${e.is_paid ? 'text-emerald-500' : 'text-stone-300'}`} /></Button>
                <div><p className="font-medium text-stone-800">{e.description}</p><p className="text-sm text-stone-500">{e.category} - Vence: {format(new Date(e.due_date), 'dd/MM/yyyy')}</p></div>
              </div>
              <div className="flex items-center gap-4"><span className="font-bold text-stone-700">R$ {Number(e.amount).toFixed(2)}</span><Trash2 className="w-4 h-4 text-rose-400 cursor-pointer" onClick={() => setDeleteExpense(e)} /></div>
            </CardContent></Card>
          ))}
          {filteredExpenses.length === 0 && <p className="text-center text-stone-400 py-8">Nenhuma despesa neste período.</p>}
        </TabsContent>
      </Tabs>

      <ExpenseModal open={isOpen} onClose={() => setIsOpen(false)} onSave={(d) => createMutation.mutate(d)} />
      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}><AlertDialogContent><AlertDialogFooter><AlertDialogAction onClick={() => deleteMutation.mutate(deleteExpense.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function ExpenseModal({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({ description: '', category: '', amount: '', due_date: format(new Date(), 'yyyy-MM-dd'), is_paid: false });
  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="space-y-4">
        <Input placeholder="Descrição" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
        <div className="grid grid-cols-2 gap-4">
          <Select onValueChange={v => setFormData({...formData, category: v})}><SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          <Input type="number" placeholder="Valor" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
        </div>
        <Input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} required />
        <div className="flex items-center gap-2"><Checkbox checked={formData.is_paid} onCheckedChange={v => setFormData({...formData, is_paid: v})} /><Label>Pago</Label></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800">Salvar</Button></div>
      </form>
    </DialogContent></Dialog>
  );
}