import React, { useState } from 'react';
import { supabase } from '@/supabase.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Syringe, Package } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Settings() {
  const [procedureModal, setProcedureModal] = useState(false);
  const [materialModal, setMaterialModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [deleteProcedure, setDeleteProcedure] = useState(null);
  const [deleteMaterial, setDeleteMaterial] = useState(null);
  const queryClient = useQueryClient();

  // --- QUERY PROCEDIMENTOS ---
  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: async () => {
      const { data } = await supabase.from('procedures').select('*').order('name');
      return data || [];
    },
  });

  // --- QUERY MATERIAIS ---
  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data } = await supabase.from('materials').select('*').order('name');
      return data || [];
    },
  });

  // --- MUTAÇÕES PROCEDIMENTOS ---
  const createProcedureMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('procedures').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      setProcedureModal(false);
      toast.success('Procedimento cadastrado');
    },
  });

  const updateProcedureMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('procedures').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      setEditingProcedure(null);
      toast.success('Procedimento atualizado');
    },
  });

  const deleteProcedureMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('procedures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      setDeleteProcedure(null);
      toast.success('Procedimento excluído');
    },
  });

  // --- MUTAÇÕES MATERIAIS ---
  const createMaterialMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('materials').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setMaterialModal(false);
      toast.success('Material cadastrado');
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('materials').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setEditingMaterial(null);
      toast.success('Material atualizado');
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setDeleteMaterial(null);
      toast.success('Material excluído');
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6 overflow-hidden">
      <PageHeader title="Cadastros" subtitle="Procedimentos e materiais" />

      <Tabs defaultValue="procedures">
        <TabsList className="bg-stone-100 w-full sm:w-auto">
          <TabsTrigger value="procedures" className="flex-1 sm:flex-none text-xs sm:text-sm">Procedimentos</TabsTrigger>
          <TabsTrigger value="materials" className="flex-1 sm:flex-none text-xs sm:text-sm">Materiais</TabsTrigger>
        </TabsList>

        <TabsContent value="procedures" className="mt-3 sm:mt-6">
          <div className="flex justify-end mb-2 sm:mb-4">
            <Button onClick={() => setProcedureModal(true)} className="bg-stone-800 hover:bg-stone-900 h-8 text-xs sm:text-sm px-3">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Procedimento</span>
            </Button>
          </div>
          <div className="grid gap-1.5 sm:gap-3">
            {procedures.map((proc) => (
              <Card key={proc.id} className="bg-white border-stone-100">
                <CardContent className="p-2.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                      <div className="p-1.5 sm:p-2 bg-stone-100 rounded-lg flex-shrink-0">
                        <Syringe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h3 className="font-medium text-stone-800 text-xs sm:text-sm truncate">{proc.name}</h3>
                        <p className="text-[10px] sm:text-xs text-stone-400">
                          R$ {(proc.default_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => setEditingProcedure(proc)}><Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setDeleteProcedure(proc)}><Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="materials" className="mt-3 sm:mt-6">
          <div className="flex justify-end mb-2 sm:mb-4">
            <Button onClick={() => setMaterialModal(true)} className="bg-stone-800 hover:bg-stone-900 h-8 text-xs sm:text-sm px-3">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Material</span>
            </Button>
          </div>
          <div className="grid gap-1.5 sm:gap-3">
            {materials.map((mat) => (
              <Card key={mat.id} className="bg-white border-stone-100">
                <CardContent className="p-2.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                      <div className="p-1.5 sm:p-2 bg-stone-100 rounded-lg flex-shrink-0">
                        <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h3 className="font-medium text-stone-800 text-xs sm:text-sm truncate">{mat.name}</h3>
                        <p className="text-[10px] sm:text-xs text-stone-400">{mat.stock_quantity || 0} {mat.unit || 'un'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => setEditingMaterial(mat)}><Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setDeleteMaterial(mat)}><Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals e Alerts omitidos para poupar espaço, mas funcionam com a lógica acima. Use o mesmo JSX do seu arquivo original para os Modals (ProcedureModal e MaterialModal), eles não mudam, só as funções onSave que já tratei acima */}
      
      <ProcedureModal open={procedureModal || !!editingProcedure} onClose={() => { setProcedureModal(false); setEditingProcedure(null); }} procedure={editingProcedure} onSave={(data) => { if (editingProcedure) { updateProcedureMutation.mutate({ id: editingProcedure.id, data }); } else { createProcedureMutation.mutate(data); } }} isLoading={createProcedureMutation.isPending || updateProcedureMutation.isPending} />
      <MaterialModal open={materialModal || !!editingMaterial} onClose={() => { setMaterialModal(false); setEditingMaterial(null); }} material={editingMaterial} onSave={(data) => { if (editingMaterial) { updateMaterialMutation.mutate({ id: editingMaterial.id, data }); } else { createMaterialMutation.mutate(data); } }} isLoading={createMaterialMutation.isPending || updateMaterialMutation.isPending} />
      
      <AlertDialog open={!!deleteProcedure} onOpenChange={() => setDeleteProcedure(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteProcedureMutation.mutate(deleteProcedure.id)} className="bg-rose-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!deleteMaterial} onOpenChange={() => setDeleteMaterial(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMaterialMutation.mutate(deleteMaterial.id)} className="bg-rose-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

// COPIE E COLE AQUI NO FINAL AS FUNÇÕES "ProcedureModal" e "MaterialModal" DO SEU ARQUIVO ORIGINAL (Elas não mudam)
function ProcedureModal({ open, onClose, procedure, onSave, isLoading }) {
  const [formData, setFormData] = useState({ name: '', description: '', default_price: '', duration_minutes: '' });
  React.useEffect(() => { if (procedure) { setFormData({ name: procedure.name || '', description: procedure.description || '', default_price: procedure.default_price || '', duration_minutes: procedure.duration_minutes || '' }); } else { setFormData({ name: '', description: '', default_price: '', duration_minutes: '' }); } }, [procedure, open]);
  const handleSubmit = (e) => { e.preventDefault(); onSave({ ...formData, default_price: parseFloat(formData.default_price) || 0, duration_minutes: parseInt(formData.duration_minutes) || null, is_active: true }); };
  return ( <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{procedure ? 'Editar' : 'Novo'}</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div><Label>Nome</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div><div><Label>Preço</Label><Input type="number" value={formData.default_price} onChange={(e) => setFormData({ ...formData, default_price: e.target.value })} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={isLoading}>Salvar</Button></div></form></DialogContent></Dialog> );
}
function MaterialModal({ open, onClose, material, onSave, isLoading }) {
  const [formData, setFormData] = useState({ name: '', unit: '', cost_per_unit: '', stock_quantity: '' });
  React.useEffect(() => { if (material) { setFormData({ name: material.name || '', unit: material.unit || '', cost_per_unit: material.cost_per_unit || '', stock_quantity: material.stock_quantity || '' }); } else { setFormData({ name: '', unit: 'un', cost_per_unit: '', stock_quantity: '' }); } }, [material, open]);
  const handleSubmit = (e) => { e.preventDefault(); onSave({ ...formData, cost_per_unit: parseFloat(formData.cost_per_unit) || 0, stock_quantity: parseFloat(formData.stock_quantity) || 0 }); };
  return ( <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{material ? 'Editar' : 'Novo'}</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div><Label>Nome</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div><div><Label>Custo/Un</Label><Input type="number" value={formData.cost_per_unit} onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={isLoading}>Salvar</Button></div></form></DialogContent></Dialog> );
}