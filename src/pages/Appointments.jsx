import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabase.js';
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
import { Plus, Edit2, Trash2, Clock, DollarSign, Package, X, CreditCard, Calendar } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const PAYMENT_METHODS = ['Pix PJ', 'Pix PF', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Permuta', 'Troca em Procedimento'];

export default function Appointments() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [deleteAppointment, setDeleteAppointment] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  useEffect(() => { if (urlParams.get('action') === 'new') setIsOpen(true); }, []);

  // --- QUERIES ---
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await supabase.from('appointments').select('*').order('date', { ascending: false });
      return data || [];
    },
  });

  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: async () => (await supabase.from('patients').select('*')).data || [] });
  const { data: procedures = [] } = useQuery({ queryKey: ['procedures'], queryFn: async () => (await supabase.from('procedures').select('*')).data || [] });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: async () => (await supabase.from('materials').select('*')).data || [] });

  // --- CREATE LOGIC (COMPLEXA) ---
  const createMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Criar Atendimento
      const { data: appointment, error } = await supabase.from('appointments').insert([data]).select().single();
      if (error) throw error;

      // 2. Baixa de Estoque
      if (data.materials_used?.length > 0) {
        for (const mat of data.materials_used) {
          const { data: material } = await supabase.from('materials').select('*').eq('id', mat.material_id).single();
          if (material) {
            const newStock = (material.stock_quantity || 0) - mat.quantity;
            // Registrar Movimentação
            await supabase.from('stock_movements').insert({
              material_id: mat.material_id,
              material_name: mat.material_name,
              type: 'saida',
              quantity: mat.quantity,
              previous_stock: material.stock_quantity,
              new_stock: newStock,
              cost_per_unit: mat.cost,
              total_cost: mat.cost * mat.quantity,
              reason: `Atendimento ${data.patient_name}`,
              date: new Date()
            });
            // Atualizar Produto
            await supabase.from('materials').update({ stock_quantity: newStock }).eq('id', mat.material_id);
          }
        }
      }

      // 3. Gerar Parcelas (Se for cartão parcelado)
      if (data.payment_method === 'Cartão Crédito' && data.installments > 1) {
        const installmentsArray = [];
        for (let i = 1; i <= data.installments; i++) {
          const dueDate = addMonths(new Date(data.date), i - 1);
          installmentsArray.push({
            appointment_id: appointment.id,
            patient_name: data.patient_name,
            installment_number: i,
            total_installments: data.installments,
            value: data.installment_value,
            due_date: format(dueDate, 'yyyy-MM-dd'),
            is_received: true, // Cartão já considera "garantido"
            received_date: format(dueDate, 'yyyy-MM-dd'),
          });
        }
        await supabase.from('installments').insert(installmentsArray);
      }
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] }); // Atualiza estoque na tela
      setIsOpen(false);
      toast.success('Atendimento registrado!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('appointments').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setEditingAppointment(null);
      toast.success('Atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setDeleteAppointment(null);
      toast.success('Excluído!');
    },
  });

  const filteredAppointments = appointments.filter(a => {
    const date = new Date(a.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  // (MANTIVE O RESTO DO RENDER IGUAL AO ORIGINAL PARA NÃO QUEBRAR O VISUAL)
  // ... COPIE AQUI O RESTO DO RETURN DO SEU ARQUIVO ORIGINAL (Do "return (" até o fim do arquivo, incluindo o AppointmentModal)
  // ... É IMPORTANTE MANTER O RENDER ORIGINAL POIS ELE SÓ DEPENDE DOS DADOS QUE JÁ BUSCAMOS
  
  // VOU INCLUIR AQUI APENAS O INÍCIO DO RENDER PARA VOCÊ VERIFICAR
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);
  const statusColors = { 'Agendado': 'bg-blue-100 text-blue-700', 'Confirmado': 'bg-emerald-100 text-emerald-700', 'Realizado': 'bg-stone-100 text-stone-700', 'Cancelado': 'bg-rose-100 text-rose-700' };
  const paymentMethodColors = { 'Pix PJ': 'bg-green-100 text-green-700', 'Pix PF': 'bg-teal-100 text-teal-700', 'Dinheiro': 'bg-amber-100 text-amber-700', 'Cartão Débito': 'bg-blue-100 text-blue-700', 'Cartão Crédito': 'bg-purple-100 text-purple-700', 'Permuta': 'bg-orange-100 text-orange-700', 'Troca em Procedimento': 'bg-pink-100 text-pink-700' };

  return (
    <div className="space-y-6">
      <PageHeader title="Atendimentos" subtitle="Registro de consultas" action={<Button onClick={() => setIsOpen(true)} className="bg-stone-800 hover:bg-stone-900"><Plus className="w-4 h-4 mr-2" />Novo</Button>} />
      
      <div className="flex flex-wrap gap-3">
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}><SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger><SelectContent>{months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent></Select>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}><SelectTrigger className="w-24 bg-white"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="space-y-4">
        {filteredAppointments.map((apt) => (
          <Card key={apt.id} className="bg-white border-stone-100"><CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="font-medium text-stone-800">{apt.patient_name}</h3>
                    <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                    {apt.payment_method && <Badge className={paymentMethodColors[apt.payment_method]}>{apt.payment_method} {apt.installments > 1 && ` ${apt.installments}x`}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-stone-500 mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(apt.date), 'dd/MM/yyyy')} {apt.time}</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />R$ {Number(apt.final_value).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingAppointment(apt)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteAppointment(apt)} className="text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent></Card>
        ))}
      </div>

      {/* MODALS */}
      <AppointmentModal open={isOpen || !!editingAppointment} onClose={() => { setIsOpen(false); setEditingAppointment(null); }} appointment={editingAppointment} patients={patients} procedures={procedures} materials={materials} allAppointments={appointments} onSave={(data) => { if (editingAppointment) { updateMutation.mutate({ id: editingAppointment.id, data }); } else { createMutation.mutate(data); } }} isLoading={createMutation.isPending || updateMutation.isPending} />
      <AlertDialog open={!!deleteAppointment} onOpenChange={() => setDeleteAppointment(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle><AlertDialogDescription>Não pode desfazer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteAppointment.id)} className="bg-rose-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

// ... COPIAR A FUNÇÃO AppointmentModal DO ARQUIVO ORIGINAL AQUI, ELA FUNCIONA IGUAL ...
// (Apenas lembre de manter o AppointmentModal original no final do arquivo)