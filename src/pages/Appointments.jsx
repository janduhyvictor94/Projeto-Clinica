import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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

const PAYMENT_METHODS = ['Pix PJ', 'Pix PF', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Permuta', 'Troca em Procedimento'];

export default function Appointments() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [deleteAppointment, setDeleteAppointment] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  useEffect(() => {
    if (urlParams.get('action') === 'new') {
      setIsOpen(true);
    }
  }, []);

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: () => base44.entities.Procedure.list(),
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => base44.entities.Material.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
            const appointment = await base44.entities.Appointment.create(data);

            // Dar baixa no estoque dos materiais utilizados
            if (data.materials_used?.length > 0) {
              for (const mat of data.materials_used) {
                const materials = await base44.entities.Material.filter({ id: mat.material_id });
                const material = materials[0];
                if (material) {
                  const previousStock = material.stock_quantity || 0;
                  const newStock = previousStock - mat.quantity;

                  await base44.entities.StockMovement.create({
                    material_id: mat.material_id,
                    material_name: mat.material_name,
                    type: 'saida',
                    quantity: mat.quantity,
                    previous_stock: previousStock,
                    new_stock: newStock,
                    cost_per_unit: mat.cost,
                    total_cost: mat.cost * mat.quantity,
                    appointment_id: appointment.id,
                    patient_name: data.patient_name,
                    reason: 'Uso em atendimento',
                    date: data.date,
                  });

                  await base44.entities.Material.update(mat.material_id, {
                    stock_quantity: newStock,
                  });
                }
              }
            }

            // Se for cartão de crédito parcelado, criar parcelas (todas já recebidas pois o cartão garante)
            if (data.payment_method === 'Cartão Crédito' && data.installments > 1) {
                    const installmentPromises = [];
                    for (let i = 1; i <= data.installments; i++) {
                      const dueDate = addMonths(new Date(data.date), i - 1);
                      installmentPromises.push(
                        base44.entities.Installment.create({
                          appointment_id: appointment.id,
                          patient_name: data.patient_name,
                          installment_number: i,
                          total_installments: data.installments,
                          value: data.installment_value,
                          due_date: format(dueDate, 'yyyy-MM-dd'),
                          is_received: true,
                          received_date: format(dueDate, 'yyyy-MM-dd'),
                        })
                      );
                    }
                    await Promise.all(installmentPromises);
                  }
      
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      setIsOpen(false);
      toast.success('Atendimento registrado');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setEditingAppointment(null);
      toast.success('Atendimento atualizado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setDeleteAppointment(null);
      toast.success('Atendimento excluído');
    },
  });

  const filteredAppointments = appointments.filter(a => {
    const date = new Date(a.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  const statusColors = {
    'Agendado': 'bg-blue-100 text-blue-700',
    'Confirmado': 'bg-emerald-100 text-emerald-700',
    'Realizado': 'bg-stone-100 text-stone-700',
    'Cancelado': 'bg-rose-100 text-rose-700',
  };

  const paymentMethodColors = {
    'Pix PJ': 'bg-green-100 text-green-700',
    'Pix PF': 'bg-teal-100 text-teal-700',
    'Dinheiro': 'bg-amber-100 text-amber-700',
    'Cartão Débito': 'bg-blue-100 text-blue-700',
    'Cartão Crédito': 'bg-purple-100 text-purple-700',
    'Permuta': 'bg-orange-100 text-orange-700',
    'Troca em Procedimento': 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atendimentos"
        subtitle="Registro de consultas e procedimentos"
        action={
          <Button onClick={() => setIsOpen(true)} className="bg-stone-800 hover:bg-stone-900">
            <Plus className="w-4 h-4 mr-2" />
            Novo Atendimento
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-36 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-24 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.map((apt) => (
          <Card key={apt.id} className="bg-white border-stone-100">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="font-medium text-stone-800">{apt.patient_name}</h3>
                    <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                    {apt.is_new_patient && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">Novo</Badge>
                    )}
                    {apt.payment_method && (
                      <Badge className={paymentMethodColors[apt.payment_method]}>
                        {apt.payment_method}
                        {apt.installments > 1 && ` ${apt.installments}x`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-stone-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(apt.date), 'dd/MM/yyyy')} {apt.time && `às ${apt.time}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      R$ {(apt.final_value || apt.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      {apt.discount_percent > 0 && (
                        <span className="text-emerald-600">(-{apt.discount_percent}%)</span>
                      )}
                    </span>
                    {apt.total_material_cost > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Package className="w-3 h-3" />
                        Custo: R$ {apt.total_material_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  {apt.procedures_performed?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {apt.procedures_performed.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {p.procedure_name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {apt.materials_used?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {apt.materials_used.map((m, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                          {m.material_name} ({m.quantity}) - R$ {(m.cost * m.quantity).toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {apt.notes && (
                    <p className="text-sm text-stone-600 mt-2 p-3 bg-stone-50 rounded-lg">{apt.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingAppointment(apt)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteAppointment(apt)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAppointments.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            Nenhum atendimento neste período
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AppointmentModal
        open={isOpen || !!editingAppointment}
        onClose={() => {
          setIsOpen(false);
          setEditingAppointment(null);
        }}
        appointment={editingAppointment}
        patients={patients}
        procedures={procedures}
        materials={materials}
        allAppointments={appointments}
        onSave={(data) => {
          if (editingAppointment) {
            updateMutation.mutate({ id: editingAppointment.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAppointment} onOpenChange={() => setDeleteAppointment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteAppointment.id)}
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

function AppointmentModal({ open, onClose, appointment, patients, procedures, materials, allAppointments, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    patient_gender: '',
    patient_origin: '',
    date: '',
    time: '',
    status: 'Agendado',
    notes: '',
    next_return_date: '',
    scheduled_returns: [],
    is_new_patient: false,
    procedures_performed: [],
    materials_used: [],
    total_value: 0,
    total_material_cost: 0,
    payment_method: '',
    discount_percent: 0,
    discount_value: 0,
    final_value: 0,
    installments: 1,
    installment_value: 0,
  });

  const [newReturn, setNewReturn] = useState({ date: '', description: '', alert_days: 15 });

  useEffect(() => {
    if (appointment) {
      setFormData({
        patient_id: appointment.patient_id || '',
        patient_name: appointment.patient_name || '',
        patient_gender: appointment.patient_gender || '',
        patient_origin: appointment.patient_origin || '',
        date: appointment.date || '',
        time: appointment.time || '',
        status: appointment.status || 'Agendado',
        notes: appointment.notes || '',
        next_return_date: appointment.next_return_date || '',
        scheduled_returns: appointment.scheduled_returns || [],
        is_new_patient: appointment.is_new_patient || false,
        procedures_performed: appointment.procedures_performed || [],
        materials_used: appointment.materials_used || [],
        total_value: appointment.total_value || 0,
        total_material_cost: appointment.total_material_cost || 0,
        payment_method: appointment.payment_method || '',
        discount_percent: appointment.discount_percent || 0,
        discount_value: appointment.discount_value || 0,
        final_value: appointment.final_value || appointment.total_value || 0,
        installments: appointment.installments || 1,
        installment_value: appointment.installment_value || 0,
      });
    } else {
      setFormData({
        patient_id: '',
        patient_name: '',
        patient_gender: '',
        patient_origin: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '',
        status: 'Agendado',
        notes: '',
        next_return_date: '',
        scheduled_returns: [],
        is_new_patient: false,
        procedures_performed: [],
        materials_used: [],
        total_value: 0,
        total_material_cost: 0,
        payment_method: '',
        discount_percent: 0,
        discount_value: 0,
        final_value: 0,
        installments: 1,
        installment_value: 0,
      });
    }
    setNewReturn({ date: '', description: '' });
  }, [appointment, open]);

  const handlePatientChange = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    const hasAppointments = allAppointments.some(a => a.patient_id === patientId);
    setFormData({
      ...formData,
      patient_id: patientId,
      patient_name: patient?.full_name || '',
      patient_gender: patient?.gender || '',
      patient_origin: patient?.origin || '',
      is_new_patient: !hasAppointments,
    });
  };

  const toggleProcedure = (procedure) => {
    const exists = formData.procedures_performed.find(p => p.procedure_id === procedure.id);
    let newProcedures;
    if (exists) {
      newProcedures = formData.procedures_performed.filter(p => p.procedure_id !== procedure.id);
    } else {
      newProcedures = [...formData.procedures_performed, {
        procedure_id: procedure.id,
        procedure_name: procedure.name,
        price: procedure.default_price || 0,
      }];
    }
    const totalValue = newProcedures.reduce((sum, p) => sum + (p.price || 0), 0);
    const discountValue = (totalValue * (formData.discount_percent / 100));
    const finalValue = totalValue - discountValue;
    const installmentValue = formData.installments > 0 ? finalValue / formData.installments : finalValue;
    
    setFormData({ 
      ...formData, 
      procedures_performed: newProcedures, 
      total_value: totalValue,
      discount_value: discountValue,
      final_value: finalValue,
      installment_value: installmentValue,
    });
  };

  const addMaterial = (material) => {
    const exists = formData.materials_used.find(m => m.material_id === material.id);
    if (exists) return;
    const newMaterials = [...formData.materials_used, {
      material_id: material.id,
      material_name: material.name,
      quantity: 1,
      cost: material.cost_per_unit || 0,
    }];
    const totalCost = newMaterials.reduce((sum, m) => sum + (m.cost * m.quantity), 0);
    setFormData({ ...formData, materials_used: newMaterials, total_material_cost: totalCost });
  };

  const updateMaterialQuantity = (materialId, quantity) => {
    const newMaterials = formData.materials_used.map(m => {
      if (m.material_id === materialId) {
        return { ...m, quantity: parseFloat(quantity) || 0 };
      }
      return m;
    });
    const totalCost = newMaterials.reduce((sum, m) => sum + (m.cost * m.quantity), 0);
    setFormData({ ...formData, materials_used: newMaterials, total_material_cost: totalCost });
  };

  const removeMaterial = (materialId) => {
    const newMaterials = formData.materials_used.filter(m => m.material_id !== materialId);
    const totalCost = newMaterials.reduce((sum, m) => sum + (m.cost * m.quantity), 0);
    setFormData({ ...formData, materials_used: newMaterials, total_material_cost: totalCost });
  };

  const handleDiscountChange = (percent) => {
    const discountPercent = parseFloat(percent) || 0;
    const discountValue = (formData.total_value * (discountPercent / 100));
    const finalValue = formData.total_value - discountValue;
    const installmentValue = formData.installments > 0 ? finalValue / formData.installments : finalValue;
    
    setFormData({
      ...formData,
      discount_percent: discountPercent,
      discount_value: discountValue,
      final_value: finalValue,
      installment_value: installmentValue,
    });
  };

  const handleInstallmentsChange = (installments) => {
    const numInstallments = parseInt(installments) || 1;
    const installmentValue = numInstallments > 0 ? formData.final_value / numInstallments : formData.final_value;
    
    setFormData({
      ...formData,
      installments: numInstallments,
      installment_value: installmentValue,
    });
  };

  const handlePaymentMethodChange = (method) => {
    const isInstallmentMethod = method === 'Cartão Crédito';
    setFormData({
      ...formData,
      payment_method: method,
      installments: isInstallmentMethod ? formData.installments : 1,
      installment_value: isInstallmentMethod ? formData.final_value / (formData.installments || 1) : formData.final_value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const isInstallmentPayment = formData.payment_method === 'Cartão Crédito';
  const isDiscountPayment = ['Pix PJ', 'Pix PF', 'Dinheiro', 'Cartão Débito'].includes(formData.payment_method);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Editar Atendimento' : 'Novo Atendimento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Paciente *</Label>
              <Select value={formData.patient_id} onValueChange={handlePatientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Horário</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendado">Agendado</SelectItem>
                  <SelectItem value="Confirmado">Confirmado</SelectItem>
                  <SelectItem value="Realizado">Realizado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data do Próximo Retorno Principal</Label>
              <Input
                type="date"
                value={formData.next_return_date}
                onChange={(e) => setFormData({ ...formData, next_return_date: e.target.value })}
              />
            </div>
          </div>

          {/* Retornos Programados */}
          <div className="p-4 bg-blue-50 rounded-xl space-y-4">
            <Label className="block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Retornos Programados Adicionais
            </Label>
            
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                value={newReturn.date}
                onChange={(e) => setNewReturn({ ...newReturn, date: e.target.value })}
                className="flex-1 min-w-32 bg-white"
              />
              <Input
                placeholder="Descrição (opcional)"
                value={newReturn.description}
                onChange={(e) => setNewReturn({ ...newReturn, description: e.target.value })}
                className="flex-1 min-w-32 bg-white"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={newReturn.alert_days}
                  onChange={(e) => setNewReturn({ ...newReturn, alert_days: parseInt(e.target.value) || 15 })}
                  className="w-16 bg-white"
                />
                <span className="text-xs text-stone-500 whitespace-nowrap">dias antes</span>
              </div>
              <Button 
                type="button" 
                onClick={() => {
                  if (!newReturn.date) return;
                  setFormData({
                    ...formData,
                    scheduled_returns: [...formData.scheduled_returns, { ...newReturn }],
                  });
                  setNewReturn({ date: '', description: '', alert_days: 15 });
                }} 
                variant="outline"
                className="bg-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {formData.scheduled_returns.length > 0 && (
              <div className="space-y-2">
                {formData.scheduled_returns.map((ret, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-stone-700">
                      {format(new Date(ret.date), 'dd/MM/yyyy')}
                    </span>
                    {ret.description && (
                      <span className="text-sm text-stone-500">- {ret.description}</span>
                    )}
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      Alerta: {ret.alert_days || 15} dias
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setFormData({
                        ...formData,
                        scheduled_returns: formData.scheduled_returns.filter((_, idx) => idx !== i),
                      })}
                    >
                      <X className="w-4 h-4 text-rose-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Procedures */}
          <div>
            <Label className="mb-3 block">Procedimentos Realizados</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {procedures.filter(p => p.is_active !== false).map(proc => (
                <div
                  key={proc.id}
                  onClick={() => toggleProcedure(proc)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.procedures_performed.find(p => p.procedure_id === proc.id)
                      ? 'border-stone-800 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <p className="text-sm font-medium text-stone-700">{proc.name}</p>
                  <p className="text-xs text-stone-500">R$ {(proc.default_price || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Materials */}
          <div>
            <Label className="mb-3 block">Materiais Utilizados</Label>
            <Select onValueChange={(v) => addMaterial(materials.find(m => m.id === v))}>
              <SelectTrigger>
                <SelectValue placeholder="Adicionar material" />
              </SelectTrigger>
              <SelectContent>
                {materials.filter(m => m.is_active !== false).map(mat => (
                  <SelectItem key={mat.id} value={mat.id}>
                    {mat.name} - R$ {(mat.cost_per_unit || 0).toFixed(2)}/{mat.unit || 'un'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.materials_used.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.materials_used.map(mat => (
                  <div key={mat.material_id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <span className="flex-1 text-sm text-stone-700">{mat.material_name}</span>
                    <Input
                      type="number"
                      value={mat.quantity}
                      onChange={(e) => updateMaterialQuantity(mat.material_id, e.target.value)}
                      className="w-20"
                      min="0"
                      step="0.1"
                    />
                    <span className="text-sm text-amber-700 font-medium w-24 text-right">
                      R$ {(mat.cost * mat.quantity).toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMaterial(mat.material_id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="p-4 bg-stone-50 rounded-xl space-y-4">
            <h4 className="font-medium text-stone-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pagamento
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={formData.payment_method} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isDiscountPayment && (
                <div>
                  <Label>Desconto à Vista (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.discount_percent}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              {isInstallmentPayment && (
                <div>
                  <Label>Parcelas</Label>
                  <Select value={formData.installments.toString()} onValueChange={handleInstallmentsChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>O que foi realizado na consulta</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Descreva os procedimentos, observações, recomendações..."
              rows={4}
            />
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-stone-100 rounded-xl">
            <div>
              <p className="text-xs text-stone-500">Valor Bruto</p>
              <p className="text-lg font-light text-stone-800">
                R$ {(formData.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Custo Materiais</p>
              <p className="text-lg font-light text-amber-600">
                R$ {(formData.total_material_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            {formData.discount_percent > 0 && (
              <div>
                <p className="text-xs text-stone-500">Desconto ({formData.discount_percent}%)</p>
                <p className="text-lg font-light text-rose-600">
                  -R$ {(formData.discount_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-stone-500">Valor Final</p>
              <p className="text-lg font-medium text-stone-800">
                R$ {(formData.final_value || formData.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                {isInstallmentPayment && formData.installments > 1 && (
                  <span className="text-xs text-stone-500 block">
                    {formData.installments}x de R$ {(formData.installment_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Lucro Estimado</p>
              <p className="text-lg font-light text-emerald-600">
                R$ {((formData.final_value || formData.total_value || 0) - (formData.total_material_cost || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

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