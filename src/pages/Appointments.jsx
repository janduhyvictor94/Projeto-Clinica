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

  // --- CREATE LOGIC ---
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
            await supabase.from('materials').update({ stock_quantity: newStock }).eq('id', mat.material_id);
          }
        }
      }

      // 3. Gerar Parcelas
      if (data.payment_method === 'Cartão Crédito' && data.installments > 1) {
        const installmentsArray = [];
        for (let i = 1; i <= data.installments; i++) {
          const dueDate = addMonths(new Date(data.date), i - 1);
          installmentsArray.push({
            appointment_id: appointment.id,
            patient_name: data.patient_name,
            installment_number: i,
            total_installments: data.installments,
            value: data.final_value / data.installments, // Correção: valor da parcela
            due_date: format(dueDate, 'yyyy-MM-dd'),
            is_received: true, 
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
      queryClient.invalidateQueries({ queryKey: ['materials'] });
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
    if (!a.date) return false;
    const date = new Date(a.date + 'T12:00:00');
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

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
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(apt.date + 'T12:00:00'), 'dd/MM/yyyy')} {apt.time}</span>
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

      <AppointmentModal open={isOpen || !!editingAppointment} onClose={() => { setIsOpen(false); setEditingAppointment(null); }} appointment={editingAppointment} patients={patients} procedures={procedures} materials={materials} allAppointments={appointments} onSave={(data) => { if (editingAppointment) { updateMutation.mutate({ id: editingAppointment.id, data }); } else { createMutation.mutate(data); } }} isLoading={createMutation.isPending || updateMutation.isPending} />
      <AlertDialog open={!!deleteAppointment} onOpenChange={() => setDeleteAppointment(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle><AlertDialogDescription>Não pode desfazer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteAppointment.id)} className="bg-rose-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

// --- O COMPONENTE QUE FALTAVA ---
function AppointmentModal({ open, onClose, appointment, patients, procedures, materials, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    status: 'Agendado',
    notes: '',
    payment_method: '',
    discount_percent: 0,
    installments: 1,
    procedures_performed: [],
    materials_used: []
  });

  const [selectedProc, setSelectedProc] = useState('');
  const [selectedMat, setSelectedMat] = useState('');
  const [matQuantity, setMatQuantity] = useState(1);

  useEffect(() => {
    if (appointment) {
      setFormData({
        patient_id: appointment.patient_id || '',
        patient_name: appointment.patient_name || '',
        date: appointment.date || format(new Date(), 'yyyy-MM-dd'),
        time: appointment.time || '09:00',
        status: appointment.status || 'Agendado',
        notes: appointment.notes || '',
        payment_method: appointment.payment_method || '',
        discount_percent: appointment.discount_percent || 0,
        installments: appointment.installments || 1,
        procedures_performed: appointment.procedures_performed || [],
        materials_used: appointment.materials_used || []
      });
    } else {
      setFormData({
        patient_id: '',
        patient_name: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        status: 'Agendado',
        notes: '',
        payment_method: '',
        discount_percent: 0,
        installments: 1,
        procedures_performed: [],
        materials_used: []
      });
    }
  }, [appointment, open]);

  const handlePatientChange = (value) => {
    const p = patients.find(pat => pat.id === value);
    setFormData(prev => ({ ...prev, patient_id: value, patient_name: p ? p.full_name : '' }));
  };

  const addProcedure = () => {
    if (!selectedProc) return;
    const proc = procedures.find(p => p.id === selectedProc);
    if (proc) {
      setFormData(prev => ({
        ...prev,
        procedures_performed: [...prev.procedures_performed, { procedure_id: proc.id, procedure_name: proc.name, price: proc.default_price }]
      }));
      setSelectedProc('');
    }
  };

  const addMaterial = () => {
    if (!selectedMat) return;
    const mat = materials.find(m => m.id === selectedMat);
    if (mat) {
      setFormData(prev => ({
        ...prev,
        materials_used: [...prev.materials_used, { material_id: mat.id, material_name: mat.name, quantity: parseFloat(matQuantity), cost: mat.cost_per_unit }]
      }));
      setSelectedMat('');
      setMatQuantity(1);
    }
  };

  const removeProcedure = (index) => {
    setFormData(prev => ({ ...prev, procedures_performed: prev.procedures_performed.filter((_, i) => i !== index) }));
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({ ...prev, materials_used: prev.materials_used.filter((_, i) => i !== index) }));
  };

  // Cálculos
  const totalProcedures = formData.procedures_performed.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const totalMaterials = formData.materials_used.reduce((sum, m) => sum + ((Number(m.cost) || 0) * (Number(m.quantity) || 0)), 0);
  const discountValue = (totalProcedures * (formData.discount_percent || 0)) / 100;
  const finalValue = totalProcedures - discountValue;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      total_value: totalProcedures,
      final_value: finalValue,
      total_material_cost: totalMaterials,
      is_new_patient: false // Pode melhorar isso depois verificando se é o 1º do paciente
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{appointment ? 'Editar' : 'Novo'} Agendamento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Paciente</Label>
              <Select value={formData.patient_id} onValueChange={handlePatientChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Data</Label><Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div>
              <div><Label>Hora</Label><Input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} required /></div>
            </div>
          </div>

          <div className="space-y-2 border p-3 rounded-md">
            <Label>Procedimentos</Label>
            <div className="flex gap-2">
              <Select value={selectedProc} onValueChange={setSelectedProc}>
                <SelectTrigger><SelectValue placeholder="Adicionar Procedimento" /></SelectTrigger>
                <SelectContent>{procedures.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - R$ {p.default_price}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="button" onClick={addProcedure}><Plus className="w-4 h-4" /></Button>
            </div>
            {formData.procedures_performed.map((p, i) => (
              <div key={i} className="flex justify-between items-center bg-stone-50 p-2 rounded text-sm">
                <span>{p.procedure_name}</span>
                <div className="flex items-center gap-2">
                  <span>R$ {p.price}</span>
                  <X className="w-4 h-4 cursor-pointer text-red-500" onClick={() => removeProcedure(i)} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border p-3 rounded-md">
            <Label>Materiais Usados (Baixa no Estoque)</Label>
            <div className="flex gap-2">
              <Select value={selectedMat} onValueChange={setSelectedMat}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Material" /></SelectTrigger>
                <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" className="w-20" value={matQuantity} onChange={e => setMatQuantity(e.target.value)} placeholder="Qtd" />
              <Button type="button" onClick={addMaterial}><Plus className="w-4 h-4" /></Button>
            </div>
            {formData.materials_used.map((m, i) => (
              <div key={i} className="flex justify-between items-center bg-stone-50 p-2 rounded text-sm">
                <span>{m.material_name} ({m.quantity})</span>
                <X className="w-4 h-4 cursor-pointer text-red-500" onClick={() => removeMaterial(i)} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-lg">
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formData.payment_method} onValueChange={v => setFormData({ ...formData, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {formData.payment_method === 'Cartão Crédito' && (
              <div><Label>Parcelas</Label><Input type="number" min="1" max="12" value={formData.installments} onChange={e => setFormData({ ...formData, installments: parseInt(e.target.value) })} /></div>
            )}
            <div><Label>Status</Label><Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Agendado">Agendado</SelectItem><SelectItem value="Confirmado">Confirmado</SelectItem><SelectItem value="Realizado">Realizado</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent></Select></div>
            <div><Label>Desconto (%)</Label><Input type="number" value={formData.discount_percent} onChange={e => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) })} /></div>
          </div>

          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total: R$ {totalProcedures}</span>
            <span className="text-emerald-700">Final: R$ {finalValue}</span>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-stone-800 text-white hover:bg-stone-900">{isLoading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}