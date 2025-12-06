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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EXPENSE_CATEGORIES = [
  'Aluguel', 'Energia', 'Água', 'Internet', 'Telefone', 
  'Materiais', 'Equipamentos', 'Marketing', 'Funcionários', 
  'Impostos', 'Outros'
];

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

  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get('tab') || 'overview';

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await supabase.from('appointments').select('*');
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data } = await supabase.from('expenses').select('*').order('due_date', { ascending: false });
      return data || [];
    },
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['installments'],
    queryFn: async () => {
      const { data } = await supabase.from('installments').select('*').order('due_date', { ascending: true });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('expenses').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsOpen(false);
      toast.success('Despesa cadastrada');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('expenses').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setEditingExpense(null);
      toast.success('Despesa atualizada');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setDeleteExpense(null);
      toast.success('Despesa excluída');
    },
  });

  const updateInstallmentMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('installments').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      toast.success('Parcela atualizada');
    },
  });

  const togglePaid = (expense) => {
    updateMutation.mutate({
      id: expense.id,
      data: { is_paid: !expense.is_paid, payment_date: !expense.is_paid ? format(new Date(), 'yyyy-MM-dd') : null }
    });
  };

  const toggleInstallmentReceived = (installment) => {
    updateInstallmentMutation.mutate({
      id: installment.id,
      data: { 
        is_received: !installment.is_received, 
        received_date: !installment.is_received ? format(new Date(), 'yyyy-MM-dd') : null 
      }
    });
  };

  const getDateRange = () => {
    if (filterType === 'month') {
      return {
        start: startOfMonth(new Date(selectedYear, selectedMonth)),
        end: endOfMonth(new Date(selectedYear, selectedMonth))
      };
    } else if (filterType === 'year') {
      return {
        start: startOfYear(new Date(selectedYear, 0)),
        end: endOfYear(new Date(selectedYear, 0))
      };
    } else if (filterType === 'custom' && startDate && endDate) {
      return {
        start: parseISO(startDate),
        end: parseISO(endDate)
      };
    }
    return { start: new Date(0), end: new Date() };
  };

  const { start, end } = getDateRange();

  const filteredAppointments = appointments.filter(a => {
    if (!a.date) return false;
    const date = new Date(a.date + 'T12:00:00');
    return isWithinInterval(date, { start, end }) && a.status === 'Realizado';
  });

  const filteredExpenses = expenses.filter(e => {
    if (!e.due_date) return false;
    const date = new Date(e.due_date + 'T12:00:00');
    return isWithinInterval(date, { start, end });
  });

  const filteredInstallments = installments.filter(i => {
    if (!i.due_date) return false;
    const date = new Date(i.due_date + 'T12:00:00');
    return isWithinInterval(date, { start, end });
  });

  const calculateRevenue = () => {
    let revenue = 0;
    
    filteredAppointments.forEach(a => {
      if (a.payment_method !== 'Cartão Crédito' || !a.installments || a.installments <= 1) {
        revenue += Number(a.final_value) || Number(a.total_value) || 0;
      }
    });
    
    filteredInstallments.forEach(i => {
      if (i.is_received) {
        revenue += Number(i.value) || 0;
      }
    });
    
    return revenue;
  };

  const pendingInstallments = filteredInstallments.filter(i => !i.is_received);
  const pendingInstallmentsValue = pendingInstallments.reduce((sum, i) => sum + (Number(i.value) || 0), 0);

  const totalRevenue = calculateRevenue();
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalMaterialCost = filteredAppointments.reduce((sum, a) => sum + (Number(a.total_material_cost) || 0), 0);
  const profit = totalRevenue - totalExpenses - totalMaterialCost;

  const getChartData = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = startOfMonth(new Date(selectedYear, i));
      const monthEnd = endOfMonth(new Date(selectedYear, i));
      
      let monthRevenue = 0;
      
      appointments.filter(a => {
        if (!a.date) return false;
        const date = new Date(a.date + 'T12:00:00');
        return isWithinInterval(date, { start: monthStart, end: monthEnd }) && 
               a.status === 'Realizado' &&
               (a.payment_method !== 'Cartão Crédito' || !a.installments || a.installments <= 1);
      }).forEach(a => {
        monthRevenue += Number(a.final_value) || Number(a.total_value) || 0;
      });

      installments.filter(i => {
        if (!i.due_date) return false;
        const date = new Date(i.due_date + 'T12:00:00');
        return isWithinInterval(date, { start: monthStart, end: monthEnd }) && i.is_received;
      }).forEach(i => {
        monthRevenue += Number(i.value) || 0;
      });

      const monthExpenses = expenses.filter(e => {
        if (!e.due_date) return false;
        const date = new Date(e.due_date + 'T12:00:00');
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      months.push({
        name: format(monthStart, 'MMM'),
        faturamento: monthRevenue,
        despesas: monthExpenses,
      });
    }
    return months;
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        subtitle="Controle de faturamento e despesas"
        action={
          <Button onClick={() => setIsOpen(true)} className="bg-stone-800 hover:bg-stone-900">
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border border-stone-100">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Por Mês</SelectItem>
            <SelectItem value="year">Por Ano</SelectItem>
            <SelectItem value="custom">Período</SelectItem>
          </SelectContent>
        </Select>

        {filterType === 'month' && (
          <>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {filterType === 'year' && (
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filterType === 'custom' && (
          <>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
            <span className="text-stone-400 self-center">até</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Faturamento"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <StatCard
          title="A Receber (Parcelas)"
          value={`R$ ${pendingInstallmentsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={CreditCard}
        />
        <StatCard
          title="Despesas"
          value={`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
        />
        <StatCard
          title="Custo Materiais"
          value={`R$ ${totalMaterialCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
        />
        <StatCard
          title="Lucro"
          value={`R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          className={profit >= 0 ? '' : 'border-rose-200'}
        />
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="bg-stone-100">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="installments">Parcelas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="recurring">Fixos Mensais</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card className="bg-white border-stone-100">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Faturamento vs Despesas - {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="name" stroke="#78716c" fontSize={12} />
                    <YAxis stroke="#78716c" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px' }}
                      formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Bar dataKey="faturamento" fill="#c4a47c" name="Faturamento" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" fill="#78716c" name="Despesas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installments" className="mt-6 space-y-4">
          <h3 className="text-sm font-medium text-stone-500">Parcelas no período selecionado</h3>
          {filteredInstallments.map((inst) => (
            <Card key={inst.id} className="bg-white border-stone-100">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleInstallmentReceived(inst)}
                      className={`mt-1 p-1 rounded-full transition-colors ${
                        inst.is_received ? 'text-emerald-600' : 'text-stone-300 hover:text-stone-400'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <div>
                      <h3 className={`font-medium ${inst.is_received ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                        {inst.patient_name}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-stone-500">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <CreditCard className="w-3 h-3 mr-1" />
                          Parcela {inst.installment_number}/{inst.total_installments}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Vence: {format(new Date(inst.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                        </span>
                        {inst.is_received && inst.received_date && (
                          <span className="text-emerald-600">
                            Recebido: {format(new Date(inst.received_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-lg font-light text-stone-800">
                    R$ {(Number(inst.value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredInstallments.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              Nenhuma parcela neste período
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-6 space-y-4">
          {filteredExpenses.filter(e => !e.is_recurring).map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={() => setEditingExpense(expense)}
              onDelete={() => setDeleteExpense(expense)}
              onTogglePaid={() => togglePaid(expense)}
            />
          ))}
          {filteredExpenses.filter(e => !e.is_recurring).length === 0 && (
            <div className="text-center py-12 text-stone-400">
              Nenhuma despesa neste período
            </div>
          )}
        </TabsContent>

        <TabsContent value="recurring" className="mt-6 space-y-4">
          {expenses.filter(e => e.is_recurring).map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={() => setEditingExpense(expense)}
              onDelete={() => setDeleteExpense(expense)}
              onTogglePaid={() => togglePaid(expense)}
            />
          ))}
          {expenses.filter(e => e.is_recurring).length === 0 && (
            <div className="text-center py-12 text-stone-400">
              Nenhum pagamento fixo cadastrado
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ExpenseModal
        open={isOpen || !!editingExpense}
        onClose={() => {
          setIsOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        onSave={(data) => {
          if (editingExpense) {
            updateMutation.mutate({ id: editingExpense.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteExpense.id)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExpenseCard({ expense, onEdit, onDelete, onTogglePaid }) {
  return (
    <Card className="bg-white border-stone-100">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={onTogglePaid}
              className={`mt-1 p-1 rounded-full transition-colors ${
                expense.is_paid ? 'text-emerald-600' : 'text-stone-300 hover:text-stone-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
            <div>
              <h3 className={`font-medium ${expense.is_paid ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                {expense.description}
              </h3>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-stone-500">
                <Badge variant="outline">{expense.category}</Badge>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Vence: {format(new Date(expense.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                </span>
                {expense.is_recurring && (
                  <Badge className="bg-blue-100 text-blue-700">Mensal</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-light text-stone-800">
              R$ {(Number(expense.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpenseModal({ open, onClose, expense, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    amount: '',
    due_date: '',
    is_paid: false,
    is_recurring: false,
    recurrence_day: '',
  });

  React.useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description || '',
        category: expense.category || '',
        amount: expense.amount || '',
        due_date: expense.due_date || '',
        is_paid: expense.is_paid || false,
        is_recurring: expense.is_recurring || false,
        recurrence_day: expense.recurrence_day || '',
      });
    } else {
      setFormData({
        description: '',
        category: '',
        amount: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        is_paid: false,
        is_recurring: false,
        recurrence_day: '',
      });
    }
  }, [expense, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      recurrence_day: formData.recurrence_day ? parseInt(formData.recurrence_day) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Descrição *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <Label>Data de Vencimento *</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_paid"
                checked={formData.is_paid}
                onCheckedChange={(v) => setFormData({ ...formData, is_paid: v })}
              />
              <Label htmlFor="is_paid" className="cursor-pointer">Já foi pago</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(v) => setFormData({ ...formData, is_recurring: v })}
              />
              <Label htmlFor="is_recurring" className="cursor-pointer">Pagamento fixo mensal</Label>
            </div>
          </div>
          {formData.is_recurring && (
            <div>
              <Label>Dia do vencimento mensal</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.recurrence_day}
                onChange={(e) => setFormData({ ...formData, recurrence_day: e.target.value })}
                placeholder="Ex: 10"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-stone-800 hover:bg-stone-900">
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}