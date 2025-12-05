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
import { Plus, Search, Edit2, Trash2, Phone, Mail, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const ORIGINS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Indicação', 'Google', 'Campanha', 'Post', 'Video', 'Outro'];
const GENDERS = ['Feminino', 'Masculino', 'Outro'];

export default function Patients() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState(null);
  const [deletePatient, setDeletePatient] = useState(null);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  useEffect(() => {
    if (urlParams.get('action') === 'new') setIsOpen(true);
  }, []);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== '' && v !== null));
      const { error } = await supabase.from('patients').insert([cleanData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsOpen(false);
      toast.success('Paciente cadastrado com sucesso');
    },
    onError: (error) => toast.error('Erro ao cadastrar: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('patients').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setEditingPatient(null);
      toast.success('Paciente atualizado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDeletePatient(null);
      toast.success('Paciente excluído');
    },
  });

  const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Pacientes" subtitle={`${patients.length} cadastrados`} action={<Button onClick={() => setIsOpen(true)} className="bg-stone-800 hover:bg-stone-900"><Plus className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Novo Paciente</span></Button>} />
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white" />
      </div>

      <div className="grid gap-4">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="bg-white border-stone-100 hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-medium text-stone-800 text-base truncate">{patient.full_name}</h3>
                    <Badge variant="outline">{patient.gender}</Badge>
                    <Badge className="bg-stone-100 text-stone-600 hover:bg-stone-100">{patient.origin}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-stone-500">
                    {patient.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{patient.phone}</span>}
                    {patient.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{patient.email}</span>}
                  </div>
                  {(patient.next_return_date) && (
                    <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                          <Calendar className="w-3 h-3 mr-1" />{format(new Date(patient.next_return_date), 'dd/MM')}
                        </Badge>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setEditingPatient(patient)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" className="text-rose-600 hover:bg-rose-50" onClick={() => setDeletePatient(patient)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PatientModal open={isOpen || !!editingPatient} onClose={() => { setIsOpen(false); setEditingPatient(null); }} patient={editingPatient} onSave={(data) => { if (editingPatient) updateMutation.mutate({ id: editingPatient.id, data }); else createMutation.mutate(data); }} isLoading={createMutation.isPending || updateMutation.isPending} />
      <AlertDialog open={!!deletePatient} onOpenChange={() => setDeletePatient(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deletePatient.id)} className="bg-rose-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

// O MODAL COMPLETO COM TODOS OS CAMPOS
function PatientModal({ open, onClose, patient, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    full_name: '', phone: '', email: '', birth_date: '', gender: '', cpf: '', address: '',
    origin: '', protocol: '', notes: '', next_return_date: '', scheduled_returns: []
  });
  const [newReturn, setNewReturn] = useState({ date: '', description: '' });

  useEffect(() => {
    if (patient) {
      setFormData({
        full_name: patient.full_name || '', phone: patient.phone || '', email: patient.email || '',
        birth_date: patient.birth_date || '', gender: patient.gender || '', cpf: patient.cpf || '',
        address: patient.address || '', origin: patient.origin || '', protocol: patient.protocol || '',
        notes: patient.notes || '', next_return_date: patient.next_return_date || '', scheduled_returns: patient.scheduled_returns || []
      });
    } else {
      setFormData({ full_name: '', phone: '', email: '', birth_date: '', gender: '', cpf: '', address: '', origin: '', protocol: '', notes: '', next_return_date: '', scheduled_returns: [] });
    }
  }, [patient, open]);

  const addScheduledReturn = () => {
    if (!newReturn.date) return;
    setFormData({ ...formData, scheduled_returns: [...formData.scheduled_returns, { ...newReturn }] });
    setNewReturn({ date: '', description: '' });
  };

  const removeScheduledReturn = (index) => {
    setFormData({ ...formData, scheduled_returns: formData.scheduled_returns.filter((_, i) => i !== index) });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nome Completo *</Label>
              <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
            </div>
            <div>
              <Label>Gênero *</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} />
            </div>
            <div>
              <Label>Como chegou à clínica *</Label>
              <Select value={formData.origin} onValueChange={(v) => setFormData({ ...formData, origin: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Protocolo Completo</Label>
              <Textarea value={formData.protocol} onChange={(e) => setFormData({ ...formData, protocol: e.target.value })} rows={4} placeholder="Descreva o protocolo..." />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Data do Próximo Retorno Principal</Label>
              <Input type="date" value={formData.next_return_date} onChange={(e) => setFormData({ ...formData, next_return_date: e.target.value })} />
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl space-y-4">
            <Label className="block">Retornos Programados Adicionais</Label>
            <div className="flex gap-2">
              <Input type="date" value={newReturn.date} onChange={(e) => setNewReturn({ ...newReturn, date: e.target.value })} className="flex-1" />
              <Input placeholder="Descrição" value={newReturn.description} onChange={(e) => setNewReturn({ ...newReturn, description: e.target.value })} className="flex-1" />
              <Button type="button" onClick={addScheduledReturn} variant="outline"><Plus className="w-4 h-4" /></Button>
            </div>
            {formData.scheduled_returns.map((ret, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-white border rounded">
                <Calendar className="w-4 h-4 text-stone-400" />
                <span className="text-sm">{format(new Date(ret.date), 'dd/MM/yyyy')} - {ret.description}</span>
                <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => removeScheduledReturn(i)}><X className="w-4 h-4 text-rose-500" /></Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-stone-800 hover:bg-stone-900">{isLoading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}