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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, Calendar, CheckCircle2, CreditCard } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const EXPENSE_CATEGORIES = ['Aluguel', 'Energia', 'Água', 'Internet', 'Telefone', 'Materiais', 'Equipamentos', 'Marketing', 'Funcionários', 'Impostos', 'Outros'];

export default function Financial() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [filterType, setFilterType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const queryClient = useQueryClient();

  // --- QUERIES SUPABASE ---
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => (await supabase.from('appointments').select('*')).data || [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => (await supabase.from('expenses').select('*').order('due_date', { ascending: false })).data || [],
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['installments'],
    queryFn: async () => (await supabase.from('installments').select('*').order('due_date', { ascending: true })).data || [],
  });

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('expenses').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setIsOpen(false); toast.success('Despesa cadastrada'); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('expenses').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setEditingExpense(null); toast.success('Atualizado'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setDeleteExpense(null); toast.success('Excluído'); },
  });

  const updateInstallmentMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('installments').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['installments'] }); toast.success('Parcela atualizada'); },
  });

  // --- LÓGICA DE NEGÓCIO ---
  const togglePaid = (expense) => {
    updateMutation.mutate({
      id: expense.id,
      data: { is_paid: !expense.is_paid, payment_date: !expense.is_paid ? format(new Date(), 'yyyy-MM-dd') : null }
    });
  };

  const toggleInstallmentReceived = (installment) => {
    updateInstallmentMutation.mutate({
      id: installment.id,
      data: { is_received: !installment.is_received, received_date: !installment.is_received ? format(new Date(), 'yyyy-MM-dd') : null }
    });
  };

  const getDateRange = () => {
    if (filterType === 'month') return { start: startOfMonth(new Date(selectedYear, selectedMonth)), end: endOfMonth(new Date(selectedYear, selectedMonth)) };
    if (filterType === 'year') return { start: startOfYear(new Date(selectedYear, 0)), end: endOfYear(new Date(selectedYear, 0)) };
    if (filterType === 'custom' && startDate && endDate) return { start: parseISO(startDate), end: parseISO(endDate) };
    return { start: new Date(0), end: new Date() };
  };

  const { start, end } = getDateRange();

  const filteredAppointments = appointments.filter(a => isWithinInterval(new Date(a.date), { start, end }) && a.status === 'Realizado');
  const filteredExpenses = expenses.filter(e => isWithinInterval(new Date(e.due_date), { start, end }));
  const filteredInstallments = installments.filter(i => isWithinInterval(new Date(i.due_date), { start, end }));

  const calculateRevenue = () => {
    let revenue = 0;
    filteredAppointments.forEach(a => { if (a.payment_method !== 'Cartão Crédito' || !a.installments || a.installments <= 1) revenue += Number(a.final_value || 0); });
    filteredInstallments.forEach(i => { if (i.is_received) revenue += Number(i.value || 0); });
    return revenue;
  };

  const pendingInstallmentsValue = filteredInstallments.filter(i => !i.is_received).reduce((sum, i) => sum + Number(i.value || 0), 0);
  const totalRevenue = calculateRevenue();
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalMaterialCost = filteredAppointments.reduce((sum, a) => sum + Number(a.total_material_cost || 0), 0);
  const profit = totalRevenue - totalExpenses - totalMaterialCost;

  // --- GRÁFICO ---
  const getChartData = () => {
    const data = [];
    for (let i = 0; i < 12; i++) {
      const mStart = startOfMonth(new Date(selectedYear, i));
      const mEnd = endOfMonth(new Date(selectedYear, i));
      let mRev = 0;
      appointments.filter(a => isWithinInterval(new Date(a.date), { start: mStart, end: mEnd }) && a.status === 'Realizado' && (a.payment_method !== 'Cartão Crédito' || !a.installments || a.installments <= 1)).forEach(a => mRev += Number(a.final_value || 0));
      installments.filter(i => isWithinInterval(new Date(i.due_date), { start: mStart, end: mEnd }) && i.is_received).forEach(i => mRev += Number(i.value || 0));
      const mExp = expenses.filter(e => isWithinInterval(new Date(e.due_date), { start: mStart, end: mEnd })).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      data.push({ name: format(mStart, 'MMM'), faturamento: mRev, despesas: mExp });
    }
    return data;
  };

  // Mantenha o JSX original (return) aqui, ele vai usar as variáveis que calculamos acima
  // Cole o return do seu Financial.jsx original a partir daqui.
  // ...
  // Incluindo ExpenseCard e ExpenseModal (que não mudam lógica, só visual)
  
  // VOU COLOCAR O RETURN RESUMIDO PARA CONFIRMAR O FUNCIONAMENTO
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Controle total" action={<Button onClick={() => setIsOpen(true)} className="bg-stone-800"><Plus className="mr-2 h-4 w-4" /> Nova Despesa</Button>} />
      
      {/* Filtros e Cards (Copie do original se quiser o visual completo) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Faturamento" value={`R$ ${totalRevenue.toLocaleString('pt-BR')}`} icon={DollarSign} />
        <StatCard title="Despesas" value={`R$ ${totalExpenses.toLocaleString('pt-BR')}`} icon={TrendingDown} />
        <StatCard title="Lucro" value={`R$ ${profit.toLocaleString('pt-BR')}`} icon={TrendingUp} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList><TabsTrigger value="overview">Visão Geral</TabsTrigger><TabsTrigger value="expenses">Despesas</TabsTrigger></TabsList>
        <TabsContent value="overview">
            <Card><CardContent className="h-80"><ResponsiveContainer><BarChart data={getChartData()}><XAxis dataKey="name" /><Tooltip /><Legend /><Bar dataKey="faturamento" fill="#c4a47c" /><Bar dataKey="despesas" fill="#78716c" /></BarChart></ResponsiveContainer></CardContent></Card>
        </TabsContent>
        <TabsContent value="expenses">
            {filteredExpenses.map(e => (
                <Card key={e.id} className="mb-2"><CardContent className="p-4 flex justify-between">
                    <span>{e.description} - R$ {e.amount}</span>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteExpense(e)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </CardContent></Card>
            ))}
        </TabsContent>
      </Tabs>

      <ExpenseModal open={isOpen} onClose={() => setIsOpen(false)} onSave={(d) => createMutation.mutate(d)} />
      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}><AlertDialogContent><AlertDialogFooter><AlertDialogAction onClick={() => deleteMutation.mutate(deleteExpense.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function ExpenseModal({ open, onClose, expense, onSave }) {
    const [formData, setFormData] = useState({ description: '', category: '', amount: '', due_date: '' });
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    return (<Dialog open={open} onOpenChange={onClose}><DialogContent><form onSubmit={handleSubmit} className="space-y-4"><Input placeholder="Descrição" onChange={e => setFormData({...formData, description: e.target.value})} /><Input placeholder="Valor" type="number" onChange={e => setFormData({...formData, amount: e.target.value})} /><Input type="date" onChange={e => setFormData({...formData, due_date: e.target.value})} /><Button type="submit">Salvar</Button></form></DialogContent></Dialog>);
}